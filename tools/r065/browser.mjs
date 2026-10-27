import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt',origin=new URL(target).origin;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,rows:[],limits:['Native HTTP page and bundle without code or policy overrides','First GTM request aborted only in early case to exercise pending transfer across native navigation; subsequent GTM loads are real','All collection intercepted; no vendor receipt acceptance','Meta and Clarity scripts stubbed; no acceptance of their runtime','No form submission, Odoo configuration change or database write','Cookie bar disabled in current native policy; withdrawal event test is not cookie UI acceptance']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));
let chrome,browser;
async function setup(mode,throttled,skipFirstGtm=false){
 const context=await browser.createBrowserContext(),page=await context.newPage(),row={mode,errors:[],substitutions:[],gtm:0,events:[],policy:[]};
 await page.setViewport({width:412,height:823,deviceScaleFactor:1.75,isMobile:true,hasTouch:true});
 const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 if(throttled){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1638.4*1024/8,uploadThroughput:675*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
 await page.evaluateOnNewDocument(()=>{window.__r063={fcp:null,lcp:null,cls:0};new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__r063.fcp=e.startTime;}).observe({type:'paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__r063.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__r063.cls+=e.value;}).observe({type:'layout-shift',buffered:true});});
 page.on('pageerror',e=>row.errors.push(String(e)));
 page.on('response',res=>{if(res.url().endsWith('/lf-theme/tracking-policy'))void res.json().then(p=>row.policy.push(p)).catch(()=>{});});
 await page.setRequestInterception(true);
 page.on('request',req=>void(async()=>{
  const u=new URL(req.url());
  if(u.origin===origin){
   if(!['GET','HEAD'].includes(req.method()))return req.respond({status:403,body:'R065 read-only probe'});
   if((mode==='without_initial'&&u.pathname.includes('eit_live_freight_theme_livechat.assets_initial')&&u.pathname.endsWith('.js'))||(mode==='without_service_css'&&u.pathname.includes('eit_live_freight_theme.assets_service_frontend')&&u.pathname.endsWith('.css'))){row.substitutions.push(u.pathname);return req.respond({status:200,contentType:req.resourceType()==='script'?'application/javascript':'text/css',body:'/* R065 diagnostic omission */'});}
   return req.continue();
  }
  if(u.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js'].includes(u.pathname)&&req.resourceType()==='script'){
   if(u.pathname==='/gtm.js'){row.gtm++;if(skipFirstGtm&&row.gtm===1){row.firstGtmAborted=true;return req.abort();}}
   if(mode==='tracking')return req.continue();
  }
  if(u.pathname.endsWith('/collect')){for(const body of (req.postData()||'').split('\n')){const p=new URLSearchParams(u.search);for(const [k,v] of new URLSearchParams(body))p.set(k,v);if(p.get('en'))row.events.push({name:p.get('en'),gcs:p.get('gcs'),gcd:p.get('gcd')});}}
  return req.respond(req.resourceType()==='script'?{status:200,contentType:'application/javascript',body:'/* vendor isolated */'}:{status:204,body:''});
 })().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});}));
 return {context,page,row};
}
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await (await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));report.chrome=await browser.version();report.sandbox_disabled=false;
 const nativeHTML=await (await fetch(target)).text();
 const paths=[...nativeHTML.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.includes('/eit_live_freight_theme.tracking.min.js'));
 assert.equal(paths.length,1);
 const bundleURL=new URL(paths[0],target);assert.equal(bundleURL.origin,origin);
 const br=await fetch(bundleURL);assert.equal(br.status,200);const js=await br.text();new Script(js);
 report.bundle={url:bundleURL.href,bytes:Buffer.byteLength(js),sha256:createHash('sha256').update(js).digest('hex')};
 assert.equal(report.bundle.sha256,'a37c56a78397d556a5a34b1c4e6c4881a65028eb5c2420dec03d78de0cd9cf77');

 for(const early of [false,true]){
  const {context,page,row}=await setup('tracking',false,early);row.case=early?'quote_before_gtm_available':'quote_after_gtm_ready';report.rows.push(row);
  assert.equal((await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000})).status(),200);
  await page.waitForFunction(()=>window.lfThemeClickOwner==='lf-click-v1',{timeout:20000});
  if(!early){await page.waitForFunction(()=>window.LFThemeClickRelayV1?.status().receiverReady,{timeout:20000});await sleep(1000);}
  row.before=await page.evaluate(()=>({owner:window.lfThemeClickOwner,relay:window.LFThemeClickRelayV1?.status(),gtmLoaded:!!window.google_tag_manager?.['GTM-KR27QMCH']}));
  const links=await page.$$('a[href="/shipping-request"]');let link;
  for(const e of links){if(await e.boundingBox())link=e;}
  assert.ok(link,'Visible native quote link missing');
  await link.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(150);
  const [nav]=await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded',timeout:45000}),link.click()]);
  assert.equal(new URL(page.url()).pathname,'/shipping-request');assert.equal(nav.status(),200);
  await sleep(8000);
  row.after=await page.evaluate(()=>({path:location.pathname,relay:window.LFThemeClickRelayV1?.status(),dataLayerEvents:(window.dataLayer||[]).filter(e=>e.event==='lf_theme_click_v1').map(e=>({name:e.lf_event_name,id:e.lf_event_id}))}));
  row.quoteRequests=row.events.filter(e=>e.name==='quote_request').length;
  assert.equal(row.quoteRequests,1,'Exactly one quote_request across navigation');
  assert.equal(row.errors.length,0,'Native JS error');
  await page.reload({waitUntil:'domcontentloaded',timeout:45000});await sleep(5000);
  row.quoteRequestsAfterReload=row.events.filter(e=>e.name==='quote_request').length;
  assert.equal(row.quoteRequestsAfterReload,1,'No quote replay after reload');
  row.status='PASS_NATIVE_QUOTE_NAVIGATION';save();console.log('R065_CASE',JSON.stringify(row));await context.close();
 }
 report.status='PASS_NATIVE_QUOTE_NAVIGATION_AND_RELOAD';

}catch(e){report.status='FAIL_OR_INCOMPLETE';report.error=String(e);process.exitCode=1;}finally{save();console.log('R065_SUMMARY',JSON.stringify({status:report.status,error:report.error,medians:report.medians,rows:report.rows,bundle:report.bundle}));await browser?.disconnect();await chrome?.kill();}
