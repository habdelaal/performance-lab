import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {measureSocket} from './socket.mjs';
const require=createRequire(new URL('../r052/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt',origin=new URL(target).origin;
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,native:[],limits:['Diagnosis only; no Odoo configuration changes, source merge or production writes','Off arm reverses exact R072 injection in a frozen HTML snapshot; no database flag changes','Initial bundle ablation includes shared Odoo infrastructure, not a pure chat switch','No tracking arm suppresses tracking bootstrap and vendor scripts; collections intercepted in every arm','Fixed 16-second observation after DOMContentLoaded; blocking metric is a long-task proxy, not Lighthouse TBT','No functional acceptance is claimed for ablated arms']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2));let browser,chrome;
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));
 // Native document receipt only: intercept non-document requests to avoid analytics and asset warming.
 for(let i=0;i<8;i++){
  const ctx=await browser.createBrowserContext(),page=await ctx.newPage();await page.setViewport({width:i%2?412:1440,height:900,isMobile:!!(i%2),hasTouch:!!(i%2)});
  await page.setRequestInterception(true);page.on('request',req=>{if(req.isNavigationRequest()&&req.url().startsWith(target)&&req.method()==='GET')return void req.continue();return void req.respond({status:204,body:''});});
  const url=i>=6?target+'?lf_r073_diagnostic=1':target;const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});const text=await response.text();
  const row={i,query:i>=6,status:response.status(),marker:response.headers()['x-lf-critical-css']||null,critical:(text.match(/id="lf-critical-css"/g)||[]).length,loader:(text.match(/data-lf-critical-loader="r069"/g)||[]).length};result.native.push(row);console.log('R073_NATIVE',JSON.stringify(row));save();await ctx.close();
 }
 assert.ok(result.native.slice(0,6).every(x=>x.status===200&&x.marker==='r069'&&x.critical===1&&x.loader===1),'Native receipt unstable; stop before comparison');
 assert.ok(result.native.slice(6).every(x=>x.status===200&&!x.marker&&!x.critical),'Query fallback unexpected');
 await browser.disconnect();await chrome.kill();browser=null;chrome=null;
 const response=await fetch(target);assert.equal(response.headers.get('x-lf-critical-css'),'r069');const candidateHTML=await response.text();
 const prep=JSON.parse(execFileSync('python3',[new URL('prepare.py',import.meta.url).pathname],{input:candidateHTML,maxBuffer:2000000}));result.pageDigest=prep.digest;
 for(const resource of prep.resources){const r=await fetch(new URL(resource.url,origin));assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha1').update(data).digest('hex'),resource.sha1,'Resource drift');}
 const cssURL=new URL(prep.cssURL,origin).href;const css=await(await fetch(cssURL)).text();
 result.performance=await measureSocket({html:prep.html,candidateHTML:prep.candidateHTML,css,cssURL,save:r=>{result.performance=r;save();}});
 result.status='DIAGNOSTIC_COMPLETE_NOT_PRODUCT_ACCEPTANCE';
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}finally{save();console.log('R073_SUMMARY',JSON.stringify({status:result.status,error:result.error,native:result.native,medians:result.performance?.medians}));await browser?.disconnect();await chrome?.kill();}
