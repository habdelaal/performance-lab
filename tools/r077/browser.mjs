import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../r052/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt';
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,started:new Date().toISOString(),visits:[],limits:['Diagnostic browser visits, not Lighthouse or performance acceptance','No configuration, form submission, login, deployment or restart','Normal public page JavaScript and vendor requests allowed; no conversion actions','No cookies or authorization headers recorded','Diagnostic event links to server PID only through server log']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2));
let browser,chrome;
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));
 result.chrome=await browser.version();
 for(const mode of ['mobile','desktop','no_js_control']){
  const ctx=await browser.createBrowserContext(),page=await ctx.newPage();
  const mobile=mode==='mobile';await page.setViewport({width:mobile?412:1440,height:900,isMobile:mobile,hasTouch:mobile});
  await page.setUserAgent(mobile?'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Chrome-Lighthouse');
  await page.setJavaScriptEnabled(mode!=='no_js_control');await page.setCacheEnabled(false);
  let requests=[],errors=[];
  page.on('request',r=>{try{const u=new URL(r.url());requests.push({method:r.method(),origin:u.origin,path:u.pathname,type:r.resourceType()});}catch{}});
  page.on('pageerror',e=>errors.push(e.name+': '+e.message.slice(0,300)));
  for(let visit=1;visit<=3;visit++){
   requests=[];errors=[];
   const row={mode,visit,started:new Date().toISOString()};
   try{
    const response=await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(response.url(),target);
    const source=await response.text(),h=response.headers();
    const file=`${mode}-${visit}.html`;writeFileSync(new URL(file,out),source);
    Object.assign(row,{status:response.status(),diagnostic:h['x-lf-critical-diagnostic']||null,critical:h['x-lf-critical-css']||null,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),file});
    await new Promise(resolve=>setTimeout(resolve,12000));
    row.afterLoad={criticalStyles:await page.$$eval('#lf-critical-css', nodes=>nodes.length)};
   }catch(e){row.error=String(e);}
   row.requests=requests;row.pageErrors=errors;result.visits.push(row);save();console.log('R077_VISIT',JSON.stringify({...row,requests:row.requests.length}));
  }
  await ctx.close();
 }
 result.status='CAPTURE_COMPLETE_NOT_ACCEPTANCE';
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}
finally{result.ended=new Date().toISOString();save();await browser?.disconnect();await chrome?.kill();console.log('R077_COMPLETE',result.status);}
