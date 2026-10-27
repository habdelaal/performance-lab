import assert from 'node:assert/strict';
import {createServer} from 'node:https';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function measureSocket({html,candidateHTML,css,cssURL,inlineHTML,preloadHTML,save}){
 const origin='https://livefreight-staging.odoo.com',host=new URL(origin).hostname,folder=mkdtempSync(join(tmpdir(),'lf-r075-tls-')),key=join(folder,'key.pem'),cert=join(folder,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN='+host,'-addext','subjectAltName=DNS:'+host],{stdio:'ignore'});
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);const der=execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub});const spki=createHash('sha256').update(der).digest('base64');
 const vendorCache=new Map(),vendorPending=new Map(),cache=new Map(),pending=new Map(),payload=randomBytes(200000),result={rows:[],method:'Real loopback HTTPS socket, gzip text, CDP network throttle; public Staging snapshots, alternate port, no upstream writes',limits:['Fixture origin uses same hostname with a different port; not native Odoo deployment or PSI score','Public assets snapshotted and served locally; server response latency is not measured','Vendor scripts frozen on first fetch and replayed with explicit delay; vendor network is simulated, collection intercepted','Temporary certificate exception is restricted to this generated public key; Chrome sandbox remains enabled']};
 let fixture,mode='baseline_full',measuring=false,misses=[],serverErrors=[],cssRequests=0,chrome,browser;
 const rewrite=s=>s.replaceAll(origin,fixture);
 async function upstream(path){
  if(cache.has(path))return cache.get(path);if(pending.has(path))return pending.get(path);
  if(measuring)misses.push(path);
  const p=(async()=>{const u=new URL(path,origin);assert.equal(u.origin,origin);const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Upstream '+path);const raw=Buffer.from(await r.arrayBuffer()),type=r.headers.get('content-type')||'application/octet-stream';const item={raw,type};cache.set(path,item);return item;})();pending.set(path,p);try{return await p;}finally{pending.delete(path);}
 }
 const server=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>void(async()=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(403);return res.end();}
  if(req.url==='/__calibration'){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':payload.length,'Cache-Control':'no-store'});return res.end(payload);}
  let raw,type;if(req.url==='/cargo-insurance-egypt'){raw=Buffer.from(mode.endsWith('_inline_css')?inlineHTML:mode.endsWith('_preload_css')?preloadHTML:candidateHTML);type='text/html';}
  else if(req.url===new URL(cssURL).pathname){if(measuring)cssRequests++;raw=Buffer.from(css);type='text/css';}
  else ({raw,type}=await upstream(req.url));
  if(/text|javascript|json|xml/.test(type)){raw=gzipSync(Buffer.from(rewrite(raw.toString('utf8'))));res.setHeader('Content-Encoding','gzip');}
  res.writeHead(200,{'Content-Type':type,'Content-Length':raw.length,'Cache-Control':type==='text/html'?'no-store':'private, max-age=3600'});res.end(raw);
 })().catch(e=>{serverErrors.push(String(e));res.writeHead(502);res.end('Fixture error');}));
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));fixture=origin+':'+server.address().port;const target=fixture+'/cargo-insurance-egypt';
  chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--disable-extensions','--disable-sync','--no-first-run','--no-default-browser-check','--no-proxy-server','--host-resolver-rules=MAP '+host+' 127.0.0.1','--ignore-certificate-errors-spki-list='+spki]});browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
  const cmd=await(await browser.target().createCDPSession()).send('Browser.getBrowserCommandLine');assert.ok(!cmd.arguments.some(x=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-namespace-sandbox)/.test(x)));result.sandbox_disabled=false;
  async function pageFor(throttled,row){
   const ctx=await browser.createBrowserContext(),page=await ctx.newPage();const mobile=!mode.startsWith('desktop');await page.setViewport({width:mobile?412:1440,height:900,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
   await cdp.send('Performance.enable');
   if(throttled){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:mobile?150:40,downloadThroughput:(mobile?1638.4:10240)*1024/8,uploadThroughput:(mobile?675:10240)*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:mobile?4:1});}
   await page.evaluateOnNewDocument(()=>{window.__metrics={fcp:null,lcp:null,cls:0,shiftSum:0,shifts:[],lcpEntries:[],longTasks:[],fontsReady:null,fullAt:null};document.addEventListener('DOMContentLoaded',()=>document.fonts.ready.then(()=>window.__metrics.fontsReady=performance.now()));new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});new MutationObserver(()=>{if(document.documentElement.dataset.lfCriticalState==='full'&&!window.__metrics.fullAt)window.__metrics.fullAt=performance.now();}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-lf-critical-state']});let sessionStart=0,lastShift=0,sessionValue=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__metrics.fcp=e.startTime;}).observe({type:'paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries()){window.__metrics.lcp=e.startTime;window.__metrics.lcpEntries.push({time:e.startTime,renderTime:e.renderTime,loadTime:e.loadTime,size:e.size,url:e.url,tag:e.element?.tagName,cls:e.element?.className,text:e.element?.tagName==='IMG'?'':e.element?.textContent?.slice(0,100)});}}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){if(e.startTime-lastShift>1000||e.startTime-sessionStart>5000){sessionStart=e.startTime;sessionValue=0;}lastShift=e.startTime;sessionValue+=e.value;window.__metrics.cls=Math.max(window.__metrics.cls,sessionValue);window.__metrics.shiftSum+=e.value;window.__metrics.shifts.push({time:e.startTime,value:e.value,sources:e.sources?.map(s=>({tag:s.node?.tagName,id:s.node?.id,cls:s.node?.className,prev:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}}).observe({type:'layout-shift',buffered:true});});
   page.on('pageerror',e=>row.errors.push(String(e)));await page.setRequestInterception(true);
   page.on('request',req=>void(async()=>{
    const u=new URL(req.url());
    if(mode.endsWith('_meta_manual')&&u.hostname==='connect.facebook.net'&&u.pathname==='/en_US/fbevents.js'){
      row.metaFixture=await page.evaluate(()=>{
        if(!window.fbq||!Array.isArray(window.fbq.queue))throw Error('Expected queued Meta bootstrap');
        const q=window.fbq.queue;const init=q.find(a=>a[0]==='init');if(!init)throw Error('Missing Meta init');
        q.unshift(['set','autoConfig',false,init[1]]);
        return {command:q[0][1],value:q[0][2],beforeInit:true,queuedCommands:q.map(a=>a[0])};
      });
    }
    if(u.origin===fixture)return req.continue();
    if(req.resourceType()==='script'){
      if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtm.js')row.gtm++;
      if(!vendorCache.has(u.href)){
       if(measuring)row.vendorMisses.push(u.hostname+u.pathname);
       if(!vendorPending.has(u.href))vendorPending.set(u.href,(async()=>{const rr=await fetch(u,{signal:AbortSignal.timeout(30000)});assert.equal(rr.status,200,'Vendor script '+u.hostname+u.pathname);const b=Buffer.from(await rr.arrayBuffer());const entry={body:b,compressed:gzipSync(b).length,sha256:createHash('sha256').update(b).digest('hex')};vendorCache.set(u.href,entry);return entry;})());
       await vendorPending.get(u.href);
      }
      const v=vendorCache.get(u.href);row.vendorScripts.push({host:u.hostname,path:u.pathname,sha256:v.sha256,bytes:v.body.length});
      // Same frozen bytes and explicit delay in every arm; interception is NOT a real vendor socket.
      if(throttled)await sleep((mobile?150:40)+1000*v.compressed/((mobile?1638.4:10240)*1024/8));
      return req.respond({status:200,contentType:'application/javascript',body:v.body});
    }
    const event=u.searchParams.get('ev')||u.searchParams.get('en');
    if(event&&/facebook\.com$|google-analytics\.com$/.test(u.hostname)){
      row.eventAttempts=row.eventAttempts||[];row.eventAttempts.push({host:u.hostname,path:u.pathname,event});
    }
    return req.respond({status:204,body:''}); // no external collection or first-party POSTs
   })().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});}));return {ctx,page,cdp};
  }
  // Warm proxy snapshots only. Each measured browser context remains cold.
  for(mode of ['mobile_full','mobile_inline_css','mobile_preload_css','mobile_meta_manual','desktop_full']){const {ctx,page}=await pageFor(false,{errors:[],gtm:0,suppressed:[],vendorMisses:[],vendorScripts:[]});assert.equal((await page.goto(target,{waitUntil:'networkidle2',timeout:60000})).status(),200);await sleep(4000);await ctx.close();}
  {const {ctx,page,cdp}=await pageFor(false,{errors:[],gtm:0,suppressed:[],vendorMisses:[],vendorScripts:[]});await page.goto(target,{waitUntil:'domcontentloaded'});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:50000,uploadThroughput:50000});result.calibration=await page.evaluate(async()=>{const t=performance.now();const b=await(await fetch('/__calibration')).arrayBuffer();return {ms:performance.now()-t,bytes:b.byteLength};});assert.equal(result.calibration.bytes,200000);assert.ok(result.calibration.ms>=3000);await ctx.close();}
  const arms=['full','inline_css','preload_css','meta_manual'];
  for(let round=1;round<=3;round++)for(const device of (round%2?['mobile','desktop']:['desktop','mobile']))for(const arm of (round%2?arms:[...arms].reverse()))for(mode of [device+'_'+arm]){
   measuring=true;misses=[];cssRequests=0;const row={round,mode,errors:[],gtm:0,suppressed:[],vendorMisses:[],vendorScripts:[]};result.rows.push(row);const {ctx,page,cdp}=await pageFor(true,row);
   assert.equal((await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000})).status(),200);await sleep(16000);
   row.metrics=await page.evaluate(()=>({...window.__metrics,computedFonts:Array.from(document.querySelectorAll('h1,.lft-brand,.hero .btn')).map(e=>({tag:e.tagName,font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize})),fullReady:document.documentElement.dataset.lfCriticalState==='full',tracking:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),resources:performance.getEntriesByType('resource').filter(e=>/assets_service_frontend|hero|cargo-glass|woff/.test(e.name)).map(e=>({url:e.name,start:e.startTime,end:e.responseEnd,transfer:e.transferSize,encoded:e.encodedBodySize,duration:e.duration})),hero:(()=>{const e=document.querySelector('.hero-art'),r=e.getBoundingClientRect();return {complete:e.complete,naturalWidth:e.naturalWidth,x:r.x,y:r.y,w:r.width,h:r.height};})(),ready:document.readyState}));
   row.cpu=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration'].includes(x.name)).map(x=>[x.name,x.value]));
   row.metrics.longTaskBlockingAfterFCP=row.metrics.longTasks.filter(x=>x.start>=row.metrics.fcp).reduce((n,x)=>n+Math.max(0,x.duration-50),0);
   row.cssSocketRequests=cssRequests;row.snapshotMisses=[...misses];row.serverErrors=[...serverErrors];
   if(round===1)await page.screenshot({path:new URL('reports/'+mode+'.png',import.meta.url).pathname});
   save(result);console.log('R075_PERF_CASE',JSON.stringify(row));
   assert.equal(row.cssSocketRequests,1,'Full CSS must transfer once');assert.equal(serverErrors.length,0);assert.ok(row.metrics.fcp>0&&row.metrics.lcp>0);assert.equal(row.metrics.ready,'complete');assert.equal(row.metrics.fullReady,true);
   await ctx.close();
  }
  // Separate CPU sampling navigations: never mix profiling overhead into timed medians.
  result.profiles=[];
  for(mode of ['mobile_full','desktop_full']){
   measuring=false;const row={mode,errors:[],gtm:0,suppressed:[],vendorMisses:[],vendorScripts:[]};
   const {ctx,page,cdp}=await pageFor(true,row);await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');
   assert.equal((await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000})).status(),200);await sleep(16000);
   const {profile}=await cdp.send('Profiler.stop');const nodes=new Map(profile.nodes.map(n=>[n.id,n]));const totals=new Map(),groups=new Map();
   for(let i=0;i<(profile.samples||[]).length;i++){const id=profile.samples[i],node=nodes.get(id),url=node?.callFrame.url;if(!url)continue;const dt=(profile.timeDeltas[i]||0)/1000;totals.set(id,(totals.get(id)||0)+dt);}
   const functions=[...totals].map(([id,ms])=>{const f=nodes.get(id).callFrame;let url=f.url;try{const u=new URL(url);url=u.hostname+u.pathname;}catch{}groups.set(url,(groups.get(url)||0)+ms);return {name:f.functionName,url,line:f.lineNumber,ms};}).sort((a,b)=>b.ms-a.ms);
   const entry={mode,errors:row.errors,byScript:[...groups].map(([url,ms])=>({url,ms})).sort((a,b)=>b.ms-a.ms),topFunctions:functions.slice(0,30),eventAttempts:row.eventAttempts||[],limits:'Sampled wall-time self-attribution; native/unattributed frames omitted; profiling run excluded from performance medians'};
   result.profiles.push(entry);console.log('R075_PROFILE',JSON.stringify(entry));save(result);await ctx.close();
  }
  const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)];result.medians=Object.fromEntries([...new Set(result.rows.map(x=>x.mode))].map(m=>[m,Object.fromEntries(['fcp','lcp','cls','longTaskBlockingAfterFCP'].map(k=>[k,median(result.rows.filter(x=>x.mode===m).map(x=>x.metrics[k]))]))]));result.status='DIAGNOSTIC_FACTORIAL_COMPLETE_NOT_ACCEPTANCE';return result;
 }finally{await browser?.disconnect();await chrome?.kill();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(folder,{recursive:true,force:true});}
}
