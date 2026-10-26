import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const hash=s=>createHash('sha256').update(s).digest('hex');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const gtmURL='https://www.googletagmanager.com/gtm.js?id=GTM-KR27QMCH';
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,cases:[],limits:['Synthetic HTML served inside browser at Staging URL; not actual page functionality','Published GTM script fetched once and pinned across cases; no GTM publication','All analytics collection intercepted locally, no vendor receipt acceptance','Clarity and Meta runtimes stubbed; only GTM auto-event listener timing tested','No Odoo activation, no form submission, no performance acceptance']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));
const provenance=JSON.parse(readFileSync(new URL('../r053/provenance.json',import.meta.url)));
const candidate=readFileSync(new URL('../r053/vendor/tracking_candidate.js',import.meta.url),'utf8');
assert.equal(hash(candidate),provenance.files.tracking_candidate);
const policy={websiteId:1,environment:'staging',gtm:'GTM-KR27QMCH',meta:'911231798442990',fullShell:true,public:true,editable:false,conversion:false,legacyLoadersRemoved:true,consent:'granted',publishedContainerReviewed:true,exclusions:{google:false,meta:false,clarity:false}};
let chrome,browser;
try {
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 const response=await fetch(gtmURL);assert.equal(response.status,200);const gtm=await response.text();assert.ok(gtm.length>10000);report.gtm_sha256=hash(gtm);report.gtm_bytes=Buffer.byteLength(gtm);
 report.chrome=execFileSync(process.env.CHROME_PATH,['--version'],{encoding:'utf8'}).trim();assert.ok(report.chrome.includes('145.0.7632.117'));
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const session=await browser.target().createCDPSession();const {arguments:argv}=await session.send('Browser.getBrowserCommandLine');assert.ok(!argv.some(a=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(a)));report.sandbox_disabled=false;
 for(const mode of ['baseline_ready','deferred_early','deferred_ready']) for(const [eventName,text,link] of [['quote_request','Get Quote',true],['freight_search','Search Freight',false],['view_route','View Route',false],['request_booking','Request Booking',false]]) {
  const context=await browser.createBrowserContext(),page=await context.newPage();
  const row={mode,eventName,requests:[],errors:[]};report.cases.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));
  const bootstrap=mode.startsWith('deferred')?`${candidate}\nwindow.controller=window[Symbol.for('lf.theme.tracking.candidate')].create(${JSON.stringify(policy)},()=>(${JSON.stringify(policy)}));controller.schedule();`:`window.dataLayer=[{'gtm.start':Date.now(),event:'gtm.js'}];var s=document.createElement('script');s.src=${JSON.stringify(gtmURL)};document.head.appendChild(s);`;
  const html=`<!doctype html><html><head><title>R055 listener timing fixture</title></head><body>${link?'<a id="action" href="#/shipping-request">'+text+'</a>':'<button id="action">'+text+'</button>'}<script>${bootstrap}</script></body></html>`;
  await page.setRequestInterception(true);
  page.on('request',req=>{void (async()=>{
   const u=new URL(req.url());
   if(req.isNavigationRequest()) {assert.equal(u.origin,new URL(target).origin);await req.respond({status:200,contentType:'text/html',body:html});return;}
   if(req.url()===gtmURL) {if(mode==='deferred_early')await delay(800);await req.respond({status:200,contentType:'application/javascript',body:gtm});return;}
   if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js'&&req.resourceType()==='script') {await req.continue();return;}
   row.requests.push({host:u.hostname,path:u.pathname,event:u.searchParams.get('en'),postEvents:(req.postData()||'').split('\n').map(x=>new URLSearchParams(x).get('en')).filter(Boolean)});
   await req.respond(req.resourceType()==='script'?{status:200,contentType:'application/javascript',body:'/* R055 vendor runtime excluded */'}:{status:204,body:''});
  })().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});});});
  await page.goto(target,{waitUntil:'domcontentloaded'});
  if(mode!=='deferred_early')await page.waitForFunction(()=>window.dataLayer?.some(e=>e.event==='gtm.load'),{timeout:15000});
  row.loadedBeforeClick=await page.evaluate(()=>!!window.google_tag_manager?.['GTM-KR27QMCH']);
  await page.click('#action');
  await page.waitForFunction(()=>window.dataLayer?.some(e=>e.event==='gtm.load'),{timeout:15000});await delay(1500);
  row.autoEvents=await page.evaluate(()=>window.dataLayer.filter(e=>e.event==='gtm.click'||e.event==='gtm.linkClick').map(e=>({event:e.event,text:e['gtm.element']?.textContent,url:e['gtm.elementUrl']})));
  row.matchingAutoEvents=row.autoEvents.filter(e=>e.event===(link?'gtm.linkClick':'gtm.click')).length;
  row.expectedCount=mode==='deferred_early'?0:1;
  assert.equal(row.loadedBeforeClick,mode!=='deferred_early');assert.equal(row.matchingAutoEvents,row.expectedCount);assert.deepEqual(row.errors,[]);
  row.status='OBSERVATION_CONFIRMED';console.log('R055_CASE '+JSON.stringify(row));save();await context.close();
 }
 report.status='CONFIRMED_EARLY_CLICK_LOSS_NOT_ACTIVATION_ACCEPTANCE';
} catch(e) {report.status='INCOMPLETE_DIAGNOSTIC';report.error=String(e);process.exitCode=1;}
finally {save();console.log('R055_SUMMARY '+JSON.stringify(report));if(browser)await browser.disconnect();if(chrome)await chrome.kill();}
