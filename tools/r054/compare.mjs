import assert from 'node:assert/strict';
import os from 'node:os';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import lighthouse from '../r052/node_modules/lighthouse/core/index.js';
import {launch} from '../r052/node_modules/chrome-launcher/dist/index.js';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const origin=new URL(target).origin;
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const save=(name,data)=>writeFileSync(new URL(name,out),JSON.stringify(data,null,2));
const hash=x=>createHash('sha256').update(x).digest('hex');
const provenance=JSON.parse(readFileSync(new URL('../r053/provenance.json',import.meta.url)));
const source=name=>{
  const s=readFileSync(new URL(`../r053/vendor/${name}.js`,import.meta.url),'utf8');
  assert.equal(hash(s),provenance.files[name]);return s;
};
const candidate=source('tracking_candidate'),bridge=source('tracking_bridge');
const policy={enabled:true,websiteId:1,environment:'staging',gtm:'GTM-KR27QMCH',meta:'911231798442990',
  consentSource:'odoo_optional_cookie_decision',consent:'granted',fullShell:true,public:true,editable:false,
  conversion:false,legacyLoadersRemoved:true,publishedContainerReviewed:true,
  exclusions:{google:false,meta:false,clarity:false}};
const injected=`<script id="lf-theme-tracking-policy" type="application/json">${JSON.stringify(policy)}</script><script>${candidate}</script><script>${bridge}</script>`;
export function transform(html,mode) {
  assert.ok(!html.includes('id="lf-theme-tracking-policy"'),'Deferred tracking already active');
  let google=0,meta=0;
  const changed=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,block=>{
    if(block.includes('googletagmanager.com/gtm.js')&&block.includes('GTM-KR27QMCH')) {google++;return mode==='deferred'?injected:block;}
    if(block.includes('connect.facebook.net')&&block.includes('911231798442990')) {meta++;return mode==='deferred'?'':block;}
    return block;
  });
  assert.equal(google,1,'Expected exactly one legacy GTM bootstrap');
  assert.equal(meta,1,'Expected exactly one legacy Meta bootstrap');
  return changed;
}
const median=a=>{const b=[...a].sort((a,b)=>a-b);return b[Math.floor(b.length/2)];};
const hostSnapshot=()=>({cpuModels:[...new Set(os.cpus().map(c=>c.model))],cpuCount:os.cpus().length,totalMemory:os.totalmem(),freeMemory:os.freemem(),loadAverage:os.loadavg(),platform:os.platform(),release:os.release()});
const warmups=[];
const rows=[];let chrome,browser,assetSignature,contentSignature;
const limits=['Browser-only HTML/policy override, not deployed Odoo candidate',
  'Consent granted and review flag are experimental fixtures, not consent integration acceptance',
  'Live vendor scripts retained; no Clarity exclusion change',
  'Synthetic page visits may reach analytics; no form submission or conversion action',
  'Shared first-party assets and visible page structure checked; full journeys not tested',
  'Lab mobile simulation, not physical devices or field CWV'];
