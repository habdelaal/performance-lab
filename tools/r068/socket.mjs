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
export async function measureSocket({html,candidateHTML,css,cssURL,save}){
 const origin='https://livefreight-staging.odoo.com',host=new URL(origin).hostname,folder=mkdtempSync(join(tmpdir(),'lf-r068-tls-')),key=join(folder,'key.pem'),cert=join(folder,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN='+host,'-addext','subjectAltName=DNS:'+host],{stdio:'ignore'});
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);const der=execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub});const spki=createHash('sha256').update(der).digest('base64');
 const cache=new Map(),pending=new Map(),payload=randomBytes(200000),result={rows:[],method:'Real loopback HTTPS socket, gzip text, CDP network throttle; public Staging snapshots, alternate port, no upstream writes',limits:['Fixture origin uses same hostname with a different port; not native Odoo deployment or PSI score','Public assets snapshotted and served locally; server response latency is not measured','Google runtime real; Meta/Clarity scripts stubbed equally; collection intercepted','Temporary certificate exception is restricted to this generated public key; Chrome sandbox remains enabled']};
 let fixture,mode='baseline',measuring=false,misses=[],serverErrors=[],cssRequests=0,chrome,browser;
 const rewrite=s=>s.replaceAll(origin,fixture);
 async function upstream(path){
  if(cache.has(path))return cache.get(path);if(pending.has(path))return pending.get(path);
  if(measuring)misses.push(path);
  const p=(async()=>{const u=new URL(path,origin);assert.equal(u.origin,origin);const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Upstream '+path);const raw=Buffer.from(await r.arrayBuffer()),type=r.headers.get('content-type')||'application/octet-stream';const item={raw,type};cache.set(path,item);return item;})();pending.set(path,p);try{return await p;}finally{pending.delete(path);}
 }
 const server=createServer({key:readFileSync(key),cert:readFileSync(cert)},(req,res)=>void(async()=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(403);return res.end();}
  if(req.url==='/__calibration'){res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Length':payload.length,'Cache-Control':'no-store'});return res.end(payload);}
  let raw,type;if(req.url==='/cargo-insurance-egypt'){raw=Buffer.from(mode==='baseline'?html:candidateHTML);type='text/html';}
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
   const ctx=await browser.createBrowserContext(),page=await ctx.newPage();await page.setViewport({width:412,height:900,isMobile:true,hasTouch:true,deviceScaleFactor:1});const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
   if(throttled){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1638.4*1024/8,uploadThroughput:675*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
   await page.evaluateOnNewDocument(()=>{window.__metrics={fcp:null,lcp:null,cls:0,shiftSum:0,shifts:[]};let sessionStart=0,lastShift=0,sessionValue=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__metrics.fcp=e.startTime;}).observe({type:'paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__metrics.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){if(e.startTime-lastShift>1000||e.startTime-sessionStart>5000){sessionStart=e.startTime;sessionValue=0;}lastShift=e.startTime;sessionValue+=e.value;window.__metrics.cls=Math.max(window.__metrics.cls,sessionValue);window.__metrics.shiftSum+=e.value;window.__metrics.shifts.push({time:e.startTime,value:e.value,sources:e.sources?.map(s=>({tag:s.node?.tagName,id:s.node?.id,cls:s.node?.className,prev:s.previousRect.toJSON(),current:s.currentRect.toJSON()}))});}}).observe({type:'layout-shift',buffered:true});});
   page.on('pageerror',e=>row.errors.push(String(e)));await page.setRequestInterception(true);page.on('request',req=>void(async()=>{const u=new URL(req.url());if(u.origin===fixture)return req.continue();if(u.hostname==='www.googletagmanager.com'&&['/gtm.js','/gtag/js'].includes(u.pathname)&&req.resourceType()==='script'){if(u.pathname==='/gtm.js')row.gtm++;return req.continue();}return req.respond(req.resourceType()==='script'?{status:200,contentType:'application/javascript',body:'/* vendor isolated */'}:{status:204,body:''});})().catch(e=>{row.errors.push(String(e));req.abort().catch(()=>{});}));return {ctx,page,cdp};
  }
  // Warm proxy snapshots only. Each measured browser context remains cold.
  for(mode of ['baseline','critical_then_full']){const {ctx,page}=await pageFor(false,{errors:[],gtm:0});assert.equal((await page.goto(target,{waitUntil:'networkidle2',timeout:60000})).status(),200);await sleep(4000);await ctx.close();}
  {const {ctx,page,cdp}=await pageFor(false,{errors:[],gtm:0});await page.goto(target,{waitUntil:'domcontentloaded'});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:50000,uploadThroughput:50000});result.calibration=await page.evaluate(async()=>{const t=performance.now();const b=await(await fetch('/__calibration')).arrayBuffer();return {ms:performance.now()-t,bytes:b.byteLength};});assert.equal(result.calibration.bytes,200000);assert.ok(result.calibration.ms>=3000);await ctx.close();}
  for(let round=1;round<=3;round++)for(mode of (round%2?['baseline','critical_then_full']:['critical_then_full','baseline'])){
   measuring=true;misses=[];cssRequests=0;const row={round,mode,errors:[],gtm:0};result.rows.push(row);const {ctx,page}=await pageFor(true,row);
   assert.equal((await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000})).status(),200);await sleep(18000);
   row.metrics=await page.evaluate(()=>({...window.__metrics,fullReady:window.__r067FullReady===true,tracking:window[Symbol.for('lf.theme.tracking.bridge')]?.status(),resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('assets_service_frontend')).map(e=>({transfer:e.transferSize,encoded:e.encodedBodySize,duration:e.duration})),ready:document.readyState}));row.cssSocketRequests=cssRequests;row.snapshotMisses=[...misses];row.serverErrors=[...serverErrors];save(result);console.log('R068_PERF_OBSERVED',JSON.stringify(row));
   assert.equal(row.cssSocketRequests,1,'Full CSS must transfer once');assert.equal(row.errors.length,0);assert.equal(serverErrors.length,0);assert.equal(misses.length,0);assert.ok(row.metrics.fcp>0&&row.metrics.lcp>0);assert.equal(row.metrics.ready,'complete');assert.equal(row.metrics.tracking?.started,true);assert.equal(row.gtm,1);assert.ok(row.metrics.resources.some(r=>r.encoded>100000));if(mode!=='baseline')assert.equal(row.metrics.fullReady,true);
   console.log('R068_PERF_CASE',JSON.stringify(row));save(result);await ctx.close();
  }
  const median=a=>a.sort((x,y)=>x-y)[1];result.medians=Object.fromEntries(['baseline','critical_then_full'].map(m=>[m,Object.fromEntries(['fcp','lcp','cls'].map(k=>[k,median(result.rows.filter(x=>x.mode===m).map(x=>x.metrics[k]))]))]));result.status='PASS_CONTROLLED_SOCKET_COMPARISON_NOT_NATIVE_DEPLOYMENT';return result;
 }finally{await browser?.disconnect();await chrome?.kill();server.closeAllConnections();await new Promise(r=>server.close(r));rmSync(folder,{recursive:true,force:true});}
}
