import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../r052/package.json',import.meta.url)),puppeteer=require('puppeteer-core');
const {launch}=await import('../r052/node_modules/chrome-launcher/dist/index.js');
const payload=randomBytes(200000),rows=[];let browser,chrome;
const server=createServer((req,res)=>{res.setHeader('Cache-Control','no-store');if(req.url.startsWith('/payload')){res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Length',payload.length);res.end(payload);}else res.end('<!doctype html><title>Transport calibration</title>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{
 assert.equal(process.env.GITHUB_REF,'refs/heads/qa/r053-browser');
 chrome=await launch({chromePath:process.env.CHROME_PATH,ignoreDefaultFlags:true,chromeFlags:['--headless=new','--disable-dev-shm-usage','--enable-automation','--disable-background-networking','--no-first-run']});browser=await puppeteer.connect({browserURL:`http://127.0.0.1:${chrome.port}`});
 for(const mode of ['http_socket','intercept_fulfill']){
  const ctx=await browser.createBrowserContext(),page=await ctx.newPage();await page.goto(base);const cdp=await page.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:50000,uploadThroughput:50000});
  if(mode==='intercept_fulfill'){await page.setRequestInterception(true);page.on('request',req=>void(req.url().startsWith(base+'/payload')?req.respond({status:200,contentType:'application/octet-stream',headers:{'Content-Length':String(payload.length),'Cache-Control':'no-store'},body:payload}):req.continue()));}
  const result=await page.evaluate(async()=>{const t=performance.now();const b=await(await fetch('/payload',{cache:'no-store'})).arrayBuffer();return {ms:performance.now()-t,bytes:b.byteLength};});assert.equal(result.bytes,payload.length);rows.push({mode,...result});await ctx.close();
 }
 const result={rows,fulfill_ratio:rows[1].ms/rows[0].ms,calibrated_throttling:rows[0].ms>=3000,fulfill_equivalent:rows[1].ms/rows[0].ms>=0.8};mkdirSync(new URL('reports/',import.meta.url),{recursive:true});writeFileSync(new URL('reports/transport.json',import.meta.url),JSON.stringify(result,null,2));console.log('R068_TRANSPORT',JSON.stringify(result));
}finally{await browser?.disconnect();await chrome?.kill();await new Promise(r=>server.close(r));}
