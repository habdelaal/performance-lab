import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const source=n=>readFileSync(new URL(n,import.meta.url),'utf8');
const relay=source('tracking_events.js'),bridge=source('tracking_bridge.js');
const candidate=source('../r053/vendor/tracking_candidate.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const config={enabled:true,websiteId:1,environment:'staging',gtm:'GTM-KR27QMCH',meta:'911231798442990',eventContract:'lf-click-v1',consentSource:'odoo_optional_cookie_decision',consent:'granted',fullShell:true,public:true,editable:false,conversion:false,legacyLoadersRemoved:true,publishedContainerReviewed:true,exclusions:{google:false,meta:false,clarity:false}};
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,sourceHashes:Object.fromEntries(Object.entries({relay,bridge,candidate}).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')])),cases:[],limits:['Isolated browser with mocked GTM consumer, not imported container acceptance','No real analytics requests, no Odoo activation','At-most-once dataLayer dispatch, not server receipt guarantee','Cross-tab/new-window delivery not accepted']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));
let chrome,browser;
async function run(name,exercise){
 const context=await browser.createBrowserContext();const page=await context.newPage();let policy={...config},failPolicy=false;
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setRequestInterception(true);
 page.on('request',req=>{void(async()=>{
  const u=new URL(req.url());
  if(u.pathname==='/lf-theme/tracking-policy'){await req.respond({status:failPolicy?503:200,contentType:'application/json',body:JSON.stringify(policy)});return;}
  if(req.isNavigationRequest()){
   const dest=u.pathname==='/shipping-request';
   const init=dest?`window.LFThemeClickRelayV1.receive(${JSON.stringify(config)});`:`window.initialPolicy=${JSON.stringify(config)};`;
   const html=`<!doctype html><title>R056 fixture</title><a id="quote" href="/shipping-request">Quote</a><button id="search">Search Freight</button><button id="view">View Route</button><button id="booking">Request Booking</button><input value="private-test-value"><script>window.dataLayer=[];window.received=[];</script><script>${relay}</script><script>${init}</script>`;
   await req.respond({status:200,contentType:'text/html',body:html});return;
  }
  await req.respond({status:204,body:''});
 })().catch(e=>{errors.push(String(e));req.abort().catch(()=>{});});});
 const t={page,setPolicy:p=>{policy=p;},failPolicy:v=>{failPolicy=v;},attach:()=>page.evaluate(c=>{window.currentPolicy=c;return LFThemeClickRelayV1.attach(c,()=>window.currentPolicy);},config),receive:()=>page.evaluate(c=>LFThemeClickRelayV1.receive(c),config),events:()=>page.evaluate(()=>dataLayer.filter(e=>e.event==='lf_theme_click_v1')),status:()=>page.evaluate(()=>LFThemeClickRelayV1.status())};
 const row={name,status:'FAIL'};report.cases.push(row);
 try{await page.goto(target);await exercise(t);assert.deepEqual(errors,[]);row.status='PASS';row.state=await t.status();row.events=await t.events();console.log('R056_CASE '+JSON.stringify(row));}
 catch(e){row.error=String(e);row.errors=errors;throw e;}finally{save();await context.close();}
}
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 report.chrome=execFileSync(process.env.CHROME_PATH,['--version'],{encoding:'utf8'}).trim();assert.ok(report.chrome.includes('145.0.7632.117'));
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const session=await browser.target().createCDPSession();const {arguments:argv}=await session.send('Browser.getBrowserCommandLine');assert.ok(!argv.some(a=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(a)));report.sandbox_disabled=false;
 for(const [id,event] of [['search','freight_search'],['view','view_route'],['booking','request_booking']])await run('early_'+event,async t=>{assert.equal(await t.attach(),true);await t.page.click('#'+id);assert.equal((await t.events()).length,0);await t.receive();assert.deepEqual((await t.events()).map(e=>e.lf_event_name),[event]);await t.receive();assert.equal((await t.events()).length,1);});
 await run('quote_cross_document',async t=>{await t.attach();await Promise.all([t.page.waitForNavigation(),t.page.click('#quote')]);await t.page.waitForFunction(()=>dataLayer.some(e=>e.event==='lf_theme_click_v1'));const e=await t.events();assert.equal(e.length,1);assert.equal(e[0].lf_event_name,'quote_request');assert.equal(e[0].lf_source_location,target);await t.page.reload();await t.receive();assert.equal((await t.events()).length,0);});
 await run('repeated_clicks_distinct_ids',async t=>{await t.attach();await t.receive();await t.page.click('#search');await t.page.click('#search');const e=await t.events();assert.equal(e.length,2);assert.notEqual(e[0].lf_event_id,e[1].lf_event_id);});
 await run('synthetic_click_not_captured',async t=>{await t.attach();await t.page.evaluate(()=>document.querySelector('#search').click());await t.receive();assert.equal((await t.events()).length,0);});
 await run('withdraw_pending',async t=>{await t.attach();await t.page.click('#search');await t.page.evaluate(()=>document.dispatchEvent(new Event('optionalCookiesDenied')));await t.page.click('#view');await t.receive();assert.equal((await t.events()).length,0);assert.equal(await t.page.evaluate(()=>sessionStorage.length),0);});
 await run('policy_denial_at_destination',async t=>{await t.attach();await t.page.click('#search');t.setPolicy({...config,consent:'denied'});await t.receive();assert.equal((await t.events()).length,0);assert.equal((await t.status()).pending,0);});
 await run('policy_failure_then_valid_retry',async t=>{await t.attach();await t.page.click('#search');t.failPolicy(true);assert.equal(await t.receive(),false);assert.equal((await t.events()).length,0);t.failPolicy(false);await t.receive();assert.equal((await t.events()).length,1);});
 await run('wrong_website',async t=>{await t.attach();await t.page.click('#search');t.setPolicy({...config,websiteId:2});await t.receive();assert.equal((await t.events()).length,0);});
 await run('expired_queue',async t=>{await t.attach();await t.page.click('#search');await t.page.evaluate(()=>{const key=sessionStorage.key(0),s=JSON.parse(sessionStorage.getItem(key));s.pending[0].at-=300001;sessionStorage.setItem(key,JSON.stringify(s));});await t.receive();assert.equal((await t.events()).length,0);});
 await run('no_form_or_query_values',async t=>{await t.page.goto(target+'?email=private-query-value');await t.attach();await t.page.click('#search');const raw=await t.page.evaluate(()=>sessionStorage.getItem(sessionStorage.key(0)));assert.ok(!raw.includes('private-'));await t.receive();assert.equal((await t.events())[0].lf_source_location,target);});
 await run('storage_unavailable_no_ownership',async t=>{await t.page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new Error('disabled');};});assert.equal(await t.attach(),false);assert.equal(await t.page.evaluate(()=>window.lfThemeClickOwner),undefined);});
 await run('late_policy_after_withdrawal',async t=>{await t.attach();await t.page.click('#search');await t.page.evaluate(c=>{window.fetch=()=>new Promise(resolve=>window.resolvePolicy=()=>resolve({ok:true,json:async()=>c}));window.receiving=LFThemeClickRelayV1.receive(c);},config);await t.page.evaluate(()=>{document.dispatchEvent(new Event('optionalCookiesDenied'));window.resolvePolicy();});await t.page.evaluate(()=>window.receiving);assert.equal((await t.events()).length,0);});
 await run('denial_before_start_then_accept',async t=>{await t.attach();await t.page.click('#search');await t.page.evaluate(()=>{document.dispatchEvent(new Event('optionalCookiesDenied'));});await t.attach();await t.page.click('#view');await t.receive();assert.deepEqual((await t.events()).map(e=>e.lf_event_name),['view_route']);});
 await run('bridge_contract_admission',async t=>{await t.page.evaluate(({config,candidate,bridge})=>{const node=document.createElement('script');node.type='application/json';node.id='lf-theme-tracking-policy';node.textContent=JSON.stringify(config);document.head.appendChild(node);(0,eval)(candidate);(0,eval)(bridge);},{config,candidate,bridge});await t.page.waitForFunction(()=>window.lfThemeClickOwner==='lf-click-v1');await t.page.click('#view');await t.receive();assert.equal((await t.events()).length,1);});
 await run('locks_unavailable_no_ownership',async t=>{await t.page.evaluate(()=>Object.defineProperty(navigator,'locks',{value:undefined}));assert.equal(await t.attach(),false);assert.equal(await t.page.evaluate(()=>window.lfThemeClickOwner),undefined);});
 await run('shared_storage_unavailable_no_ownership',async t=>{await t.page.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('disabled');}}));assert.equal(await t.attach(),false);assert.equal(await t.page.evaluate(()=>window.lfThemeClickOwner),undefined);});
 await run('claim_write_failure_no_dispatch',async t=>{await t.attach();await t.page.click('#search');await t.page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.endsWith('.claims'))throw new Error('quota');return original.call(this,k,v);};});assert.equal(await t.receive(),false);assert.equal((await t.events()).length,0);assert.equal((await t.status()).pending,1);});
 await run('withdraw_while_waiting_for_shared_lock',async t=>{
  await t.attach();await t.page.click('#search');
  await t.page.evaluate(()=>{window.holding=navigator.locks.request('lf.theme.click.v1.1.GTM-KR27QMCH.claims',()=>new Promise(resolve=>{window.releaseClaimLock=resolve;}));});
  await t.page.waitForFunction(()=>typeof window.releaseClaimLock==='function');
  await t.page.evaluate(c=>{window.receiving=LFThemeClickRelayV1.receive(c);},config);
  await t.page.waitForFunction(()=>LFThemeClickRelayV1.status().receiverReady);
  await t.page.evaluate(()=>{document.dispatchEvent(new Event('optionalCookiesDenied'));window.releaseClaimLock();});
  await t.page.evaluate(()=>window.receiving);assert.equal((await t.events()).length,0);assert.equal((await t.status()).pending,0);
 });
 await run('new_window_cloned_queue_no_duplicate',async t=>{
  await t.attach();await t.page.click('#search');
  const before=await t.page.evaluate(()=>sessionStorage.getItem(sessionStorage.key(0)));
  const popupPromise=new Promise(resolve=>t.page.once('popup',resolve));
  await t.page.evaluate(()=>{const b=document.createElement('button');b.id='popup-test';b.textContent='Open test window';b.onclick=()=>window.open('about:blank','_blank');document.body.appendChild(b);});
  await t.page.click('#popup-test');const popup=await popupPromise;
  const clone=await popup.evaluate(()=>sessionStorage.getItem(sessionStorage.key(0)));
  assert.equal(clone,before,'Browser must actually clone sessionStorage for this regression');
  await popup.setRequestInterception(true);
  popup.on('request',req=>{void req.respond({status:200,contentType:'text/html',body:'<!doctype html><title>R058 cloned child</title>'}).catch(e=>errors.push(String(e)));});
  await popup.goto(target);
  await popup.evaluate(({relay,config})=>{window.dataLayer=[];window.fetch=async()=>({ok:true,json:async()=>config});(0,eval)(relay);}, {relay,config});
  const admitted=await Promise.all([t.receive(),popup.evaluate(c=>LFThemeClickRelayV1.receive(c),config)]);
  assert.deepEqual(admitted,[true,true],'Both source and child receivers must be admitted');
  const first=await t.events(),second=await popup.evaluate(()=>dataLayer.filter(e=>e.event==='lf_theme_click_v1'));
  report.crossTab={source:first,child:second,clonedStorage:true};
  assert.equal(first.length+second.length,1,'One user click must dispatch once across source and cloned child');
  await popup.close();
 });
 report.status='PASS_ISOLATED_RELAY_NOT_GTM_OR_ODOO_ACCEPTANCE';
}catch(e){report.status='FAIL_ISOLATED_RELAY';report.error=String(e);process.exitCode=1;}
finally{save();console.log('R056_SUMMARY '+JSON.stringify(report));if(browser)await browser.disconnect();if(chrome)await chrome.kill();}
