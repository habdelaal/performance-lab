import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, readFileSync, appendFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const target = 'https://livefreight-staging.odoo.com/cargo-insurance-egypt';
export const blocked = [
  '*://www.googletagmanager.com/*', '*://www.google-analytics.com/*',
  '*://region1.google-analytics.com/*', '*://analytics.google.com/*',
  '*://connect.facebook.net/*', '*://www.facebook.com/tr*',
  '*://*.clarity.ms/*',
];
const isTracker = url => blocked.some(pattern => new RegExp('^' + pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(url));
export function median(values) {
  if (!values.length || values.some(v => !Number.isFinite(v))) throw Error('Missing metric');
  const sorted = [...values].sort((a,b) => a-b);
  const m = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
}
export function inspect(lhr, mode) {
  if (lhr.runtimeError) throw Error(JSON.stringify(lhr.runtimeError));
  if (lhr.finalDisplayedUrl !== target) throw Error('Unexpected final URL');
  const requests = lhr.audits['network-requests'].details.items;
  const success = requests.filter(r => r.statusCode >= 200 && r.statusCode < 400);
  const document = success.find(r => r.url === target && r.resourceType === 'Document');
  if (!document || document.statusCode !== 200) throw Error('Missing HTTP 200 document');
  const assets = success.filter(r => r.url.startsWith(new URL(target).origin + '/web/assets/') && ['Script','Stylesheet'].includes(r.resourceType)).map(r=>r.url).sort();
  if (!assets.some(u=>u.includes('assets_service_frontend') && u.endsWith('.css')) || !assets.some(u=>u.includes('assets_initial') && u.endsWith('.js'))) throw Error('Expected R051 assets absent');
  const tracking = success.filter(r=>isTracker(r.url));
  if (mode === 'baseline' && !tracking.some(r=>r.url.includes('googletagmanager.com/gtm.js'))) throw Error('Baseline GTM absent; comparison invalid');
  if (mode === 'blocked' && tracking.length) throw Error('Tracker block incomplete');
  const value = id => {
    const n = lhr.audits[id]?.numericValue;
    if (!Number.isFinite(n)) throw Error('Missing ' + id);
    return n;
  };
  return {assets, metrics:{fcp_ms:value('first-contentful-paint'), lcp_ms:value('largest-contentful-paint'), tbt_ms:value('total-blocking-time'), cls:value('cumulative-layout-shift'), transfer_bytes:value('total-byte-weight')}, tracker_requests:tracking.length, warnings:lhr.runWarnings};
}

async function main() {
  const out = 'reports'; mkdirSync(out,{recursive:true});
  const save = (name,data)=>writeFileSync(`${out}/${name}`, JSON.stringify(data,null,2)+'\n');
  const rows=[];
  try {
    if (!['refs/heads/main'].includes(process.env.GITHUB_REF)) throw Error('Unapproved source branch');
    const chrome=process.env.CHROME_PATH;
    if (!chrome) throw Error('CHROME_PATH missing');
    const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    if(response.status!==200 || !response.headers.get('content-type')?.includes('text/html')) throw Error('Staging preflight returned redirect/error/non-HTML');
    await response.body.cancel();
    const version=execFileSync(chrome,['--version'],{encoding:'utf8'}).trim();
    if (!version.includes('145.0.7632.117')) throw Error('Unexpected Chrome version');
    const flags=['--headless=new','--disable-dev-shm-usage'];
    // Fail closed if Chrome cannot launch with its default sandbox enabled.
    const probe=execFileSync(chrome,[...flags,'--dump-dom','about:blank'],{encoding:'utf8',timeout:30000});
    if (!probe.includes('<html')) throw Error('Chrome sandbox preflight failed');
    save('environment.json',{target,version,node:process.version,sha:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,image:process.env.ImageVersion,flags,blocked,sandbox_disabled:false,started:new Date().toISOString()});
    const cli=fileURLToPath(new URL('./node_modules/lighthouse/cli/index.js',import.meta.url));
    let baselineAssets;
    for(let round=1;round<=5;round++) {
      // Alternating order reduces systematic warm-server/order bias.
      for(const mode of round%2 ? ['baseline','blocked'] : ['blocked','baseline']) {
        const prefix=`${out}/${round}-${mode}`;
        const config={extends:'lighthouse:default',settings:{onlyCategories:['performance'],formFactor:'mobile',throttlingMethod:'simulate',blockedUrlPatterns:mode==='blocked'?blocked:[]}};
        writeFileSync(`${out}/config.cjs`,'module.exports = '+JSON.stringify(config));
        console.log(`R052_RUN round=${round} mode=${mode}`);
        execFileSync(process.execPath,[cli,target,'--config-path='+`${out}/config.cjs`,'--chrome-flags='+flags.join(' '),'--output=json','--output=html','--output-path='+prefix],{stdio:'inherit',timeout:150000});
        const lhr=JSON.parse(readFileSync(`${prefix}.report.json`,'utf8'));
        const result=inspect(lhr,mode);
        const signature=createHash('sha256').update(JSON.stringify(result.assets)).digest('hex');
        baselineAssets ??= signature;
        if(signature!==baselineAssets) throw Error('First-party asset drift; discard comparison');
        rows.push({round,mode,fetchTime:lhr.fetchTime,...result}); save('runs.json',rows);
      }
    }
    const metrics=Object.keys(rows[0].metrics);
    const summaries=Object.fromEntries(['baseline','blocked'].map(mode=>[mode,Object.fromEntries(metrics.map(key=>{
      const values=rows.filter(r=>r.mode===mode).map(r=>r.metrics[key]);
      return [key,{median:median(values),min:Math.min(...values),max:Math.max(...values)}];
    }))]));
    const deltas=Object.fromEntries(metrics.map(key=>[key,median(rows.filter(r=>r.mode==='baseline').map(a=>a.metrics[key]-rows.find(b=>b.round===a.round&&b.mode==='blocked').metrics[key]))]));
    save('summary.json',{status:'MEASURED_NOT_RELEASE_APPROVAL',target,summaries,paired_baseline_minus_blocked: deltas,limits:['Lab mobile simulation, not physical device or field CWV','All known trackers blocked together; not a production deferral candidate','No form/chat/conversion journey acceptance','Server content/config changes during run require review','Unknown AWS events endpoint not blocked: ownership unresolved']});
    const md=['# R052 tracking comparison','', '| Metric | Baseline median | Blocked median | Median paired reduction |','|---|---:|---:|---:|',...metrics.map(k=>`| ${k} | ${summaries.baseline[k].median.toFixed(2)} | ${summaries.blocked[k].median.toFixed(2)} | ${deltas[k].toFixed(2)} |`),'','Lab evidence only. Inspect warnings, variation and raw reports before a causal conclusion.'].join('\n');
    writeFileSync(`${out}/summary.md`,md);
    if(process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,md);
  } catch(error) {
    save('failure.json',{status:'BLOCKED_OR_INVALID',message:error.message,completed:rows.length});
    throw error;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
