import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const target='https://livefreight-staging.odoo.com/cargo-insurance-egypt',origin=new URL(target).origin;
const sha=x=>createHash('sha256').update(x).digest('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const out=new URL('reports/',import.meta.url);mkdirSync(out,{recursive:true});
const report={status:'RUNNING',sha:process.env.GITHUB_SHA,cases:[],limits:['Browser-only CSS override, no server changes','Single English page and two viewports; no global font-removal acceptance','Coverage is observed use only, not a safe purge list','GTM and Google runtime real; measurement intercepted; Meta/Clarity runtime stubbed','Form opened but never submitted; non-GET first-party requests blocked','Animations disabled equally for visual comparison; not performance scoring']};
const save=()=>writeFileSync(new URL('result.json',out),JSON.stringify(report,null,2));let chrome,browser;
async function snapshot(page,cdp,row,label){
 await page.evaluate(()=>document.fonts.ready);await sleep(400);
 const layout=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());}).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,id:e.id,text:e.textContent.trim().slice(0,80),x:Math.round((r.x+scrollX)*10)/10,y:Math.round((r.y+scrollY)*10)/10,w:Math.round(r.width*10)/10,h:Math.round(r.height*10)/10,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight};}));
 const {root}=await cdp.send('DOM.getDocument');const {nodeIds}=await cdp.send('DOM.querySelectorAll',{nodeId:root.nodeId,selector:'h1,h2,h3,p,a,button,label,input,select,span,li'});const fonts={};
 for(const nodeId of nodeIds){try{const r=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});for(const f of r.fonts){if(f.glyphCount){const k=f.familyName+'|'+f.isCustomFont;fonts[k]=(fonts[k]||0)+f.glyphCount;}}}catch{}}
 const image=await page.screenshot({path:new URL(`${row.width}-${row.mode}-${label}.png`,out).pathname,fullPage:false});
 row.states.push({label,layout,fonts,screenshot_sha:sha(image)});
}
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 const response=await fetch(target);assert.equal(response.status,200);const html=await response.text();
 const paths=[...html.matchAll(/<link\b[^>]*href="([^"]+)"/g)].map(m=>m[1]).filter(x=>x.includes('assets_service_frontend.min.css'));assert.equal(paths.length,1);
 const cssURL=new URL(paths[0],target);assert.equal(cssURL.origin,origin);const cr=await fetch(cssURL);assert.equal(cr.status,200);const css=await cr.text();
 const imports=css.match(/@import\s+url\("\/web\/content\/\d+\/google-font-(?:Inter|Oxygen)"\);/g)||[];assert.equal(imports.length,2);
 let candidate=css;for(const line of imports)candidate=candidate.replace(line,'');report.css={url:cssURL.href,bytes:Buffer.byteLength(css),sha256:sha(css),removed:imports};
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check']});browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));report.sandbox_disabled=false;
 for(const width of [412,1440])for(const mode of ['baseline','without_font_imports']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),row={width,mode,states:[],errors:[],fontRequests:[],gtm:0};report.cases.push(row);
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width===412,hasTouch:width===412});const cdp=await page.createCDPSession();await cdp.send('DOM.enable');await cdp.send('CSS.enable');await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await page.coverage.startCSSCoverage({resetOnNavigation:false});
  page.on('pageerror',e=>row.errors.push(String(e)));await page.setRequestInterception(true);page.on('request',req=>void(async()=>{const u=new URL(req.url());if(u.origin===origin){if(!['GET','HEAD'].includes(req.method()))return req.respond({status:403,body:'R066 no form writes'});if(req.resourceType()==='font'||u.pathname.includes('google-font-'))row.fontRequests.push(u.pathname);if(u.href===cssURL.href)return req.respond({status:200,contentType:'text/css',body:mode==='baseline'?css:candidate});return req.continue();}if(u.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js'].includes(u.pathname)&&req.resourceType()==='script'){if(u.pathname==='/gtm.js')row.gtm++;return req.continue();}return req.respond(req.resourceType()==='script'?{status:200,contentType:'application/javascript',body:'/* isolated vendor */'}:{status:204,body:''});})().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});}));
  assert.equal((await page.goto(target,{waitUntil:'networkidle2',timeout:60000})).status(),200);await sleep(1500);await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
  await snapshot(page,cdp,row,'initial');
  if(width===412){await page.click('[data-lf-menu-toggle]');await snapshot(page,cdp,row,'menu');await page.click('[data-lf-menu-toggle]');}
  await page.click('[data-lf-theme-toggle]');await snapshot(page,cdp,row,'appearance');
  await page.click('a[data-insurance-enquiry]');await sleep(1200);await snapshot(page,cdp,row,'enquiry');
  const coverage=await page.coverage.stopCSSCoverage();row.coverage=coverage.filter(x=>x.url===cssURL.href).map(x=>({url:x.url,total:x.text.length,used:x.ranges.reduce((n,r)=>n+r.end-r.start,0),ranges:x.ranges}));
  row.status='CAPTURED';save();console.log('R066_CASE',JSON.stringify({width,mode,errors:row.errors,fonts:row.states.map(s=>({state:s.label,fonts:s.fonts})),coverage:row.coverage.map(x=>({total:x.total,used:x.used})),fontRequests:row.fontRequests,gtm:row.gtm}));await context.close();
 }
 report.comparisons=[];
 for(const width of [412,1440]){const a=report.cases.find(x=>x.width===width&&x.mode==='baseline'),b=report.cases.find(x=>x.width===width&&x.mode==='without_font_imports');for(const x of a.states){const y=b.states.find(z=>z.label===x.label);report.comparisons.push({width,state:x.label,layout_equal:JSON.stringify(x.layout)===JSON.stringify(y.layout),fonts_equal:JSON.stringify(x.fonts)===JSON.stringify(y.fonts),screenshot_equal:x.screenshot_sha===y.screenshot_sha,layout_diffs:x.layout.filter((v,i)=>JSON.stringify(v)!==JSON.stringify(y.layout[i])).slice(0,8),candidate_layout_diffs:y.layout.filter((v,i)=>JSON.stringify(v)!==JSON.stringify(x.layout[i])).slice(0,8)});}}
 report.status=report.comparisons.every(x=>x.layout_equal&&x.fonts_equal)?'PASS_SAMPLED_PARITY_NOT_GLOBAL_APPROVAL':'FONT_REMOVAL_NOT_ACCEPTED';
}catch(e){report.status='FAIL_OR_INCOMPLETE';report.error=String(e);process.exitCode=1;}finally{save();console.log('R066_SUMMARY',JSON.stringify({status:report.status,error:report.error,css:report.css,comparisons:report.comparisons}));await browser?.disconnect();await chrome?.kill();}
