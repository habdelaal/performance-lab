import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt',origin=new URL(target).origin;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,rows:[],limits:['Diagnostic browser-only resource substitutions, not deployable candidates','Actual CDP network throttling and CPU slowdown; numbers are not PSI simulated scores','All collection intercepted; no vendor receipt acceptance','Meta and Clarity scripts stubbed; no acceptance of their runtime','No form submission, Odoo configuration change or database write','Cookie bar disabled in current native policy; withdrawal event test is not cookie UI acceptance']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));
let chrome,browser;
async function setup(mode,throttled){
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
   if(!['GET','HEAD'].includes(req.method()))return req.respond({status:403,body:'R063 read-only probe'});
   if((mode==='without_initial'&&u.pathname.includes('eit_live_freight_theme_livechat.assets_initial')&&u.pathname.endsWith('.js'))||(mode==='without_service_css'&&u.pathname.includes('eit_live_freight_theme.assets_service_frontend')&&u.pathname.endsWith('.css'))){row.substitutions.push(u.pathname);return req.respond({status:200,contentType:req.resourceType()==='script'?'application/javascript':'text/css',body:'/* R063 diagnostic omission */'});}
   return req.continue();
  }
  if(u.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js'].includes(u.pathname)&&req.resourceType()==='script'){
   if(u.pathname==='/gtm.js')row.gtm++;
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
 for(let round=0;round<3;round++){
  const modes=['baseline','without_initial','without_service_css'];
  for(let n=0;n<3;n++){
   const mode=modes[(round+n)%3],{context,page,row}=await setup(mode,true);row.round=round+1;report.rows.push(row);
   const res=await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(res.status(),200);assert.equal(page.url(),target);
   await sleep(20000);
   row.metrics=await page.evaluate(()=>({...window.__r063,ready:document.readyState,resources:performance.getEntriesByType('resource').map(e=>({name:e.name.split('?')[0],start:e.startTime,end:e.responseEnd,bytes:e.transferSize})),tracking:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),owner:window.lfThemeClickOwner}));
   assert.ok(row.metrics.fcp>0&&row.metrics.lcp>0);if(mode!=='baseline')assert.equal(row.substitutions.length,1);
   await page.screenshot({path:new URL(`${round+1}-${mode}.png`,out).pathname,fullPage:false});
   console.log('R063_CASE',JSON.stringify({round:row.round,mode,metrics:{fcp:row.metrics.fcp,lcp:row.metrics.lcp,cls:row.metrics.cls},errors:row.errors,tracking:row.metrics.tracking}));save();await context.close();
  }
 }
 const {context,page,row}=await setup('tracking',false);report.tracking=row;
 assert.equal((await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000})).status(),200);
 await page.waitForFunction(()=>window.lfThemeClickOwner==='lf-click-v1',{timeout:20000});
 await page.mouse.click(8,400); // Trusted interaction on empty margin; no form submission.
 await page.waitForFunction(()=>window.dataLayer?.some(x=>x.event==='gtm.load'),{timeout:20000});await sleep(3000);
 row.before=await page.evaluate(()=>({owner:window.lfThemeClickOwner,status:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),consent:JSON.parse(JSON.stringify(window.google_tag_data?.ics?.entries||{})),links:[...document.querySelectorAll('a[href*="/shipping-request"]')].map(e=>({href:e.getAttribute('href'),text:e.textContent.trim()}))}));
 assert.equal(row.gtm,1);assert.ok(row.policy.some(p=>p.enabled&&p.consent==='granted'));
 for(const key of ['ad_storage','analytics_storage','ad_user_data','ad_personalization'])assert.equal(row.before.consent[key]?.update,true);
 // Test native-page withdrawal handler without claiming cookie UI acceptance.
 await page.evaluate(()=>document.dispatchEvent(new CustomEvent('optionalCookiesDenied')));await sleep(1000);
 row.after=await page.evaluate(()=>({status:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),consent:JSON.parse(JSON.stringify(window.google_tag_data?.ics?.entries||{})),relay:window.LFThemeClickRelayV1?.status()}));
 for(const key of ['ad_storage','analytics_storage','ad_user_data','ad_personalization'])assert.equal(row.after.consent[key]?.update,false);
 assert.equal(row.after.relay.stopped,true);row.status='PASS_NATIVE_PAGE_STARTUP_AND_WITHDRAWAL';await context.close();
 const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];report.medians=Object.fromEntries(['baseline','without_initial','without_service_css'].map(mode=>[mode,Object.fromEntries(['fcp','lcp','cls'].map(k=>[k,median(report.rows.filter(r=>r.mode===mode).map(r=>r.metrics[k]))]))]));
 report.status='PASS_DIAGNOSTICS_NOT_DEPLOYMENT_ACCEPTANCE';
}catch(e){report.status='FAIL_OR_INCOMPLETE';report.error=String(e);process.exitCode=1;}finally{save();console.log('R063_SUMMARY',JSON.stringify({status:report.status,error:report.error,medians:report.medians,tracking:report.tracking}));await browser?.disconnect();await chrome?.kill();}
