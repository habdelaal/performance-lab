import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';

const require = createRequire(new URL('../r052/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const {launch} = await import('../r052/node_modules/chrome-launcher/dist/index.js');
const source = name => readFileSync(new URL(`vendor/${name}.js`, import.meta.url), 'utf8');
const candidate = source('tracking_candidate'), bridge = source('tracking_bridge');
const provenance = JSON.parse(readFileSync(new URL('provenance.json', import.meta.url)));
for (const [name, code] of Object.entries({tracking_candidate:candidate, tracking_bridge:bridge})) {
  assert.equal(createHash('sha256').update(code).digest('hex'), provenance.files[name]);
}
const out = new URL('reports/', import.meta.url); mkdirSync(out, {recursive:true});
const report = {status:'RUNNING', scope:'browser_fixture_with_stubbed_vendors',
  source:provenance, sha:process.env.GITHUB_SHA, cases:[],
  limits:['No Staging writes or activation', 'No live vendor code/events/conversions',
    'No durable Odoo assets acceptance', 'No performance or physical Safari acceptance']};
const save = () => writeFileSync(new URL('result.json',out), JSON.stringify(report,null,2));
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
const base = {enabled:true, websiteId:1, environment:'staging', gtm:'GTM-R053TEST', meta:'1234567890',
  consentSource:'odoo_optional_cookie_decision', consent:'granted', fullShell:true,
  public:true, editable:false, conversion:false, legacyLoadersRemoved:true,
  publishedContainerReviewed:true, exclusions:{google:false,meta:false,clarity:false}};
let scenario, browser, chrome;
const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/lf-theme/tracking-policy') {
    const body=JSON.stringify(scenario.policy); const status=scenario.httpStatus || 200;
    scenario.policyCalls++;
    setTimeout(()=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(body);},scenario.policyDelay || 0);
  } else if(req.url==='/') {
    res.setHeader('Content-Type','text/html');
    const config=scenario.off?'':`<script type="application/json" id="lf-theme-tracking-policy">${JSON.stringify(base)}</script>`;
    res.end(`<!doctype html><title>R053 isolated fixture</title><button>Interact</button>${config}
      <script>window.stubCalls=[];window.stopEvents=[];
      document.addEventListener('lf-theme-tracking-stopped',e=>stopEvents.push(e.detail));
      ${scenario.existing?'window.google_tag_manager={fixture:true};':''}
      window.dataLayer=[{event:'fixture_context'}];</script>
      <script>${candidate}</script><script>${bridge}</script>`);
  } else {res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
async function run(name, options, exercise) {
  scenario={policy:structuredClone(base),policyCalls:0,...options};
  const context=await browser.createBrowserContext(); const page=await context.newPage();
  const requests=[], errors=[], unexpected=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on('request',req=>{
    const u=new URL(req.url());
    if(u.origin===origin) return void req.continue();
    const provider=u.hostname==='www.googletagmanager.com' && u.pathname==='/gtm.js'?'google':
      u.hostname==='connect.facebook.net' && u.pathname==='/en_US/fbevents.js'?'meta':null;
    if(!provider) {unexpected.push(req.url());return void req.abort();}
    requests.push({provider,url:req.url(),time:Date.now()});
    if(scenario.vendorFail) return void req.abort();
    const body=provider==='google'?`window.google_tag_manager={fixture:true};
      window.clarity=(...a)=>window.stubCalls.push(['clarity',...a]);`:
      `window.stubCalls.push(...window.fbq.queue.map(a=>['meta',...a]));
      window.fbq.queue=[];window.fbq.callMethod=function(...a){window.stubCalls.push(['meta',...a]);};`;
    void req.respond({status:200,contentType:'application/javascript',body});
  });
  const status=()=>page.evaluate(()=>window[Symbol.for('lf.theme.tracking.bridge')]?.status());
  const event=name=>page.evaluate(n=>document.dispatchEvent(new Event(n)),name);
  const admitted=()=>page.waitForFunction(()=>window.dataLayer?.some(x=>x.event==='lf_theme_tracking_consent'&&x.lf_optional_storage==='granted'));
  const loaded=()=>page.waitForFunction(()=>{
    const s=window[Symbol.for('lf.theme.tracking.bridge')]?.status();
    return s?.google==='script_loaded'&&s?.meta==='script_loaded';
  },{timeout:5000});
  const zero=()=>assert.equal(requests.length,0);
  const once=()=>assert.deepEqual(requests.map(r=>r.provider).sort(),['google','meta']);
  const row={name,status:'FAIL',requests}; report.cases.push(row);
  try {
    await page.goto(origin,{waitUntil:'load'});
    await exercise({page,status,event,admitted,loaded,zero,once,requests});
    assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
    row.policy_requests=scenario.policyCalls;
    row.final_state=await status();row.calls=await page.evaluate(()=>stubCalls);
    row.status='PASS'; console.log(`R053_CASE ${name} PASS`);
  } catch(error) {row.error=String(error);row.page_errors=errors;row.unexpected_requests=unexpected;throw error;}
  finally {await context.close();save();}
}
try {
  assert.ok(process.env.CHROME_PATH,'CHROME_PATH required');
  report.chrome=execFileSync(process.env.CHROME_PATH,['--version'],{encoding:'utf8'}).trim();
  assert.ok(report.chrome.includes('145.0.7632.117'));
  chrome=await launch({chromePath:process.env.CHROME_PATH,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation']});
  browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
  const session=await browser.target().createCDPSession();
  const {arguments:args}=await session.send('Browser.getBrowserCommandLine');
  assert.ok(!args.some(a=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(a)));
  report.sandbox_disabled=false;report.chrome_arguments=args;

  await run('denied_startup',{policy:{...base,consent:'denied'}},async t=>{await delay(1800);t.zero();assert.equal((await t.status()).started,false);});
  await run('accepted_timer_once',{},async t=>{
    await t.admitted();await delay(300);t.zero();await t.loaded();t.once();
    const nav=await t.page.evaluate(()=>performance.timeOrigin+performance.getEntriesByType('navigation')[0].loadEventEnd);
    assert.ok(Math.min(...t.requests.map(r=>r.time))-nav>=1400,'Loaded too early');
    await t.event('optionalCookiesAccepted');await t.page.keyboard.press('A');await delay(1800);t.once();
    const calls=await t.page.evaluate(()=>stubCalls);
    assert.equal(calls.filter(x=>x[0]==='meta'&&x[1]==='track'&&x[2]==='PageView').length,1);
    assert.equal(await t.page.evaluate(()=>dataLayer[0].event),'fixture_context');
  });
  await run('accepted_interaction_once',{},async t=>{await t.admitted();await t.page.click('button');await t.loaded();t.once();});
  await run('deny_then_accept',{policy:{...base,consent:'denied'}},async t=>{
    await delay(200);t.zero();scenario.policy={...base};await t.event('optionalCookiesAccepted');await t.admitted();
    await t.page.keyboard.press('A');await t.loaded();t.once();
  });
  await run('withdraw_before_start',{},async t=>{await t.admitted();await t.event('optionalCookiesDenied');await delay(1800);t.zero();});
  await run('withdraw_after_start',{},async t=>{
    await t.admitted();await t.page.click('button');await t.loaded();await t.event('optionalCookiesDenied');
    const s=await t.status();assert.equal(s.stopped,true);assert.equal(s.reloadRequired,true);
    const calls=await t.page.evaluate(()=>stubCalls);
    assert.ok(calls.some(x=>x[0]==='meta'&&x[1]==='consent'&&x[2]==='revoke'));
    assert.ok(calls.some(x=>x[0]==='clarity'&&x[1]==='consentv2'&&x[2].analytics_Storage==='denied'));
    assert.equal(await t.page.evaluate(()=>stopEvents.at(-1).reloadRequired),true);
    await t.event('optionalCookiesAccepted');await delay(1800);t.once();
  });
  for(const [name,options] of [
    ['policy_http_failure',{httpStatus:503}],
    ['policy_identity_mismatch',{policy:{...base,websiteId:2}}],
    ['existing_loader',{existing:true}],
    ['excluded_context',{policy:{...base,conversion:true}}],
    ['off_context',{off:true}],
  ]) await run(name,options,async t=>{await delay(1800);t.zero();});
  await run('stale_response_after_denial',{policyDelay:600},async t=>{
    await t.page.waitForFunction(()=>!!window[Symbol.for('lf.theme.tracking.bridge')]);
    await t.event('optionalCookiesDenied');await delay(2200);t.zero();
  });
  await run('provider_exclusion',{policy:{...base,exclusions:{google:true,meta:false,clarity:false}}},async t=>{
    await t.admitted();await t.page.click('button');await delay(500);
    assert.deepEqual(t.requests.map(r=>r.provider),['meta']);assert.equal((await t.status()).google,'excluded');
  });
  await run('vendor_failure_no_retry',{vendorFail:true},async t=>{
    await t.admitted();await t.page.click('button');
    await t.page.waitForFunction(()=>window[Symbol.for('lf.theme.tracking.bridge')].status().meta==='failed');
    await t.event('optionalCookiesAccepted');await delay(1800);t.once();
  });
  report.status='PASS_BROWSER_FIXTURE_NOT_VENDOR_ACCEPTANCE';
} catch(error) {report.status='FAIL_BROWSER_FIXTURE';report.error=String(error);process.exitCode=1;}
finally {
  save();console.log(JSON.stringify({status:report.status,cases:report.cases.length,error:report.error}));
  if(browser) await browser.disconnect();if(chrome) await chrome.kill();server.close();
}
