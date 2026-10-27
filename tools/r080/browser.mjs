import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,started:new Date().toISOString(),visits:[],limits:['Diagnostic browser visits, not Lighthouse or performance acceptance','No configuration, form submission, login, deployment or restart','Normal public page JavaScript and vendor requests allowed; no conversion actions','No cookies or authorization headers recorded','Actual CDP throttling: mobile 4x CPU /150ms/1638.4kbps; desktop 1x/40ms/10240kbps; not Lighthouse simulation','Trace instrumentation adds overhead; timings are diagnostic only','Private artifacts include public-page HTML and vendor URLs, retained seven days']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2));
let browser,chrome;
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));
 result.chrome=await browser.version();
 for(const mode of ['mobile','desktop']){
  const ctx=await browser.createBrowserContext(),page=await ctx.newPage();
  const mobile=mode==='mobile';await page.setViewport({width:mobile?412:1440,height:900,isMobile:mobile,hasTouch:mobile});
  await page.setUserAgent(mobile?'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Chrome-Lighthouse');
  await page.setJavaScriptEnabled(mode!=='no_js_control');await page.setCacheEnabled(false);
  const cdp=await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:mobile?150:40,downloadThroughput:(mobile?1638.4:10240)*1024/8,uploadThroughput:750*1024/8});
  await page.evaluateOnNewDocument(()=>{
   window.__r080={paint:[],lcp:[],tasks:[],css:[],resources:[]};
   for(const type of ['paint','largest-contentful-paint','longtask'])new PerformanceObserver(list=>{
    for(const e of list.getEntries()){
     const row={name:e.name,start:e.startTime,duration:e.duration};
     if(type==='largest-contentful-paint'){row.element=e.element?.tagName;row.id=e.element?.id;row.url=e.url;window.__r080.lcp.push(row);}
     else window.__r080[type==='paint'?'paint':'tasks'].push(row);
    }
   }).observe({type,buffered:true});
   new MutationObserver(()=>{const state=document.documentElement?.dataset.lfCriticalState;if(state&&window.__r080.css.at(-1)?.state!==state){window.__r080.css.push({state,at:performance.now()});performance.mark('R080_CSS_'+state);}}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-lf-critical-state']});
  });
  let requests=[],errors=[];
  page.on('request',r=>{try{const u=new URL(r.url());requests.push({method:r.method(),origin:u.origin,path:u.pathname,type:r.resourceType()});}catch{}});
  page.on('pageerror',e=>errors.push(e.name+': '+e.message.slice(0,300)));
  for(let visit=1;visit<=3;visit++){
   requests=[];errors=[];
   const row={mode,visit,started:new Date().toISOString()};
   try{
    await page.tracing.start({screenshots:false,categories:['devtools.timeline','v8.execute','blink.user_timing','loading','disabled-by-default-devtools.timeline','disabled-by-default-devtools.timeline.stack','disabled-by-default-v8.cpu_profiler']});
    const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response.url(),target);
    const source=await response.text(),h=response.headers();
    const file=`${mode}-${visit}.html`;writeFileSync(new URL(file,out),source);
    Object.assign(row,{status:response.status(),diagnostic:h['x-lf-critical-diagnostic']||null,critical:h['x-lf-critical-css']||null,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),file});
    await new Promise(resolve=>setTimeout(resolve,15000));
    row.metrics=await page.evaluate(()=>({...window.__r080,resources:performance.getEntriesByType('resource').map(e=>({url:e.name,start:e.startTime,end:e.responseEnd,initiator:e.initiatorType,bytes:e.transferSize})),hero:(()=>{const e=document.querySelector('.hero-art');return e?{complete:e.complete,width:e.naturalWidth,currentSrc:e.currentSrc}:null;})()}));
    const trace=await page.tracing.stop();const traceFile=`${mode}-${visit}.trace.json.gz`;writeFileSync(new URL(traceFile,out),gzipSync(trace));row.trace=traceFile;
    assert.equal(row.status,200);assert.equal(row.critical,'r069','Critical CSS absent; capture not comparable');
    row.afterLoad={criticalStyles:await page.$$eval('#lf-critical-css', nodes=>nodes.length)};
   }catch(e){row.error=String(e);try{const trace=await page.tracing.stop();writeFileSync(new URL(`${mode}-${visit}.failed.trace.json.gz`,out),gzipSync(trace));}catch{}}
   row.requests=requests;row.pageErrors=errors;result.visits.push(row);save();console.log('R080_VISIT',JSON.stringify({mode,visit,status:row.status,critical:row.critical,error:row.error,trace:row.trace,paint:row.metrics?.paint,lcp:row.metrics?.lcp,css:row.metrics?.css,pageErrors:row.pageErrors}));
  }
  await ctx.close();
 }
 result.status=result.visits.some(x=>x.error)?'FAIL_OR_INCOMPLETE':'CAPTURE_COMPLETE_NOT_ACCEPTANCE';if(result.visits.some(x=>x.error))process.exitCode=1;
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}
finally{result.ended=new Date().toISOString();save();await browser?.disconnect();await chrome?.kill();console.log('R080_COMPLETE',result.status);}
