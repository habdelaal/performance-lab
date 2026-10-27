import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const settings=JSON.parse(readFileSync(new URL('psi-settings.json',import.meta.url)));
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,runs:[],limits:['Diagnostic three runs/device, not five-run acceptance','PSI settings copied; runner hardware/network geography differ','Fresh Chrome profile per run; no product configuration writes','Normal public analytics requests allowed; no conversion interactions','Raw private trace and network artifacts retained seven days']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2));
async function snapshot(){
 const r=await fetch(target);assert.equal(r.status,200);assert.equal(r.headers.get('x-lf-critical-css'),'r069');const body=await r.text();
 const urls=[...new Set([...body.matchAll(/(?:src|href|data-css-url)="([^"#]+)"/g)].map(m=>m[1]).filter(u=>u.startsWith('/web/assets/')||/^\/web\/content\/\d+\/google-font-/.test(u)))].sort();
 assert.ok(urls.length>=10);return await Promise.all(urls.map(async url=>{const a=await fetch(new URL(url,target));assert.equal(a.status,200);const bytes=Buffer.from(await a.arrayBuffer());return {url,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};}));
}
assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
try{
 result.resourcesBefore=await snapshot();save();
 for(let round=1;round<=3;round++)for(const device of ['mobile','desktop']){
  let chrome;const prefix=`${device}-${round}`;
  try{
   chrome=await launch({chromePath:process.env.CHROME_PATH,chromeFlags:['--headless=new','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check']});
   const run=await lighthouse(target,{port:chrome.port,logLevel:'error',output:'json'}, {extends:'lighthouse:default',settings:settings[device]});
   assert.ok(run);const {lhr,artifacts}=run;
   writeFileSync(new URL(prefix+'.lhr.json',out),JSON.stringify(lhr));
   writeFileSync(new URL(prefix+'.trace.json.gz',out),gzipSync(JSON.stringify(artifacts.traces.defaultPass)));
   writeFileSync(new URL(prefix+'.devtoolslog.json.gz',out),gzipSync(JSON.stringify(artifacts.devtoolsLogs.defaultPass)));
   const docs=artifacts.devtoolsLogs.defaultPass.filter(e=>e.method==='Network.responseReceived'&&e.params.type==='Document'&&e.params.response.url===target);
   assert.equal(docs.length,1);const h=Object.fromEntries(Object.entries(docs[0].params.response.headers).map(([k,v])=>[k.toLowerCase(),v]));
   assert.equal(h['x-lf-critical-css'],'r069','Critical CSS absent in measured request');assert.equal(lhr.lighthouseVersion,'13.5.0');assert.ok(!lhr.runtimeError,JSON.stringify(lhr.runtimeError));
   const metrics=lhr.audits.metrics.details.items[0];
   const images=lhr.audits['network-requests'].details.items.filter(x=>/cargo-glass/.test(x.url)).map(x=>x.url);
   const row={device,round,score:lhr.categories.performance.score*100,fcp:metrics.firstContentfulPaint,lcp:metrics.largestContentfulPaint,observedFCP:metrics.observedFirstContentfulPaint,observedLCP:metrics.observedLargestContentfulPaint,tbt:lhr.audits['total-blocking-time'].numericValue,critical:h['x-lf-critical-css'],images,environment:lhr.environment,settings:lhr.configSettings,warnings:lhr.runWarnings};
   result.runs.push(row);save();console.log('R081_RUN',JSON.stringify(row));
  }finally{await chrome?.kill();}
 }
 result.resourcesAfter=await snapshot();assert.deepEqual(result.resourcesAfter,result.resourcesBefore,'Resource drift');
 result.status='CAPTURE_COMPLETE_NOT_ACCEPTANCE';
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}finally{save();console.log('R081_COMPLETE',result.status,result.error||'');}
