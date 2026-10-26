import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect,median,target} from './compare.mjs';
function fixture(tracking=true) {
  const origin=new URL(target).origin;
  const items=[{url:target,resourceType:'Document',statusCode:200},
    {url:origin+'/web/assets/1/hash/assets_service_frontend.min.css',resourceType:'Stylesheet',statusCode:200},
    {url:origin+'/web/assets/1/hash/assets_initial.min.js',resourceType:'Script',statusCode:200}];
  if(tracking) items.push({url:'https://www.googletagmanager.com/gtm.js?id=GTM-test',resourceType:'Script',statusCode:200});
  const audits={'network-requests':{details:{items}}};
  for(const key of ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','total-byte-weight']) audits[key]={numericValue:10};
  return {finalDisplayedUrl:target,audits};
}
test('median handles unordered and invalid evidence',()=>{
  assert.equal(median([5,1,3]),3); assert.equal(median([4,1]),2.5);
  assert.throws(()=>median([])); assert.throws(()=>median([NaN]));
});
test('accept baseline and blocked with expected assets',()=>{
  assert.equal(inspect(fixture(),'baseline').tracker_requests,1);
  assert.equal(inspect(fixture(false),'blocked').tracker_requests,0);
});
test('reject failed, redirected and missing-metric runs',()=>{
  const a=fixture(); a.runtimeError={code:'FAILED'}; assert.throws(()=>inspect(a,'baseline'));
  const b=fixture(); b.finalDisplayedUrl='https://live-freight.com/'; assert.throws(()=>inspect(b,'baseline'));
  const c=fixture(); delete c.audits['largest-contentful-paint']; assert.throws(()=>inspect(c,'baseline'));
});
test('reject ineffective treatment and absent baseline tracking',()=>{
  assert.throws(()=>inspect(fixture(),'blocked'));
  assert.throws(()=>inspect(fixture(false),'baseline'));
  const c=fixture(false); c.audits['network-requests'].details.items.push({url:'https://a.clarity.ms/collect',statusCode:200});
  assert.throws(()=>inspect(c,'blocked'));
});
test('reject native fallback stylesheet or error document',()=>{
  const a=fixture(); a.audits['network-requests'].details.items[1].url='https://livefreight-staging.odoo.com/web/assets/full.css'; assert.throws(()=>inspect(a,'baseline'));
  const b=fixture(); b.audits['network-requests'].details.items[0].statusCode=500; assert.throws(()=>inspect(b,'baseline'));
});
