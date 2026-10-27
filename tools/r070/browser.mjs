import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../r052/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt',origin=new URL(target).origin;
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const result={status:'RUNNING',cases:[],comparisons:[],limits:['Synthetic component states on Cargo composition only; no Odoo writes','All page scripts omitted equally; no functional journey or tracking acceptance','Critical CSS held alone for visual coverage; no performance claim','Second service page and physical devices not tested']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(result,null,2));
let browser,chrome;
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 const response=await fetch(target);assert.equal(response.status,200);const source=await response.text();
 const cssPath=[...source.matchAll(/<link\b[^>]*href="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.includes('assets_service_frontend.min.css'));
 assert.equal(cssPath.length,1);assert.equal(cssPath[0],'/web/assets/1/ea69da2/eit_live_freight_theme.assets_service_frontend.min.css');
 const css=await(await fetch(new URL(cssPath[0],target))).text();assert.equal(sha(css),'5ea9d036011ac8a4bf7839f9442803614bbd3be6e9ee21535b81d1a06efbd5c7');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});
 browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));result.sandbox_disabled=false;
 for(const [width,theme,layout] of [[412,'light','full'],[412,'dark','full'],[1440,'light','full'],[1440,'dark','full'],[1440,'light','boxed'],[1440,'dark','boxed']]){
  for(const scenario of ['native-mixed','all-variants-12','empty','long-values-2']){
   const pair=[];
   for(const mode of ['baseline','critical']){
    const fixture=execFileSync('python3',[new URL('prepare.py',import.meta.url).pathname,scenario,mode,theme,layout],{input:source,maxBuffer:2000000}).toString();
    const context=await browser.createBrowserContext(),page=await context.newPage();const errors=[];
    await page.setViewport({width,height:900,deviceScaleFactor:1});
    await page.setRequestInterception(true);
    page.on('request',req=>{const url=new URL(req.url());if(url.href===target&&req.isNavigationRequest())return void req.respond({status:200,contentType:'text/html',body:fixture});if(url.origin===origin&&['GET','HEAD'].includes(req.method()))return void req.continue();return void req.respond({status:204,body:''});});
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(target,{waitUntil:'networkidle2',timeout:60000});await page.evaluate(()=>document.fonts.ready);
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
    const section=await page.$('section[data-snippet="s_explore_freight_opportunities"]');await section.scrollIntoView();
    const geometry=await page.evaluate(()=>[...document.querySelectorAll('section[data-snippet="s_explore_freight_opportunities"],section[data-snippet="s_explore_freight_opportunities"] *')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:e.getAttribute('class'),x:r.x+scrollX,y:r.y+scrollY,w:r.width,h:r.height,color:s.color,bg:s.backgroundColor,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,display:s.display};}));
    const key=`${width}-${theme}-${layout}-${scenario}-${mode}`;
    const shot=await section.screenshot({path:new URL(key+'.png',out).pathname});
    const row={width,theme,layout,scenario,mode,geometry,screenshot_sha:sha(shot),errors};result.cases.push(row);pair.push(row);await context.close();
   }
   const same={width,theme,layout,scenario,geometry_equal:JSON.stringify(pair[0].geometry)===JSON.stringify(pair[1].geometry),screenshot_equal:pair[0].screenshot_sha===pair[1].screenshot_sha,errors:pair.flatMap(x=>x.errors)};
   if(!same.geometry_equal)same.first_differences=pair[0].geometry.map((x,i)=>({baseline:x,candidate:pair[1].geometry[i]})).filter(x=>JSON.stringify(x.baseline)!==JSON.stringify(x.candidate)).slice(0,4);
   result.comparisons.push(same);save();console.log('R070_PAIR',JSON.stringify(same));
  }
 }
 result.status=result.comparisons.every(x=>x.geometry_equal&&x.screenshot_equal&&!x.errors.length)?'PASS_COMPONENT_VISUAL_MATRIX_NOT_PAGE_ACTIVATION':'FAIL_COMPONENT_VISUAL_MATRIX';
 if(result.status.startsWith('FAIL'))process.exitCode=1;
}catch(e){result.status='FAIL_OR_INCOMPLETE';result.error=String(e);process.exitCode=1;}
finally{save();console.log('R070_SUMMARY',JSON.stringify({status:result.status,error:result.error,pairs:result.comparisons.length}));await browser?.disconnect();await chrome?.kill();}
