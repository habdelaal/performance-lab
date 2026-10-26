import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const sha=s=>createHash('sha256').update(s).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sources=Object.fromEntries(['tracking_events','tracking_bridge','tracking_candidate'].map(n=>[n,readFileSync(new URL(n+'.js',import.meta.url),'utf8')]));
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const gtmURL='https://www.googletagmanager.com/gtm.js?id=GTM-KR27QMCH';
const config={enabled:true,websiteId:1,environment:'staging',gtm:'GTM-KR27QMCH',meta:'911231798442990',eventContract:'lf-click-v1',consentSource:'odoo_optional_cookie_decision',consent:'granted',fullShell:true,public:true,editable:false,conversion:false,legacyLoadersRemoved:true,publishedContainerReviewed:true,exclusions:{google:false,meta:false,clarity:false}};
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,sourceHashes:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,sha(v)])),cases:[],limits:['Synthetic HTML and policy served inside isolated browser at Staging origin; no Odoo configuration writes','Published GTM runtime fetched once and pinned for this run; expected R060 markers required','Google tag runtime allowed; all collection intercepted, not vendor receipt acceptance','Meta and Clarity scripts stubbed; not their consent acceptance','Review flags and consent are explicit fixtures; not native cookie UI acceptance','Not performance or physical-device acceptance']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));
let chrome,browser;
try {
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 const res=await fetch(gtmURL);assert.equal(res.status,200);const gtm=await res.text();
 report.gtm_sha256=sha(gtm);report.gtm_bytes=Buffer.byteLength(gtm);
 assert.ok(gtm.includes('lf_theme_tracking_consent'),'Published consent adapter absent');
 assert.ok(gtm.includes('lf_theme_click_v1'),'Published relay absent');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cdp=await browser.target().createCDPSession();const {arguments:args}=await cdp.send('Browser.getBrowserCommandLine');
 assert.ok(!args.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));report.sandbox_disabled=false;report.chrome=await browser.version();
 for(const name of ['quote_request','freight_search','view_route','request_booking','denied_startup']) {
  const context=await browser.createBrowserContext(),page=await context.newPage();
  const row={name,events:[],errors:[],gtmRequests:0};report.cases.push(row);
  let policy={...config,consent:name==='denied_startup'?'denied':'granted'};
  let release;const gate=new Promise(r=>release=r);
  page.on('pageerror',e=>row.errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request',req=>void(async()=>{
   const u=new URL(req.url());
   if(u.origin===new URL(target).origin&&u.pathname==='/lf-theme/tracking-policy'){await req.respond({status:200,contentType:'application/json',body:JSON.stringify(policy)});return;}
   if(req.isNavigationRequest()){
    assert.equal(u.origin,new URL(target).origin);
    const html='<!doctype html><title>R061 isolated published GTM rehearsal</title><a id="quote_request" href="#/shipping-request">Quote</a><button id="freight_search">Search Freight</button><button id="view_route">View Route</button><button id="request_booking">Request Booking</button><script id="lf-theme-tracking-policy" type="application/json">'+JSON.stringify(policy)+'</script><script>'+sources.tracking_events+'</script><script>'+sources.tracking_candidate+'</script><script>'+sources.tracking_bridge+'</script>';
    await req.respond({status:200,contentType:'text/html',body:html});return;
   }
   if(req.url()===gtmURL){row.gtmRequests++;await gate;await req.respond({status:200,contentType:'application/javascript',body:gtm});return;}
   if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js'&&req.resourceType()==='script'){await req.continue();return;}
   if(u.pathname.endsWith('/collect')){
    const query=new URLSearchParams(u.search);const bodies=(req.postData()||'').split('\n');
    for(const body of bodies){const p=new URLSearchParams(query);for(const [k,v] of new URLSearchParams(body))p.set(k,v);if(p.get('en'))row.events.push({name:p.get('en'),id:p.get('ep.event_id'),gcs:p.get('gcs'),gcd:p.get('gcd')});}
   }
   await req.respond(req.resourceType()==='script'?{status:200,contentType:'application/javascript',body:'/* Vendor excluded in R061 */'}:{status:204,body:''});
  })().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});}));
  await page.goto(target,{waitUntil:'domcontentloaded'});
  if(name==='denied_startup'){
   await sleep(2200);assert.equal(row.gtmRequests,0);row.status='PASS';release();
  }else{
   await page.waitForFunction(()=>window.lfThemeClickOwner==='lf-click-v1');
   await page.click('#'+name);
   row.loadedBeforeRelease=await page.evaluate(()=>!!window.google_tag_manager?.['GTM-KR27QMCH']);assert.equal(row.loadedBeforeRelease,false);
   release();await page.waitForFunction(()=>window.dataLayer?.some(e=>e.event==='gtm.load'),{timeout:20000});
   await sleep(3500);
   row.granted=await page.evaluate(()=>({consent:JSON.parse(JSON.stringify(window.google_tag_data?.ics?.entries||{})),relay:window.LFThemeClickRelayV1.status(),events:window.dataLayer.filter(x=>x.event==='lf_theme_click_v1').map(x=>({name:x.lf_event_name,id:x.lf_event_id}))}));
   assert.equal(row.granted.events.filter(x=>x.name===name).length,1,'early click dispatch exactly once');
   assert.equal(row.events.filter(x=>x.name===name).length,1,'early GA request exactly once');
   for(const key of ['analytics_storage','ad_storage','ad_user_data','ad_personalization'])assert.equal(row.granted.consent[key]?.update,true,'grant '+key);
   policy={...policy,consent:'denied'};
   await page.evaluate(()=>document.dispatchEvent(new CustomEvent('optionalCookiesDenied')));await sleep(300);
   row.denied=await page.evaluate(()=>JSON.parse(JSON.stringify(window.google_tag_data?.ics?.entries||{})));
   for(const key of ['analytics_storage','ad_storage','ad_user_data','ad_personalization'])assert.equal(row.denied[key]?.update,false,'withdrawal '+key);
   await page.click('#'+name);await sleep(1800);
   assert.equal(row.events.filter(x=>x.name===name).length,1,'no extra click after withdrawal');assert.equal(row.gtmRequests,1);row.status='PASS';
  }
  assert.deepEqual(row.errors,[]);save();console.log('R061_CASE '+JSON.stringify(row));await context.close();
 }
 report.status='PASS_PUBLISHED_GTM_ISOLATED_REHEARSAL';
}catch(e){report.status='FAIL_OR_INCOMPLETE';report.error=String(e);process.exitCode=1;}
finally{save();console.log('R061_SUMMARY '+JSON.stringify(report));if(browser)await browser.disconnect();if(chrome)await chrome.kill();}
