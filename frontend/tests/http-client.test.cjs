const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {moduleLoader}=require('./helpers/module-loader.cjs');
const send=(body,status=200,type='application/json')=>({ok:status>=200&&status<300,status,headers:{get:()=>type},json:async()=>body});
async function client(handler){const calls=[];const context=vm.createContext({window:{APP_CONFIG:{apiBaseUrl:'http://test/api'}},AbortController,setTimeout,clearTimeout,fetch:async(url,options={})=>{const path=new URL(url).pathname.replace('/api','');calls.push({path,...options});return handler(path,options,calls);}});const load=moduleLoader(context);return {api:await load('services/api/http-client.js'),adapter:await load('services/api/api-adapter.js'),calls};}
const csrf=()=>send({token:'token',headerName:'X-CSRF-TOKEN'});
test('after refresh, the real booking conflict is surfaced rather than the original 401',async()=>{
 let attempts=0;const {api,calls}=await client(path=>path==='/auth/csrf'?csrf():path==='/v1/auth/refresh'?send({}):++attempts===1?send({message:'Expired'},401):send({message:'This slot is full'},409));
 await assert.rejects(api.request('/care/requests','POST',{}),e=>e.status===409&&e.message==='This slot is full');assert.equal(attempts,2);assert.equal(calls.filter(c=>c.path==='/v1/auth/refresh').length,1);
});
test('concurrent unauthorized reads share one refresh and each retry once',async()=>{
 const attempts={};let refreshed=false;
 const {api,calls}=await client(async path=>{if(path==='/auth/csrf')return csrf();if(path==='/v1/auth/refresh'){await new Promise(r=>setTimeout(r,10));refreshed=true;return send({});}attempts[path]=(attempts[path]||0)+1;return refreshed?send({ok:true}):send({},401);});
 await Promise.all([api.request('/one'),api.request('/two')]);assert.equal(calls.filter(c=>c.path==='/v1/auth/refresh').length,1);assert.equal(attempts['/one'],2);assert.equal(attempts['/two'],2);
});
test('refresh outages retain their server status instead of being treated as expired sessions',async()=>{
 const {api}=await client(path=>path==='/auth/csrf'?csrf():path==='/v1/auth/refresh'?send({message:'Temporary outage'},503):send({},401));
 await assert.rejects(api.request('/care/requests'),e=>e.status===503&&e.message==='Temporary outage');
});
test('denied mutations are not automatically replayed and the next request renews CSRF',async()=>{
 let token=0,posts=0;const {api,calls}=await client(path=>path==='/auth/csrf'?send({token:'token-'+(++token),headerName:'X-CSRF-TOKEN'}):++posts===1?send({message:'Forbidden'},403):send({ok:true}));
 await assert.rejects(api.request('/change','POST',{}),e=>e.status===403);assert.equal(posts,1);await api.request('/change','POST',{});assert.equal(token,2);assert.equal(calls.filter(c=>c.path==='/change')[1].headers['X-CSRF-TOKEN'],'token-2');
});
test('204 responses and backend routing/network errors are handled clearly',async()=>{
 let c=await client(()=>send(null,204,null));assert.equal(await c.api.request('/empty'),null);
 c=await client(()=>send(null,200,'text/html'));await assert.rejects(c.api.request('/wrong-port'),/frontend proxy and backend port/);
 c=await client(()=>{throw new TypeError('fetch failed');});await assert.rejects(c.api.request('/offline'),/Unable to reach the backend/);
});

test('session probing does not silently sign out a user when refresh has an outage',async()=>{
 const {adapter}=await client(path=>path==='/auth/csrf'?csrf():path==='/v1/auth/refresh'?send({message:'Maintenance'},503):send({role:'anonymous'}));
 await assert.rejects(adapter.apiAdapter.session(),e=>e.status===503);
});
test('invalid CSRF metadata blocks mutations before they are sent',async()=>{
 const {api,calls}=await client(()=>send({}));await assert.rejects(api.request('/change','POST',{}),/security token/);assert.equal(calls.filter(c=>c.path==='/change').length,0);
});

test('login renews an expired CSRF token once without replaying permission failures',async()=>{
 let token=0,attempts=0;
 const {api,calls}=await client((path,options)=>path==='/auth/csrf'?send({token:'token-'+(++token),headerName:'X-XSRF-TOKEN'}):++attempts===1?send({code:'CSRF_INVALID',message:'Expired token'},403):send({role:'admin'}));
 assert.equal((await api.request('/auth/login','POST',{username:'admin',password:'test',role:'admin'})).role,'admin');
 assert.equal(token,2);const logins=calls.filter(c=>c.path==='/auth/login');assert.equal(logins.length,2);assert.equal(logins[0].headers['X-XSRF-TOKEN'],'token-1');assert.equal(logins[1].headers['X-XSRF-TOKEN'],'token-2');assert.equal(logins[1].credentials,'include');
 const denied=await client(path=>path==='/auth/csrf'?csrf():send({code:'ACCESS_DENIED',message:'Forbidden'},403));
 await assert.rejects(denied.api.request('/auth/login','POST',{}),e=>e.status===403);assert.equal(denied.calls.filter(c=>c.path==='/auth/login').length,1);
});
test('CSRF login recovery stops after one retry and never retries other mutations',async()=>{
 const c=await client(path=>path==='/auth/csrf'?csrf():send({code:'CSRF_INVALID',message:'Expired token'},403));
 await assert.rejects(c.api.request('/auth/login','POST',{}),e=>e.status===403);assert.equal(c.calls.filter(x=>x.path==='/auth/login').length,2);
 await assert.rejects(c.api.request('/care/requests','POST',{}),e=>e.status===403);assert.equal(c.calls.filter(x=>x.path==='/care/requests').length,1);
});
