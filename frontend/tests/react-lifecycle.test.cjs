const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const reference=require('../../backend/src/main/resources/reference-catalog.json');
const requireFromApp=createRequire(path.resolve(__dirname,'../package.json'));
const originalRequest=global.Request;
async function fixture(bundle,{url,role='provider'}){
 const dom=new JSDOM('<div id="root"></div>',{url,pretendToBeVisual:false});const win=dom.window;
 const frames=new Set(),nativeRaf=callback=>setTimeout(()=>callback(Date.now()),16),nativeCancel=clearTimeout;
 win.requestAnimationFrame=callback=>{const id=nativeRaf(time=>{frames.delete(id);callback(time);});frames.add(id);return id;};
 win.cancelAnimationFrame=id=>{frames.delete(id);nativeCancel(id);};
 win.scrollTo=()=>{};win.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});win.Element.prototype.scrollIntoView=()=>{};
 win.localStorage.setItem('arogyaMitra.v1',JSON.stringify({v:1,settings:{lang:'en',voice:false,village:'rama',introSeen:true},providers:[],pharmacies:[],bookings:[]}));win.document.cookie='XSRF-TOKEN=test-token';
 const provider={id:'provider-1',name:'Example Practitioner',organization:'Example practice',type:'mbbs',businessType:'practitioner',village:'rama',phone:'',slots:['10:00'],fee:200,services:'Consultation',open:true};
 let session=role==='anonymous'?{role:'anonymous'}:{role,subjectId:role==='patient'?'patient-1':role==='provider'?'provider-1':'admin-1',accountId:role==='patient'?'':'account-'+role,name:'Example '+role,profile:{name:'Example patient',phone:'',village:'rama',language:'en'}};
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 async function fetchApi(input,options={}){
  const request=typeof input==='string'?null:input;const url=new URL(request?request.url:input,win.location.origin);const p=url.pathname,method=request?.method||options.method||'GET';
  if(p==='/api/reference-data')return response(reference);
  if(p==='/api/auth/csrf')return response({token:'test-token',headerName:'X-CSRF-TOKEN'});
  if(p==='/api/auth/session')return response(session);
  if(p==='/api/v1/auth/refresh')return session.role==='anonymous'?response({message:'Expired'},401):response({});
  if(p==='/api/state')return response({providers:[provider],pharmacies:[],bookings:[]});
  if(p==='/api/medicine-requests'||p.startsWith('/api/admin/')||p==='/api/care/requests'||p==='/api/care/services'||p==='/api/care/organisations'||p==='/api/v1/auth/sessions')return response([]);
  if(p==='/api/v1/app/config')return response({app:{name:'Arogya Mitra'},modules:['audit','files','help'],roles:['ADMIN','PROVIDER']});
  if(p==='/api/auth/logout'){session={role:'anonymous'};return response({ok:true});}
  return response({message:'Unexpected fixture endpoint: '+method+' '+p},404);
 }
 class LocalRequest extends originalRequest{constructor(input,options){super(typeof input==='string'?new URL(input,win.location.origin).href:input,options);}}
 const values={window:win,location:win.location,history:win.history,addEventListener:win.addEventListener.bind(win),removeEventListener:win.removeEventListener.bind(win),dispatchEvent:win.dispatchEvent.bind(win),PopStateEvent:win.PopStateEvent,Document:win.Document,NodeFilter:win.NodeFilter,HTMLButtonElement:win.HTMLButtonElement,SVGElement:win.SVGElement,document:win.document,navigator:win.navigator,localStorage:win.localStorage,HTMLElement:win.HTMLElement,HTMLInputElement:win.HTMLInputElement,Element:win.Element,Node:win.Node,MutationObserver:win.MutationObserver,CustomEvent:win.CustomEvent,Event:win.Event,MouseEvent:win.MouseEvent,KeyboardEvent:win.KeyboardEvent,getComputedStyle:win.getComputedStyle.bind(win),requestAnimationFrame:win.requestAnimationFrame.bind(win),cancelAnimationFrame:win.cancelAnimationFrame.bind(win),ResizeObserver:class{observe(){}unobserve(){}disconnect(){}},Request:LocalRequest,fetch:fetchApi,IS_REACT_ACT_ENVIRONMENT:true};
 const descriptors=new Map();for(const [key,value]of Object.entries(values)){descriptors.set(key,Object.getOwnPropertyDescriptor(global,key));Object.defineProperty(global,key,{value,writable:true,configurable:true});}
 const module={exports:{}};const context=vm.createContext({...values,module,exports:module.exports,require:requireFromApp,console,URL,URLSearchParams,TextEncoder,TextDecoder,setTimeout,clearTimeout,AbortController,Response,process});// jsdom is nonvisual: let Redux select its timer fallback, then expose frame stubs for Radix.
 const frameRequest=win.requestAnimationFrame;win.requestAnimationFrame=undefined;
 vm.runInContext(bundle,context);win.requestAnimationFrame=frameRequest;const {act,mount}=module.exports;const app=mount(win.document.getElementById('root'));
 await act(async()=>{app.start();await new Promise(r=>setTimeout(r,20));});
 async function until(predicate){for(let i=0;i<80;i++){if(predicate())return;await act(async()=>{await new Promise(r=>setTimeout(r,10));});}assert.fail('UI did not reach expected state: '+win.document.body.textContent.slice(0,1200));}
 return {dom,app,act,until,async close(){await act(async()=>app.stop());await act(async()=>{await new Promise(r=>setTimeout(r,150));});for(const id of [...frames])win.cancelAnimationFrame(id);win.close();for(const [key,descriptor]of descriptors){if(descriptor)Object.defineProperty(global,key,descriptor);else delete global[key];}}};
}
test('mounted React routes restore account pages and clear expired or denied access',async t=>{
 const root=path.resolve(__dirname,'..');const built=await require('esbuild').build({entryPoints:[path.join(__dirname,'template-mount.jsx')],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',plugins:[{name:'isolate-router',setup(build){build.onResolve({filter:/^wouter$/},()=>({path:requireFromApp.resolve('wouter')}));}}],jsx:'automatic',define:{'import.meta.env':JSON.stringify({BASE_URL:'/',VITE_API_BASE_URL:''})},alias:{'@layout':path.join(root,'src/layout')},logLevel:'silent'});const bundle=built.outputFiles[0].text;
 await t.test('refreshing an authenticated account URL shows account content',async()=>{
  const f=await fixture(bundle,{url:'http://localhost:3012/app/account'});try{await f.until(()=>f.app.getApplication()?.navigation.screen==='account'&&/Account Information/i.test(f.dom.window.document.body.textContent));assert.equal(f.dom.window.location.pathname,'/app/account');assert.equal(f.app.getApplication().state.session.role,'provider');}finally{await f.close();}
 });
 await t.test('patient account URLs show access denied without losing the guest session',async()=>{
  const f=await fixture(bundle,{url:'http://localhost:3012/app/account',role:'patient'});try{await f.until(()=>f.app.getApplication()?.navigation.screen==='accessDenied');assert.match(f.dom.window.document.body.textContent,/Your role does not have access/);assert.equal(f.app.getApplication().state.session.role,'patient');}finally{await f.close();}
 });
 await t.test('session expiry removes the account view and shows a sign-in notice',async()=>{
  const f=await fixture(bundle,{url:'http://localhost:3012/app/account'});try{await f.until(()=>f.app.getApplication()?.navigation.screen==='account');await f.act(async()=>f.app.expire());await f.until(()=>f.app.getApplication()?.navigation.screen==='roles');assert.equal(f.dom.window.location.pathname,'/');assert.match(f.dom.window.document.body.textContent,/Your session has expired/);assert.equal(f.dom.window.document.querySelector('#app').dataset.screen,'roles');}finally{await f.close();}
 });
});
