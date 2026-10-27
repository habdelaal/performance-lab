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
const result={status:'RUNNING',commit:process.env.GITHUB_SHA,native:[],limits:['Diagnostic lab only; no Odoo writes, deployment or product changes','All arms retain Critical CSS; same-font import inlining and preloading are fixture experiments','Vendor ablations attribute cost; no production disablement or functional acceptance','No-Google also suppresses dependent container tags such as Clarity','Three repetitions per arm, mobile emulation only; not five-run PSI acceptance','16-second observation; long-task proxy is not Lighthouse TBT']};
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
  const url=i>=6?target+'?lf_r074_diagnostic=1':target;const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});const text=await response.text();
  const row={i,query:i>=6,status:response.status(),marker:response.headers()['x-lf-critical-css']||null,critical:(text.match(/id="lf-critical-css"/g)||[]).length,loader:(text.match(/data-lf-critical-loader="r069"/g)||[]).length};result.native.push(row);console.log('R074_NATIVE',JSON.stringify(row));save();await ctx.close();
 }
 assert.ok(result.native.slice(0,6).every(x=>x.status===200&&x.marker==='r069'&&x.critical===1&&x.loader===1),'Native receipt unstable; stop before comparison');
 assert.ok(result.native.slice(6).every(x=>x.status===200&&!x.marker&&!x.critical),'Query fallback unexpected');
 await browser.disconnect();await chrome.kill();browser=null;chrome=null;
 const response=await fetch(target);assert.equal(response.headers.get('x-lf-critical-css'),'r069');const candidateHTML=await response.text();
 const prep=JSON.parse(execFileSync('python3',[new URL('../r073/prepare.py',import.meta.url).pathname],{input:candidateHTML,maxBuffer:2000000}));result.pageDigest=prep.digest;
 for(const resource of prep.resources){const r=await fetch(new URL(resource.url,origin));assert.equal(r.status,200);const data=Buffer.from(await r.arrayBuffer());assert.equal(createHash('sha1').update(data).digest('hex'),resource.sha1,'Resource drift');}
 let fontHTML=prep.candidateHTML;
 const fontImports=[...fontHTML.matchAll(/@import url\("(\/web\/content\/(?:33593\/google-font-Inter|33600\/google-font-Oxygen))"\);/g)];
 assert.equal(fontImports.length,2,'Expected two pinned font CSS imports');
 const fontEvidence=[];
 for(const match of fontImports){
   const rr=await fetch(new URL(match[1],origin));assert.equal(rr.status,200);
   const text=await rr.text();const pinned={'/web/content/33593/google-font-Inter':'1495474606fd2ccb01e8fb43058c3e745bd78bd3','/web/content/33600/google-font-Oxygen':'3b2eeab8e666f8eda9bf3a80c6488e2807f702d4'};assert.equal(createHash('sha1').update(text).digest('hex'),pinned[match[1]],'Font CSS drift');assert.ok(!/<\/style/i.test(text));
   assert.ok(text.includes('@font-face'));assert.ok(!/@import/i.test(text));
   assert.ok([...text.matchAll(/url\(['"]?([^'"\)]+)/g)].every(m=>m[1].startsWith('/')), 'Font URL rebasing required');
   fontEvidence.push({url:match[1],bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')});
   fontHTML=fontHTML.replace(match[0],text);
 }
 const preloadHTML=fontHTML.replace('</head>', '<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/eit_live_freight_theme/static/src/fonts/inter-latin-normal.woff2"><link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href="/web/content/33597/s-oxygen-v16-2sDfZG1Wl4LcnbuKjk0m.woff2"></head>');
 result.fontEvidence=fontEvidence;
 const cssURL=new URL(prep.cssURL,origin).href;const css=await(await fetch(cssURL)).text();
 result.performance=await measureSocket({html:prep.html,candidateHTML:prep.candidateHTML,css,cssURL,fontHTML,preloadHTML,save:r=>{result.performance=r;save();}});
 result.status='DIAGNOSTIC_COMPLETE_NOT_PRODUCT_ACCEPTANCE';
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}finally{save();console.log('R074_SUMMARY',JSON.stringify({status:result.status,error:result.error,native:result.native,medians:result.performance?.medians}));await browser?.disconnect();await chrome?.kill();}
