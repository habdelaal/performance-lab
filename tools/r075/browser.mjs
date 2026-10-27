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
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,native:[],limits:['Lab only; no source deployment, GTM changes or Odoo writes','Critical CSS/fonts/Clarity retained in every arm','Page CSS inline/preload experiments preserve all rules; upper-bound delivery diagnosis before subset extraction','Meta autoConfig=false is diagnostic only; automatic metadata/events may change and are not assumed unnecessary','Three repeats per arm per device; not PSI five-run acceptance','Vendor requests intercepted; recorded event attempts do not prove platform delivery','16-second long-task proxy is not Lighthouse TBT']};
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
  const url=i>=6?target+'?lf_r075_diagnostic=1':target;const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});const text=await response.text();
  const row={i,query:i>=6,status:response.status(),marker:response.headers()['x-lf-critical-css']||null,critical:(text.match(/id="lf-critical-css"/g)||[]).length,loader:(text.match(/data-lf-critical-loader="r069"/g)||[]).length};result.native.push(row);console.log('R075_NATIVE',JSON.stringify(row));save();await ctx.close();
 }
 assert.ok(result.native.slice(0,6).every(x=>x.status===200&&x.marker==='r069'&&x.critical===1&&x.loader===1),'Native receipt unstable; stop before comparison');
 assert.ok(result.native.slice(6).every(x=>x.status===200&&!x.marker&&!x.critical),'Query fallback unexpected');
 await browser.disconnect();await chrome.kill();browser=null;chrome=null;
 const response=await fetch(target);assert.equal(response.headers.get('x-lf-critical-css'),'r069');const candidateHTML=await response.text();
 const prep=JSON.parse(execFileSync('python3',[new URL('../r073/prepare.py',import.meta.url).pathname],{input:candidateHTML,maxBuffer:2000000}));result.pageDigest=prep.digest;
 for(const resource of prep.resources){const r=await fetch(new URL(resource.url,origin));assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha1').update(data).digest('hex'),resource.sha1,'Resource drift');}
 let inlineHTML=prep.candidateHTML;
 let preloadHTML=prep.candidateHTML;
 const pageResources=prep.resources.filter(x=>/\/(eit_live_freight_core_pages.cargo_assets|eit_freight_search_theme.assets)\.min\.css$/.test(x.url));
 assert.equal(pageResources.length,2);
 const pageEvidence=[],preloads=[];
 for(const resource of pageResources){
  const rr=await fetch(new URL(resource.url,origin));assert.equal(rr.status,200);const text=await rr.text();
  assert.equal(createHash('sha1').update(text).digest('hex'),resource.sha1);assert.ok(!/<\/style|@import/i.test(text));
  const matches=[...inlineHTML.matchAll(/<link\b[^>]*>/g)].filter(m=>m[0].includes('href="'+resource.url+'"'));
  assert.equal(matches.length,1);assert.ok(matches[0][0].includes('rel="stylesheet"'));
  // Rebase relative CSS resources without changing declarations or order.
  const rebased=text.replace(/url\((['"]?)([^'"\)]+)\1\)/g,(whole,q,u)=>{
   if(u.startsWith('/')||/^(data:|https?:|#)/.test(u))return whole;
   const resolved=new URL(u,new URL(resource.url,origin));assert.equal(resolved.origin,origin);return 'url("'+resolved.pathname+resolved.search+resolved.hash+'")';
  });
  inlineHTML=inlineHTML.replace(matches[0][0],'<style data-r075-page-css>'+rebased+'</style>');
  preloads.push('<link rel="preload" as="style" href="'+resource.url+'">');
  pageEvidence.push({url:resource.url,bytes:Buffer.byteLength(text),sha1:resource.sha1});
 }
 preloadHTML=preloadHTML.replace('<head>','<head>'+preloads.join(''));
 assert.notEqual(preloadHTML,prep.candidateHTML);result.pageEvidence=pageEvidence;
 const cssURL=new URL(prep.cssURL,origin).href;const css=await(await fetch(cssURL)).text();
 result.performance=await measureSocket({html:prep.html,candidateHTML:prep.candidateHTML,css,cssURL,inlineHTML,preloadHTML,save:r=>{result.performance=r;save();}});
 result.status='DIAGNOSTIC_COMPLETE_NOT_PRODUCT_ACCEPTANCE';
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}finally{save();console.log('R075_SUMMARY',JSON.stringify({status:result.status,error:result.error,native:result.native,medians:result.performance?.medians}));await browser?.disconnect();await chrome?.kill();}
