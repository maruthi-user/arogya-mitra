import React,{useEffect,useRef,useState,memo} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import {useLocation,useSearch} from 'wouter';
import {configureLayout} from '@layout/config/registry';
import {LayoutProvider} from '@layout/shell/LayoutContext';
import {AppShell} from '@layout/shell/AppShell';
import {TooltipProvider} from '@layout/ui/tooltip';
import {Toaster} from '@layout/ui/toaster';
import {toast} from '@layout/hooks/use-toast';
import {setUserData,logout} from '@layout/store/authSlice';
import {apiSlice} from '@layout/store/apiSlice';
import {startApplication} from '../app/bootstrap.js';
import {PUBLIC_SCREENS,parseRoute,routePath,homeScreen} from '../app/access-policy.js';
import {healthcareConfig} from './config';
import {reactPage} from './pages';
const HealthcareLogin=React.lazy(()=>import('./Login'));
const LegacyHost=memo(function LegacyHost(){
 return <div id="legacy-root"><div id="app"/><div id="toast" role="status" hidden/><div id="listening" role="status" hidden><div className="mic-pulse">🎤</div><div id="listenText"/><button className="btn" data-a="cancelMic">Cancel / రద్దు</button></div></div>;
});
/** True while the browser reports a network connection; updates on online/offline events. */
function useOnline(){
 const [online,setOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine!==false);
 useEffect(()=>{const up=()=>setOnline(true),down=()=>setOnline(false);window.addEventListener('online',up);window.addEventListener('offline',down);return()=>{window.removeEventListener('online',up);window.removeEventListener('offline',down);};},[]);
 return online;
}
export const bridge={current:null};
configureLayout(healthcareConfig(bridge));

