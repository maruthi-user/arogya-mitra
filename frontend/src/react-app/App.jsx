import React,{useEffect,useRef,useState,memo} from 'react';
import {useDispatch,useSelector} from 'react-redux';
import {useLocation,useSearch} from 'wouter';
import {configureLayout} from '@layout/config/registry';
import {LayoutProvider} from '@layout/shell/LayoutContext';
import {AppShell} from '@layout/shell/AppShell';
import {TooltipProvider} from '@layout/ui/tooltip';
import {Toaster} from '@layout/ui/toaster';
import {setUserData,logout} from '@layout/store/authSlice';
import {apiSlice} from '@layout/store/apiSlice';
import {startApplication} from '../app/bootstrap.js';
import {PUBLIC_SCREENS,parseRoute,routePath,homeScreen} from '../app/access-policy.js';
import {healthcareConfig} from './config';
const ManageAccount=React.lazy(()=>import('@layout/account/ManageAccount'));
const HealthcareLogin=React.lazy(()=>import('./Login'));
const LegacyHost=memo(function LegacyHost(){
 return <div id="legacy-root"><div id="app"/><div id="toast" role="status" hidden/><div id="listening" role="status" hidden><div className="mic-pulse">🎤</div><div id="listenText"/><button className="btn" data-a="cancelMic">Cancel / రద్దు</button></div></div>;
});
export const bridge={current:null};
configureLayout(healthcareConfig(bridge));

export class TemplateErrorBoundary extends React.Component {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){
  if(!this.state.failed)return this.props.children;
  const te=typeof document!=='undefined'&&document.documentElement.lang==='te';
  return <main className="mx-auto max-w-lg p-8" role="alert"><h1 className="text-xl font-semibold">{te?'పేజీ లోడ్ కాలేదు':'This page could not be loaded'}</h1><p className="my-4">{te?'కనెక్షన్‌ను పరిశీలించి పేజీని రిఫ్రెష్ చేయండి.':'Check the connection and refresh the page to try again.'}</p><button className="rounded bg-primary px-4 py-3 text-primary-foreground" onClick={()=>window.location.reload()}>{te?'రిఫ్రెష్ చేయండి':'Refresh page'}</button></main>;
 }
}
export function HealthcareApp(){
 const dispatch=useDispatch();
 const [location,navigate]=useLocation(),search=useSearch();
 const [snapshot,setSnapshot]=useState({screen:'roles',params:{},session:{role:'anonymous'},language:'te',connectionError:''});
 const [ready,setReady]=useState(false),[retrying,setRetrying]=useState(false),[expiredNotice,setExpiredNotice]=useState(false);
 const sessionExpired=useSelector(s=>s.auth.sessionExpired);
 const initialized=useRef(false),syncingRoute=useRef(false),identity=useRef('');
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
 useEffect(()=>{if(sessionExpired&&bridge.current){setExpiredNotice(bridge.current.state.session.role==='patient'?'guest':'account');bridge.current.expireSession();}},[sessionExpired]);
 async function retry(){setRetrying(true);try{await bridge.current?.reload();}catch{}finally{setRetrying(false);}}
 const te=snapshot.language==='te',login=snapshot.screen==='login';
 const chrome=!PUBLIC_SCREENS.has(snapshot.screen)&&snapshot.session.role!=='anonymous'&&!snapshot.session.mustChangePassword;
 const account=snapshot.screen==='account'&&['provider','admin'].includes(snapshot.session.role);
 return <LayoutProvider><TooltipProvider><AppShell chromeEnabled={chrome} workspaceRole={snapshot.session.role}>
  {!ready&&<p className="p-4 text-center" role="status">{te?'బ్యాకెండ్‌కు కనెక్ట్ అవుతోంది…':'Connecting to the backend…'}</p>}
  {expiredNotice&&!login&&<div className="m-3 rounded border border-amber-300 bg-amber-50 p-4 text-amber-950" role="alert">{expiredNotice==='guest'?(te?'మీ అతిథి సెషన్ గడువు ముగిసింది. కొనసాగడానికి కొత్త అతిథి సెషన్ ప్రారంభించండి. పాత అభ్యర్థనలను ప్రస్తుతం తిరిగి పొందలేరు.':'Your guest session has expired. Start a new guest session to continue. Previous requests cannot currently be recovered.'):(te?'మీ సెషన్ గడువు ముగిసింది. మళ్లీ ప్రవేశించండి.':'Your session has expired. Please sign in again.')}</div>}
  {snapshot.connectionError&&!login&&<div className="m-3 rounded border border-red-300 bg-red-50 p-4 text-red-950" role="alert"><p>{snapshot.connectionError}</p><button className="mt-2 rounded border px-4 py-2" disabled={retrying} onClick={retry}>{retrying?(te?'కనెక్ట్ అవుతోంది…':'Reconnecting…'):(te?'మళ్లీ ప్రయత్నించండి':'Retry connection')}</button></div>}
  <div className={account||login?'hidden':chrome?'p-3 sm:p-6':''}><LegacyHost/></div>
  <React.Suspense fallback={<p className="p-6" role="status">{te?'లోడ్ అవుతోంది…':'Loading…'}</p>}>
   {account&&<ManageAccount/>}
   {login&&<HealthcareLogin key={snapshot.params?.role||'provider'} bridge={bridge} role={snapshot.params?.role||'provider'} language={snapshot.language} connectionError={snapshot.connectionError} onRetry={retry} retrying={retrying}/>}
  </React.Suspense>
 </AppShell><Toaster/></TooltipProvider></LayoutProvider>;
}
