const referenceCatalog=require('../../../backend/src/main/resources/reference-catalog.json');
const {webcrypto}=require('node:crypto');
const vm=require('node:vm');
const {moduleLoader}=require('./module-loader.cjs');
async function boot({offline=false,referenceData=referenceCatalog,mustChangePassword=false,serviceApproval='approved'}={}){
  const elements=new Map(),listeners={},calls=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',dataset:{},hidden:true,setAttribute(){},removeAttribute(){},addEventListener(){},reportValidity(){return true;}});return elements.get(id);};
  let session={role:'anonymous'},profile={id:'patient-1',name:'Guest',phone:'',village:'rama',language:'en'};
  const providers=[{id:'provider-1',name:'Dr. Ada',organization:'Community Clinic',type:'mbbs',village:'rama',phone:'9876543210',slots:['10:00','11:00'],open:true,services:'General consultation',fee:200}];
  const bookings=[],inquiries=[],careRequests=[];
  const careServices=[{id:'service-1',providerId:'provider-1',kind:'home_visit',title:'Home visit',titleTe:'Home visit Telugu',organization:'Community Clinic',description:'Home consultation',phone:'9876543210',fee:250,resource:'doctor',capacity:1,coverage:['rama','town'],slots:['10:00'],active:true,available:true,approval:serviceApproval}];
  const send=(body,status=200)=>({ok:status<400,status,headers:{get:()=> 'application/json'},json:async()=>structuredClone(body)});
  const fetch=async(url,options={})=>{
    if(offline)throw new Error('Backend offline');
    const path=new URL(url).pathname.replace('/api',''),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
    calls.push({path,method,body,headers:options.headers,credentials:options.credentials});
    if(method!=='GET'&&options.headers?.['X-CSRF-TOKEN']!=='test-token')return send({message:'CSRF required'},403);
    if(path.startsWith('/onboarding/businesses/'))return send({...providers.find(p=>p.id===session.subjectId),providerId:session.subjectId,status:'approved',active:true,documents:[]});
    if(path==='/onboarding/notifications'||path==='/onboarding/businesses')return send([]);
    if(path==='/reference-data')return send(referenceData);
    if(path==='/auth/csrf')return send({token:'test-token',headerName:'X-CSRF-TOKEN'});
    if(path==='/auth/session')return send({...session,profile:session.role==='patient'?profile:{}});
    if(path==='/auth/guest'){session={role:'patient',subjectId:profile.id,name:'Guest'};return send({...session,profile});}
    if(path==='/auth/login'){
      if(body.username==='wrong')return send({message:'Unable to sign in'},401);
      session={role:body.role,subjectId:body.role==='admin'?'admin-1':body.username==='other-provider'?'provider-2':'provider-1',name:body.role==='admin'?'Administrator':'Dr. Ada',mustChangePassword:body.role==='provider'&&mustChangePassword};return send(session);
    }
    if(path==='/auth/change-initial-password'){mustChangePassword=false;session={role:'anonymous'};return send({message:'Password changed'});}
    if(path==='/auth/register')return send({id:'application-1',username:'new-provider',status:'pending'},201);
    if(path==='/auth/logout'){session={role:'anonymous'};return send({ok:true});}
    if(path.startsWith('/patients/')&&method==='PATCH'){Object.assign(profile,body);return send(profile);}
    if(path==='/care/services'&&method==='GET')return send(url.includes('managed=true')&&session.role==='provider'?careServices.filter(s=>s.providerId===session.subjectId):careServices);
    if(path.endsWith('/availability'))return send({slots:[{time:'10:00',remaining:1}]});
    if(path==='/care/requests'&&method==='GET')return send(session.role==='patient'?careRequests.filter(r=>r.patientId===profile.id):session.role==='provider'?careRequests.filter(r=>r.providerId===session.subjectId):careRequests);
    if(path==='/care/requests'&&method==='POST'){const s=careServices.find(s=>s.id===body.serviceId);const r={...s,...body,id:'request-'+careRequests.length,patientId:profile.id,patientName:profile.name,status:'pending',history:[{status:'pending',at:Date.now(),note:''}]};careRequests.push(r);return send(r,201);}
    if(path.startsWith('/care/requests/')&&method==='PATCH'){const r=careRequests.find(r=>r.id===path.split('/').at(-1));r.status=body.status;r.history.push({status:body.status,at:Date.now(),note:body.note});return send(r);}
    if(path==='/care/staff')return send([{id:'account-1',providerId:'provider-1',name:'Dr. Ada',active:true,suspended:false}]);
    if(path==='/care/organisations')return send([]);
    if(path==='/state')return send({providers,pharmacies:[],bookings:session.role==='patient'?bookings.filter(b=>b.patientId===profile.id):session.role==='provider'?bookings.filter(b=>b.pid==='provider-1'):session.role==='admin'?bookings:[]});
    if(path.includes('/slots'))return send({slots:[{time:'10:00',available:true},{time:'11:00',available:true}]});
    if(path==='/bookings'&&method==='POST'){const booking={...body,id:'booking-'+bookings.length,status:'pending',createdAt:Date.now(),expiresAt:Date.now()+1800000,history:[]};bookings.push(booking);return send(booking,201);}
    if(path.startsWith('/bookings/')&&method==='PATCH'){const b=bookings.find(b=>b.id===path.split('/').at(-1));b.status=body.status;return send(b);}
    if(path==='/medicine-requests'&&method==='GET')return send(inquiries);
    if(path.startsWith('/admin/'))return send([]);
    if(path.startsWith('/providers/')&&method==='PATCH'){Object.assign(providers[0],body);return send(providers[0]);}
    if(path.startsWith('/entities/')){providers[0].open=body.open;return send({ok:true});}
    return send({ok:true});
  };
  let saved=JSON.stringify({v:1,settings:{lang:'en',voice:false,introSeen:true,village:'rama'},providers:[],pharmacies:[],bookings:[]});
  const c=vm.createContext({crypto:webcrypto,setTimeout,clearTimeout,AbortController,fetch,
    window:{APP_CONFIG:{dataMode:'api',apiBaseUrl:'http://test/api'},scrollTo(){}},
    document:{querySelectorAll:()=>[],documentElement:{},getElementById:element,addEventListener:(type,fn)=>{listeners[type]=fn;},removeEventListener:(type,fn)=>{if(listeners[type]===fn)delete listeners[type];},querySelector:()=>({dataset:{role:element('app').innerHTML.match(/data-form-action="login" data-role="(\w+)"/)?.[1]||'provider'}})},
    localStorage:{getItem:()=>saved,setItem:(key,value)=>{saved=value;}},confirm:()=>true});
  const load=moduleLoader(c);const app=(await load('app/bootstrap.js')).startApplication();await app.initialized;
  const click=async(a,extra={})=>listeners.click({target:{closest:()=>({dataset:{a,...extra}})}});
  const submit=async action=>listeners.submit({target:{dataset:{formAction:action}},preventDefault(){}});
  return {c,app,element,click,submit,load,calls,bookings,providers,listenerCount:()=>Object.keys(listeners).length,setOnline:()=>{offline=false;}};
}
module.exports={boot};