export class TemplateErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(!this.state.failed)return this.props.children;
  const te=typeof document!=='undefined'&&document.documentElement.lang==='te';
  return <main className="mx-auto max-w-lg p-8" role="alert"><h1 className="text-xl font-semibold">{te?'పేజీ లోడ్ కాలేదు':'This page could not be loaded'}</h1><p className="my-4">{te?'కనెక్షన్‌ను పరిశీలించి మళ్లీ ప్రయత్నించండి.':'Check the connection and try again.'}</p><button className="rounded bg-primary px-4 py-3 text-primary-foreground" onClick={()=>window.location.reload()}>{te?'మళ్లీ ప్రయత్నించండి':'Retry'}</button></main>;
 }
}
export function HealthcareApp(){
 const dispatch=useDispatch();
 const [location,navigate]=useLocation(),search=useSearch();
 const [snapshot,setSnapshot]=useState({screen:'roles',params:{},session:{role:'anonymous'},language:'te',connectionError:''});
 const [ready,setReady]=useState(false),[retrying,setRetrying]=useState(false),[expiredNotice,setExpiredNotice]=useState(false);
 const sessionExpired=useSelector(s=>s.auth.sessionExpired);
 const initialized=useRef(false),syncingRoute=useRef(false),identity=useRef('');
 useEffect(()=>{
  const notify=event=>{event.preventDefault();toast(event.detail);};
  document.addEventListener('arogya-notification',notify);
  return ()=>document.removeEventListener('arogya-notification',notify);
 },[]);
 const locationRef=useRef({path:location,search});locationRef.current={path:location,search};
 useEffect(()=>{
  let mounted=true;initialized.current=false;
  const app=startApplication({embedded:true,onChange:next=>{
   if(!mounted)return;
   const user=next.session,key=[user.role,user.subjectId||'',user.accountId||user.name||''].join(':');
   configureLayout(healthcareConfig(bridge,next.language,user.role));
   if(identity.current!==key){dispatch(apiSlice.util.resetApiState());identity.current=key;}
   dispatch(user.role==='anonymous'?logout():setUserData({id:user.subjectId,accountId:user.accountId,role:user.role,fullName:user.name||'Guest'}));
   if(user.role!=='anonymous')setExpiredNotice(false);
   setSnapshot(next);
   if(initialized.current){
    const parsed=parseRoute(locationRef.current.path,locationRef.current.search);
    const target=routePath(next.screen,next.params),current=routePath(parsed.screen,parsed.params);
    if(current!==target)navigate(target,{replace:syncingRoute.current});
   }
  }});
  bridge.current=app;
  app.initialized.then(()=>{
   if(!mounted)return;
   initialized.current=true;setReady(true);
   let destination=parseRoute(window.location.pathname,window.location.search);
   if(destination.screen==='roles'){
    if(app.navigation.screen!=='roles')destination={screen:app.navigation.screen,params:app.navigation.params};
    else destination={screen:homeScreen(app.state.session.role),params:{}};
   }
   syncingRoute.current=true;
   app.go(destination.screen,destination.params);
   syncingRoute.current=false;
  });
  return ()=>{mounted=false;app.destroy();if(bridge.current===app)bridge.current=null;};
 },[]);
 useEffect(()=>{
  if(!initialized.current||!bridge.current)return;
  const destination=parseRoute(location,search),current=bridge.current.navigation;
  if(routePath(current.screen,current.params)===routePath(destination.screen,destination.params))return;
  syncingRoute.current=true;bridge.current.go(destination.screen,destination.params);syncingRoute.current=false;
 },[location,search]);
 useEffect(()=>{if(sessionExpired&&bridge.current){setExpiredNotice(bridge.current.state.session.role==='patient'&&!bridge.current.state.session.accountId?'guest':'account');bridge.current.expireSession();}},[sessionExpired]);
 const online=useOnline();
 async function retry(){setRetrying(true);try{await bridge.current?.reload();}catch{}finally{setRetrying(false);}}
 const te=snapshot.language==='te',login=['login','patientRegister'].includes(snapshot.screen);
 const chrome=!PUBLIC_SCREENS.has(snapshot.screen)&&snapshot.session.role!=='anonymous'&&!snapshot.session.mustChangePassword;
 // Migrated screens are React pages (react-app/pages.jsx); the legacy host stays mounted but hidden.
 const page=reactPage(snapshot,bridge);
 return <LayoutProvider><TooltipProvider><AppShell chromeEnabled={chrome} workspaceRole={snapshot.session.role}>
  {!online&&<div className="m-3 rounded border border-amber-300 bg-amber-50 p-3 text-amber-950" role="status">{te?'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. కనెక్షన్ వచ్చిన తర్వాత మార్పులు సేవ్ అవుతాయి — మళ్లీ ప్రయత్నించండి.':'You are offline. Your changes are not saved until the connection is back — please try again then.'}</div>}
  {!ready&&<p className="p-4 text-center" role="status">{te?'బ్యాకెండ్‌కు కనెక్ట్ అవుతోంది…':'Connecting to the backend…'}</p>}
  {expiredNotice&&!login&&<div className="m-3 rounded border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">{expiredNotice==='guest'?(te?'మీ అతిథి సెషన్ గడువు ముగిసింది. కొనసాగడానికి కొత్త అతిథి సెషన్ ప్రారంభించండి. పాత అభ్యర్థనలను ప్రస్తుతం తిరిగి పొందలేరు.':'Your guest session has expired. Start a new guest session to continue. Previous requests cannot currently be recovered.'):(te?'మీ సెషన్ గడువు ముగిసింది. మళ్లీ ప్రవేశించండి.':'Your session has expired. Please sign in again.')}</div>}
  {snapshot.connectionError&&!login&&<div className="m-3 rounded border border-red-300 bg-red-50 p-4 text-red-950" role="alert"><p>{snapshot.connectionError}</p><button className="mt-2 rounded border px-4 py-2" disabled={retrying} onClick={retry}>{retrying?(te?'కనెక్ట్ అవుతోంది…':'Reconnecting…'):(te?'మళ్లీ ప్రయత్నించండి':'Retry connection')}</button></div>}
  <div className={page||login?'hidden':chrome?'am-workspace-content':''}><LegacyHost/></div>
  <React.Suspense fallback={<p className="p-6" role="status">{te?'లోడ్ అవుతోంది…':'Loading…'}</p>}>
   {page}
   {login&&<HealthcareLogin key={snapshot.screen+':'+(snapshot.params?.role||'provider')} bridge={bridge} register={snapshot.screen==='patientRegister'} role={snapshot.screen==='patientRegister'?'patient':snapshot.params?.role||'provider'} language={snapshot.language} connectionError={snapshot.connectionError} onRetry={retry} retrying={retrying}/>}
  </React.Suspense>
 </AppShell><Toaster/></TooltipProvider></LayoutProvider>;
}