try {
  assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
  const version=execFileSync(process.env.CHROME_PATH,['--version'],{encoding:'utf8'}).trim();
  assert.ok(version.includes('145.0.7632.117'));
  const flags=['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check'];
  save('environment.json',{protocol:'R054-warmup-host-v2',host:hostSnapshot(),warmupPolicy:'One full navigation per mode excluded from summaries; fresh Chrome/profile for every navigation',target,version,node:process.version,sha:process.env.GITHUB_SHA,run_id:process.env.GITHUB_RUN_ID,source:provenance,flags,limits,started:new Date().toISOString()});
  for(let round=0;round<=5;round++) for(const mode of round===0||round%2?['baseline','deferred']:['deferred','baseline']) {
    const hostBefore=hostSnapshot();
    console.log(`R054_START round=${round} mode=${mode}`);
    chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:flags});
    browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
    const page=await browser.newPage();const session=await page.createCDPSession();
    const {arguments:argv}=await session.send('Browser.getBrowserCommandLine');
    assert.ok(!argv.some(a=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(a)));
    const documentResponses=[];
    await session.send('Network.enable');
    session.on('Network.responseReceived',ev=>{if(ev.type==='Document') documentResponses.push({url:ev.response.url,status:ev.response.status,timing:ev.response.timing,fromDiskCache:ev.response.fromDiskCache});});
    const errors=[],overrideErrors=[];let documents=0,policyRequests=0;
    page.on('pageerror',e=>errors.push(String(e)));
    await session.send('Fetch.enable',{patterns:[{urlPattern:target,resourceType:'Document',requestStage:'Response'},
      {urlPattern:origin+'/lf-theme/tracking-policy',requestStage:'Request'}]});
    session.on('Fetch.requestPaused',async ev=>{
      try {
        if(ev.request.url===origin+'/lf-theme/tracking-policy') {
          assert.equal(mode,'deferred');policyRequests++;
          await session.send('Fetch.fulfillRequest',{requestId:ev.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(JSON.stringify(policy)).toString('base64')});return;
        }
        assert.equal(ev.request.url,target);assert.equal(ev.responseStatusCode,200);
        const data=await session.send('Fetch.getResponseBody',{requestId:ev.requestId});
        const html=Buffer.from(data.body,data.base64Encoded?'base64':'utf8').toString('utf8');
        const body=transform(html,mode);documents++;
        const headers=ev.responseHeaders.filter(h=>!['content-length','content-encoding','transfer-encoding'].includes(h.name.toLowerCase()));
        await session.send('Fetch.fulfillRequest',{requestId:ev.requestId,responseCode:200,responseHeaders:headers,body:Buffer.from(body).toString('base64')});
      } catch(e) {overrideErrors.push(String(e));await session.send('Fetch.failRequest',{requestId:ev.requestId,errorReason:'Failed'}).catch(()=>{});}
    });
    const result=await lighthouse(target,{port:chrome.port,output:'json',logLevel:'error'},
      {extends:'lighthouse:default',settings:{onlyCategories:['performance'],formFactor:'mobile',throttlingMethod:'simulate',pauseAfterLoadMs:5000}},page);
    const lhr=result.lhr;save(`${round}-${mode}.lhr.json`,lhr);
    assert.deepEqual(overrideErrors,[]);assert.equal(documents,1);assert.ok(!lhr.runtimeError,JSON.stringify(lhr.runtimeError));assert.equal(lhr.finalDisplayedUrl,target);
    const all=lhr.audits['network-requests'].details.items;
    const success=all.filter(r=>r.statusCode>=200&&r.statusCode<400);
    const count=(host,path)=>success.filter(r=>{const u=new URL(r.url);return u.hostname===host&&u.pathname===path&&r.statusCode===200&&r.resourceSize>0&&/javascript/.test(r.mimeType||'');}).length;
    const vendors={gtm:count('www.googletagmanager.com','/gtm.js'),meta:count('connect.facebook.net','/en_US/fbevents.js'),clarity:success.filter(r=>/clarity\.ms\/tag\//.test(r.url)).length};
    assert.equal(vendors.gtm,1,'GTM must load once within measured navigation');assert.equal(vendors.meta,1,'Meta must load once within measured navigation');assert.ok(vendors.clarity>=1,'Clarity must not be silently excluded');
    const state=await page.evaluate(()=>({
      title:document.title,h1:[...document.querySelectorAll('h1')].map(x=>x.textContent),
      forms:[...document.forms].map(x=>({id:x.id,action:x.getAttribute('action')})),
      buttons:[...document.querySelectorAll('button,a')].map(x=>({text:x.textContent.trim(),href:x.getAttribute('href')})),
      images:[...document.images].map(x=>({src:x.getAttribute('src'),alt:x.alt})),
      status:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),
      gtmStarts:window.dataLayer?.filter(x=>x?.event==='gtm.js').length,
      scriptCounts:{gtm:[...document.scripts].filter(x=>x.src.includes('googletagmanager.com/gtm.js')&&!new URL(x.src).searchParams.has('is_td')).length,meta:[...document.scripts].filter(x=>x.src.includes('connect.facebook.net/en_US/fbevents.js')).length},
    }));
    assert.equal(state.scriptCounts.gtm,1);assert.equal(state.scriptCounts.meta,1);assert.equal(state.gtmStarts,1);
    if(mode==='deferred') {assert.equal(policyRequests,1);assert.equal(state.status.google,'script_loaded');assert.equal(state.status.meta,'script_loaded');}
    const assets=success.filter(r=>r.url.startsWith(origin+'/web/assets/')&&['Script','Stylesheet'].includes(r.resourceType)).map(r=>r.url).sort();
    assert.ok(assets.some(u=>u.includes('assets_service_frontend')&&u.endsWith('.css')));
    assert.ok(assets.some(u=>u.includes('assets_initial')&&u.endsWith('.js')));
    const sig=hash(JSON.stringify(assets));assetSignature??=sig;assert.equal(sig,assetSignature,'First-party assets drift');
    const content={title:state.title,h1:state.h1,forms:state.forms,buttons:state.buttons,images:state.images};
    const cs=hash(JSON.stringify(content));contentSignature??=cs;assert.equal(cs,contentSignature,'Rendered page structure drift');
    const value=id=>{const x=lhr.audits[id].numericValue;assert.ok(Number.isFinite(x));return x;};
    const metrics={score:lhr.categories.performance.score*100,fcp_ms:value('first-contentful-paint'),lcp_ms:value('largest-contentful-paint'),tbt_ms:value('total-blocking-time'),cls:value('cumulative-layout-shift'),transfer_bytes:value('total-byte-weight')};
    const gtmTelemetry=success.filter(r=>r.url.includes('googletagmanager.com/gtm.js')&&r.statusCode===204&&new URL(r.url).searchParams.get('is_td')==='1').map(r=>({status:r.statusCode,bytes:r.resourceSize}));
    const diagnostic={benchmarkIndex:lhr.environment.benchmarkIndex,hostBefore,hostAfter:hostSnapshot(),documentResponses,bootup_ms:value('bootup-time'),mainthread_ms:value('mainthread-work-breakdown')};
    (round===0?warmups:rows).push({diagnostic,round,mode,metrics,vendors,gtmTelemetry,errors,warnings:lhr.runWarnings,policyRequests,state,assetSignature:sig,contentSignature:cs,fetchTime:lhr.fetchTime});save('runs.json',rows);save('warmups.json',warmups);
    if(round===1) await page.screenshot({path:new URL(`${mode}.png`,out).pathname,fullPage:true});
    console.log(`R054_RESULT ${JSON.stringify({round,mode,benchmarkIndex:diagnostic.benchmarkIndex,metrics,vendors,errors,warnings:lhr.runWarnings})}`);
    await session.detach();await browser.disconnect();browser=null;await chrome.kill();chrome=null;
  }
  const keys=Object.keys(rows[0].metrics);
  const summaries=Object.fromEntries(['baseline','deferred'].map(mode=>[mode,Object.fromEntries(keys.map(k=>{const a=rows.filter(r=>r.mode===mode).map(r=>r.metrics[k]);return [k,{median:median(a),min:Math.min(...a),max:Math.max(...a)}];}))]));
  const paired=Object.fromEntries(keys.map(k=>[k,median(rows.filter(x=>x.mode==='baseline').map(a=>a.metrics[k]-rows.find(b=>b.round===a.round&&b.mode==='deferred').metrics[k]))]));
  const benchmarks=rows.map(r=>r.diagnostic.benchmarkIndex);
  const executionDiagnostics={benchmarkMin:Math.min(...benchmarks),benchmarkMax:Math.max(...benchmarks),benchmarkMedian:median(benchmarks),warmupCount:warmups.length,note:'No outlier filtering or score normalization; document timing after interception is diagnostic, not authoritative origin TTFB'};
  const summary={executionDiagnostics,status:'MEASURED_BROWSER_OVERRIDE_NOT_DEPLOYMENT_ACCEPTANCE',summaries,paired_baseline_minus_deferred:paired,limits};
  save('summary.json',summary);console.log('R054_SUMMARY '+JSON.stringify(summary));
} catch(e) {save('failure.json',{status:'BLOCKED_OR_INVALID',error:String(e),stack:e.stack,completed:rows.length});console.error(e);process.exitCode=1;}
finally {if(browser) await browser.disconnect();if(chrome) await chrome.kill();}
