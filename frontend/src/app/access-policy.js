/** Shared route policy for the React shell and healthcare workflow host. Backend permissions remain authoritative. */
export const PUBLIC_SCREENS=new Set(['roles','login','register','activate','requestSetup','applicationSubmitted']);
const open=new Set([...PUBLIC_SCREENS,'emergency','lang','intro','careCatalog','notFound','accessDenied']);
const patient=new Set(['setup','home','symptoms','providers','book','bookings','confirmed','meds','command','providerDetail','search','medicineRequests','careRequest','patientHospitals','patientLabs','patientClinics','patientPharmacies']);
const provider=new Set(['initialPassword','businessProfile','providerNotifications','providerAvailability','dash','providerBookings','schedule','providerProfile']);
const admin=new Set(['adminPendingProviders','businessReviews','adminHome','adminApplications','adminNotifications','adminPharmacies','adminRequests','adminAudit','careOrgs']);
const shared=new Set(['careStaffManage','careDashboard','carePending','careManage','careHistory','settings','account']);
const authPaths={roles:'/',login:'/auth/login',register:'/auth/register',activate:'/auth/activate',requestSetup:'/auth/password-setup',applicationSubmitted:'/auth/application-submitted',notFound:'/not-found',accessDenied:'/access-denied'};
export const homeScreen=role=>role==='admin'?'careDashboard':role==='provider'?'careDashboard':role==='patient'?'home':'roles';
export function resolveScreen(screen,session={role:'anonymous'},businessType){
 const role=session.role;
 if(role==='provider'&&session.mustChangePassword)return {screen:'initialPassword',params:{}};
 if(!open.has(screen)&&!patient.has(screen)&&!provider.has(screen)&&!admin.has(screen)&&!shared.has(screen))return {screen:'notFound',params:{}};
 const required=admin.has(screen)?'admin':provider.has(screen)?'provider':patient.has(screen)?'patient':null;
 if(required&&role!==required)return role==='anonymous'?{screen:required==='patient'?'roles':'login',params:required==='patient'?{}:{role:required}}:{screen:'accessDenied',params:{}};
 if(['account','careManage','careDashboard','carePending','careStaffManage'].includes(screen)&&!['provider','admin'].includes(role))return {screen:role==='anonymous'?'login':'accessDenied',params:role==='anonymous'?{role:'provider'}:{}};
 if(['careHistory','settings'].includes(screen)&&role==='anonymous')return {screen:'roles',params:{}};
 if(role==='provider'&&['pharmacy','laboratory','ambulance'].includes(businessType)&&['dash','providerBookings','schedule','providerProfile'].includes(screen))return {screen:'careManage',params:{}};
 return {screen,params:null};
}
export function routePath(screen,params={}){
 const path=Object.hasOwn(authPaths,screen)?authPaths[screen]:'/app/'+encodeURIComponent(screen);
 const query=new URLSearchParams();
 for(const key of screen==='login'?['role']:['id','pid','med','symptom'])if(typeof params[key]==='string'&&params[key])query.set(key,params[key]);
 return path+(query.size?'?'+query.toString():'');
}
export function parseRoute(pathname,search=''){
 const [path,embeddedSearch]=pathname.split('?');
 let screen=Object.entries(authPaths).find(([,p])=>p===path)?.[0];
 if(!screen)screen=path.startsWith('/app/')?path.slice(5):'notFound';
 const query=new URLSearchParams(search||embeddedSearch||'');const params={};
 for(const key of ['id','pid','med','symptom'])if(query.has(key))params[key]=query.get(key);
 if(screen==='login')params.role=query.get('role')==='admin'?'admin':'provider';
 return {screen,params};
}
