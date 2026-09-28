import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';

const root = new URL('../', import.meta.url).pathname;
async function harness({consent, hostname = '127.0.0.1', enabled = true, unavailable = false, fetchPending = false} = {}) {
  let blockWrites = false;
  const {outputFiles} = await build({stdin:{contents: `export {productAnalytics} from './src/services/productAnalytics.ts'; export {gdprService} from './src/services/gdprService.ts';`, resolveDir:root}, bundle:true, write:false,
    plugins:[{name:'isolated-auth',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'auth-fixture',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const supabase = {auth:{getUser:async()=>({data:{user:null}})}}'}));}}],
    platform:'browser', format:'cjs', define:{'import.meta.env':JSON.stringify({PROD:true,
      VITE_ANALYTICS_ENABLED:String(enabled), VITE_ANALYTICS_QA:'true', VITE_PUBLIC_POSTHOG_KEY:'phc_synthetic_test',
      VITE_PUBLIC_POSTHOG_HOST:'https://us.i.posthog.com', VITE_ANALYTICS_CAMPAIGNS:'launch'})}});
  const makeStorage = () => {
    const data = {};
    return new Proxy({getItem:k => { if (unavailable) throw Error('blocked'); return data[k] ?? null; },
      setItem:(k,v) => {if (unavailable || blockWrites) throw Error('blocked'); data[k]=String(v);},
      removeItem:k => {delete data[k];}}, {ownKeys:()=>Object.keys(data),
        getOwnPropertyDescriptor:(_,k)=>k in data ? {enumerable:true,configurable:true} : undefined});
  };
  const localStorage=makeStorage(), sessionStorage=makeStorage(), listeners=new Map(), requests=[];
  if (consent !== undefined) localStorage.setItem('gdpr_preferences',JSON.stringify({analytics:consent}));
  const location={hostname,pathname:'/',search:'',href:`https://${hostname}/`};
  const sandbox={module:{exports:{}}, exports:{}, console, AbortController, URL, URLSearchParams, crypto:{randomUUID},
    location, localStorage, sessionStorage, document:{cookie:'',referrer:''},
    matchMedia:()=>({matches:true}), setTimeout,clearTimeout, Event,
    fetch:(url,options)=>{ requests.push({url,options,body:JSON.parse(options.body)});
      return fetchPending ? new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')))) : Promise.resolve({ok:true}); },
  };
  sandbox.window={...sandbox,addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn);},
    dispatchEvent:event=>{for(const fn of listeners.get(event.type)||[])fn(event);}};
  vm.runInNewContext(outputFiles[0].text,sandbox);
  const api=sandbox.module.exports.productAnalytics;
  const choice = value => {localStorage.setItem('gdpr_preferences',JSON.stringify({analytics:value}));sandbox.window.dispatchEvent(new Event('thessis:cookie-choice-changed'));};
  return {api,requests,localStorage,sessionStorage,choice,location,sandbox,gdpr:sandbox.module.exports.gdprService,blockWrites:()=>{blockWrites=true;}};
}

test('no consent, rejection, preview hosts, and kill switch send nothing',async()=>{
  for(const options of [{},{consent:false},{consent:true,hostname:'preview.vercel.app'},{consent:true,enabled:false},{unavailable:true}]) {
    const h=await harness(options);h.api.start();h.api.capture('application_submitted');h.api.beginAuth('login','email');
    assert.equal(h.requests.length,0);
  }
});
test('acceptance captures current page once and route payload excludes query/hash/IDs',async()=>{
  const h=await harness(); h.location.pathname='/user/private-profile-id'; h.location.search='?email=private@example.com&token=secret';
  h.api.start(); h.choice(true); h.api.start();h.api.page(h.location.pathname);
  assert.equal(h.requests.length,1); const p=h.requests[0].body.properties;
  assert.equal(p.route,'/user/:id'); assert.equal(p.$current_url,'https://www.thessis.com/user/:id');
  assert.doesNotMatch(JSON.stringify(h.requests),/private@example|private-profile-id|token=secret/);
  assert.equal(h.requests[0].options.referrerPolicy,'no-referrer'); assert.equal(h.requests[0].options.credentials,'omit');
});
test('allowlist drops private fields, unknown events and raw errors',async()=>{
  const h=await harness({consent:true});h.api.start();
  h.api.capture('action_failed',{feature:'messages',action:'send',error_category:'operation_failed',email:'PRIVATE',message:'PRIVATE',status:'PRIVATE',flow_id:'PRIVATE'});
  h.api.capture('PRIVATE',{email:'PRIVATE'});
  assert.equal(h.requests.length,2);assert.doesNotMatch(JSON.stringify(h.requests),/PRIVATE/);
});
test('withdrawal aborts pending requests and clears analytics without clearing auth or choice',async()=>{
  const h=await harness({consent:true,fetchPending:true});
  h.localStorage.setItem('sb-project-auth-token','preserve');h.localStorage.setItem('platform_attribution_data','private');
  h.api.start();h.api.capture('application_started');h.choice(false);
  assert.ok(h.requests.every(r=>r.options.signal.aborted));h.api.capture('application_submitted');
  assert.equal(h.requests.length,2);assert.equal(h.localStorage.getItem('sb-project-auth-token'),'preserve');
  assert.equal(h.localStorage.getItem('platform_attribution_data'),null);
  assert.deepEqual(Object.keys(h.localStorage).sort(),['gdpr_preferences','sb-project-auth-token']);
});
test('another-tab withdrawal stops collection',async()=>{
  const h=await harness({consent:true});h.api.start();
  h.localStorage.setItem('gdpr_preferences',JSON.stringify({analytics:false}));
  h.sandbox.window.dispatchEvent({type:'storage',key:'gdpr_preferences'});h.api.capture('cta_clicked',{cta:'login'});
  assert.equal(h.requests.length,1);assert.equal(h.localStorage.getItem('thessis_analytics_identity_v1'),null);
});
test('account switching never aliases one account into another',async()=>{
  const h=await harness({consent:true});h.api.start();const a=randomUUID(),b=randomUUID();
  h.api.identify(a);h.api.identify(a);h.api.identify(null);h.api.identify(b);h.api.capture('message_send_completed');
  const links=h.requests.filter(r=>r.body.event==='$identify');assert.equal(links.length,2);
  assert.equal(links[0].body.properties.distinct_id,a);assert.equal(links[1].body.properties.distinct_id,b);
  assert.notEqual(links[0].body.properties.$anon_distinct_id,links[1].body.properties.$anon_distinct_id);
  assert.notEqual(links[1].body.properties.$anon_distinct_id,a);
  assert.equal(h.requests.at(-1).body.properties.distinct_id,b);
});
test('restored sessions do not count as logins; fresh attempts complete once',async()=>{
  const h=await harness({consent:true});const user=randomUUID();h.api.start();h.api.identify(user);h.api.completeAuth(user);
  assert.equal(h.requests.filter(r=>r.body.event==='auth_completed').length,0);
  h.api.beginAuth('oauth','linkedin');h.api.completeAuth(user);h.api.completeAuth(user);
  assert.equal(h.requests.filter(r=>r.body.event==='auth_started').length,1);
  assert.equal(h.requests.filter(r=>r.body.event==='auth_completed').length,1);
});
test('logical operation duplicates are suppressed without exposing database IDs',async()=>{
  const h=await harness({consent:true});h.api.start();
  h.api.capture('application_submitted',{},'private-application-id');h.api.capture('application_submitted',{},'private-application-id');
  assert.equal(h.requests.filter(r=>r.body.event==='application_submitted').length,1);
  assert.doesNotMatch(JSON.stringify(h.requests),/private-application-id/);
});
test('only registered campaign codes are retained, with no complete landing URL',async()=>{
  const h=await harness({consent:true});h.location.search='?utm_source=linkedin&utm_campaign=launch&utm_term=PRIVATE&utm_content=PRIVATE&email=PRIVATE';
  h.api.start();const p=h.requests[0].body.properties;
  assert.equal(p.utm_source,'linkedin');assert.equal(p.utm_campaign,'launch');
  assert.doesNotMatch(JSON.stringify(h.requests),/PRIVATE|landing_url|utm_term/);
  assert.doesNotMatch(h.localStorage.getItem('thessis_analytics_attribution_v1'),/PRIVATE|landing_url|https/);
});

test('withdrawal remains effective when saving the choice fails',async()=>{
  const h=await harness({consent:true,fetchPending:true});h.api.start();const before=h.requests.length;
  h.blockWrites();
  await h.gdpr.saveConsent({necessary:true,functional:false,analytics:false,marketing:false});
  h.api.capture('application_submitted');
  assert.equal(h.requests.length,before);
  assert.ok(h.requests.every(r=>r.options.signal.aborted));
  assert.equal(h.api.isEnabled(),false);
});
