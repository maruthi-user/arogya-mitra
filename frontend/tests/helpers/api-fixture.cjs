const {webcrypto}=require('node:crypto');
const vm=require('node:vm');
const {moduleLoader}=require('./module-loader.cjs');
async function boot({offline=false}={}){
  const elements=new Map(),listeners={},calls=[];
  const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',dataset:{},hidden:true,setAttribute(){},removeAttribute(){},addEventListener(){},reportValidity(){return true;}});return elements.get(id);};
  let session={role:'anonymous'},profile={id:'patient-1',name:'Guest',phone:'',village:'rama',language:'en'};
  const providers=[{id:'provider-1',name:'Dr. Ada',organization:'Community Clinic',type:'mbbs',village:'rama',phone:'9876543210',slots:['10:00','11:00'],open:true,services:'General consultation',fee:200}];
  const bookings=[],inquiries=[];
  const send=(body,status=200)=>({ok:status<400,status,headers:{get:()=> 'application/json'},json:async()=>structuredClone(body)});
  const fetch=async(url,options={})=>{
    if(offline)throw new Error('Backend offline');
    const path=new URL(url).pathname.replace('/api',''),method=options.method||'GET',body=options.body?JSON.parse(options.body):null;
    calls.push({path,method,body,headers:options.headers,credentials:options.credentials});
    if(method!=='GET'&&options.headers?.['X-CSRF-TOKEN']!=='test-token')return send({message:'CSRF required'},403);
    if(path==='/auth/csrf')return send({token:'test-token',headerName:'X-CSRF-TOKEN'});
    if(path==='/auth/session')return send({...session,profile:session.role==='patient'?profile:{}});
    if(path==='/auth/guest'){session={role:'patient',subjectId:profile.id,name:'Guest'};return send({...session,profile});}
    if(path==='/auth/login'){
      if(body.username==='wrong')return send({message:'Unable to sign in'},401);
      session={role:body.role,subjectId:body.role==='admin'?'admin-1':'provider-1',name:body.role==='admin'?'Administrator':'Dr. Ada'};return send(session);
    }
    if(path==='/auth/logout'){session={role:'anonymous'};return send({ok:true});}
    if(path.startsWith('/patients/')&&method==='PATCH'){Object.assign(profile,body);return send(profile);}
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
    document:{documentElement:{},getElementById:element,addEventListener:(type,fn)=>{listeners[type]=fn;},querySelector:()=>({dataset:{role:element('app').innerHTML.match(/data-form-action="login" data-role="(\w+)"/)?.[1]||'provider'}})},
    localStorage:{getItem:()=>saved,setItem:(key,value)=>{saved=value;}},confirm:()=>true});
  const load=moduleLoader(c);const app=(await load('app/bootstrap.js')).startApplication();await app.initialized;
  const click=async(a,extra={})=>listeners.click({target:{closest:()=>({dataset:{a,...extra}})}});
  const submit=async action=>listeners.submit({target:{dataset:{formAction:action}},preventDefault(){}});
  return {c,app,element,click,submit,load,calls,bookings,providers,setOnline:()=>{offline=false;}};
}
module.exports={boot};
