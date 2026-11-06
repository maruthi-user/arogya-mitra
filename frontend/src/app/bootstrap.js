import { legacyText } from '../i18n/legacy.js';
import {installRecordDetails,dismissRecordDetails} from '../components/data-display/record-details.js';
import {togglePasswordVisibility} from '../components/forms/password-visibility.js';
import {installTableTooltips,dismissTableTooltips} from '../components/data-display/table-tooltips.js';
import {setTableScope,resetDataTables,createTableActions} from '../components/data-display/table.js';
import { resolveScreen, homeScreen } from './access-policy.js';
import { T, LANG, applyLang } from '../i18n/index.js';
import { applyReferenceData } from '../services/reference-catalog.js';

import { Voice } from '../features/voice/speech-service.js';
import { Store } from '../storage/browser-store.js';
import { DataService } from '../services/data-service.js';
import { createRoleUI } from './role-workflows.js';
import { createRouter, initialScreen } from './router.js';
import { createAppState } from './state.js';
import { escapeHtml } from '../utils/html.js';
import { renderHeader } from '../components/navigation/header.js';
import { renderPageLayout } from '../layouts/page-layout.js';
import { createAccountWorkflows } from '../features/auth/workflows.js';
export function startApplication(options = {}) {
  let disposed=false;
  const subscriptions=[installTableTooltips(document),installRecordDetails(document)];
  function listen(target,event,handler,options){target.addEventListener(event,handler,options);subscriptions.push(()=>target.removeEventListener?.(event,handler,options));}


  const S = createAppState();
  let busy = false;
  let ready = true;

  function applySession(session) {
    if(S.session.role!==session.role||S.session.subjectId!==session.subjectId||S.session.accountId!==session.accountId){
      for(const key of ['providers','pharmacies','bookings','applications','notifications','audit','medicineRequests'])S[key]=[];
      resetDataTables();S.documentPanel=null;S.authRevision=(S.authRevision||0)+1;S.settings.name='';S.settings.phone='';
    }
    S.session=session;
    S.settings.role=['patient','provider','admin','verifier'].includes(session.role)?session.role:null;
    S.settings.patientId=session.role==='patient'?session.subjectId:null;
    S.settings.providerId=session.role==='provider'?session.subjectId:null;
    if(session.role==='patient'){
      S.settings.name=session.profile?.name==='Guest'?'':session.profile?.name||'';
      S.settings.village=session.profile?.village||'';S.settings.phone=session.profile?.phone||'';
    }else S.settings.name=session.name||'';
  }
  let refreshRevision=0;
  async function refresh() {
    const revision=++refreshRevision;
    try{
    const [references,session]=await Promise.all([DataService.referenceData(),DataService.session()]);
    if(disposed||revision!==refreshRevision)return;
    applyReferenceData(references);applySession(session);
    if(session.mustChangePassword){S.connectionError='';ready=true;return;}
    const aggregate=await DataService.load();if(disposed||revision!==refreshRevision)return;Object.assign(S,aggregate);
    S.connectionError='';ready=true;
    }catch(error){if(!disposed&&revision===refreshRevision){S.connectionError=[401,403].includes(error.status)?'':error.message;publish();}throw error;}
  }
  Voice.enabled = S.settings.voice;

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const listeningEl = document.getElementById('listening');

  let interacted = false;
  let currentVoice = null;
  let voiceStatus = '';
  const reactVoice = { providers:'providers', book:'book', settings:'settings', setup:'setup', symptoms:'symptoms', emergency:'emergency', bookings:'bookings' };

  function setLang(code) {
    applyLang(code);
    Voice.setLang(LANG);
    document.getElementById('listenText').textContent = T.listening;
  }
  setLang(S.settings.lang || 'te');

  const nav = { screen: initialScreen(S.settings), params: {}, stack: [] };
  const hash=window.location?.hash||'';
  if(hash.startsWith('#activate=')){S.activationToken=hash.slice(10);nav.screen='activate';window.history?.replaceState(null,'',window.location.pathname);}
  else if(['#provider-login','#admin-login','#verifier-login'].includes(hash)){nav.screen='login';nav.params={role:hash.slice(1,-6)};}

  function publish(){if(!disposed)options.onChange?.({session:S.session,screen:nav.screen,params:{...nav.params},language:LANG,connectionError:S.connectionError||''});}

  /* ---------- helpers ---------- */

  const esc = escapeHtml;
  function toast(msg, options = {}) {
    // The React workspace owns notification appearance; the standalone host
    // keeps its text fallback when no bridge is mounted.
    if (typeof window.CustomEvent === 'function') {
      const event = new window.CustomEvent('arogya-notification', {
        cancelable: true,
        detail: { description: String(msg), variant: options.variant || 'success' },
      });
      if (!document.dispatchEvent(event)) return;
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }

  /* ---------- navigation ---------- */

  const router = createRouter(nav, () => { Voice.stop(); }, () => render());
  const { go, resetTo } = router;

  /* ---------- shared UI pieces ---------- */

  function header(title) { return renderHeader({ title, canGoBack: nav.stack.length > 0, role: S.settings.role, name:S.session.role==='patient'?S.settings.name||'Guest':S.session.name }); }

  function navbar() { return roleUI.navbar(nav.screen); }

  function page(title, body) { if(options.embedded)return '<div class="healthcare-page"><div class="section-heading"><h1>'+esc(title)+'</h1>'+'</div>'+body+'</div>';return renderPageLayout({ title, body, header: header(title), navigation: navbar(), mode: DataService.mode }); }


  /* ---------- screens: each returns { html, voice, after } ---------- */

  const screens = {};

  /* ---------- render ---------- */

  function render(speak) {
    dismissRecordDetails();
    dismissTableTooltips();
    if(disposed)return;
    const businessType=S.providers.find(p=>p.id===S.settings.providerId)?.businessType;
    const destination=resolveScreen(nav.screen,S.session,businessType);
    if(destination.screen!==nav.screen){nav.screen=destination.screen;nav.params=destination.params||{};nav.stack=[];}
    if(!screens[nav.screen]){nav.screen='notFound';nav.params={};}
    setTableScope([S.session.role,S.session.subjectId||'',S.authRevision||0,nav.screen].join(':'));
    const r = screens[nav.screen](nav.params);
    app.innerHTML = r.html;
    app.dataset.screen = nav.screen;
    app.dataset.role = ['roles','login','register','activate','requestSetup','applicationSubmitted'].includes(nav.screen)?'public':S.settings.role||'public';
    window.scrollTo(0, 0);
    currentVoice = r.voice || (nav.screen === 'meds' ? (nav.params.med ? 'medResults' : 'meds') : reactVoice[nav.screen]) || null;
    publish();
    if (r.after) r.after();
    if (speak !== false && interacted && currentVoice) Voice.say(currentVoice);
  }

  /* ---------- voice search ---------- */


  function startMic() {
    go('command');
    recordCommand();
  }

  function recordCommand() {
    if (!Voice.canListen()) { toast(T.noMic); return; }
    Voice.listen(text => {
      if (nav.screen !== 'command') return;
      nav.params.text = text;
      render(false);
    }, st => {
      voiceStatus = st;
      listeningEl.hidden = st !== 'listening';
      document.dispatchEvent(new CustomEvent('arogya-voice-state',{detail:st}));
      if (st === 'error') toast(T.micError);
      if (st === 'unsupported') toast(T.noMic);
    });
  }

  /* ---------- actions ---------- */

  const actions = {
    togglePassword:(d,el)=>togglePasswordVisibility(d.target,el),
    toggleLanguage:()=>{setLang(legacyText('te_aaa47c'));S.settings.lang=LANG;Store.save();render(false);},
    openSearch:()=>go('search',{query:''}),
    go: d => go(d.s),
    home: () => resetTo(homeScreen(S.session.role)),
    help: () => go('intro'),
    mic: startMic,
    recordCommand,
    cancelMic: () => { Voice.stop(); listeningEl.hidden = true; },
    emergency: () => go('emergency'),
    retry: async () => { await refresh(); render(false); },

  };

  /* ---------- events ---------- */

  listen(document,'pointerdown', () => { interacted = true; }, { once: true });

  async function dispatch(el) {
    interacted = true;
    const fn = actions[el.dataset.a];
    // Emergency access and microphone cancellation must remain available during requests.
    if (fn && ['emergency', 'cancelMic'].includes(el.dataset.a)) { fn(el.dataset, el); return; }
    if (!fn || busy || (!ready && !['retry', 'emergency'].includes(el.dataset.a))) return;
    busy = true;
    app.setAttribute('aria-busy', 'true');
    try {
      if (DataService.mode === 'api' && ['go', 'home', 'openSearch'].includes(el.dataset.a)) await refresh();
      await fn(el.dataset, el);
    }
    catch (error) {
      toast(error.message||'Request failed. Please try again.', { variant: 'destructive' });
      if(error.status===401){applySession({role:'anonymous'});resetTo('roles');}
      if (error.status === 409) { try { await refresh(); render(false); } catch (_) {} }
    } finally { busy = false; app.removeAttribute('aria-busy'); }
  }
  listen(document,'arogya-action',e=>{if(actions[e.detail])void dispatch({dataset:{a:e.detail}});});
  listen(document,'click',e=>{const el=e.target.closest('[data-a]');if(el)return dispatch(el);});
  listen(document,'submit',e=>{const action=e.target.dataset.formAction;if(action){e.preventDefault();return dispatch({dataset:{...e.target.dataset,a:action}});}});

  listen(document,'change', e => {
    if(e.target.hasAttribute?.('data-table-sort'))return dispatch({dataset:{a:'tableSortSelect',table:e.target.dataset.table,value:e.target.value}});
    if(e.target.hasAttribute?.('data-table-size'))return dispatch({dataset:{a:'tableSize',table:e.target.dataset.table,value:e.target.value}});

  });

  Object.assign(actions,createTableActions(render));
  screens.dash=()=>screens.careDashboard();
  screens.adminHome=()=>screens.careDashboard();
  screens.account=()=>({voice:null,html:''});
  screens.accessDenied=()=>({voice:null,html:page(legacyText('access_denied_f040a5'),'<section class="panel" role="alert"><p>'+(legacyText('your_role_does_not_have_access_to_this_page_c04e2b'))+'</p><button class="btn accent" data-a="home">'+(legacyText('go_to_my_home_2018f0'))+'</button></section>')});
  screens.notFound=()=>({voice:null,html:page(legacyText('page_not_found_a67610'),'<section class="panel"><p>'+(legacyText('this_page_is_unavailable_check_the_link_or_return__b7237c'))+'</p><button class="btn accent" data-a="home">'+(legacyText('home_e8f373'))+'</button></section>')});
  const roleUI = createRoleUI({S,go,resetTo,refresh,render});
  Object.assign(screens,roleUI.screens);
  Object.assign(actions,roleUI.actions);
  const accountUI=createAccountWorkflows({S,page,go,resetTo,refresh,render,toast,applySession});
  Object.assign(screens,accountUI.screens);Object.assign(actions,accountUI.actions);screens.adminPendingProviders=()=>screens.adminApplications();
  // React pages (react-app/pages.jsx): the legacy host renders nothing for them.
  for(const id of ['businessReviews','careOrgs','careDashboard','careManage','careStaffManage','businessProfile','providerNotifications','providerBookings','schedule','providerProfile'])screens[id]=()=>({voice:null,html:''});
  for(const id of ['home','careCatalog','careConfirm','careRequest','careHistory','patientPractitioners','patientHospitals','patientLabs','patientClinics','patientPharmacies','patientAmbulance','bookings','providerDetail','book','confirmed','meds','medicineRequests','symptoms','providers','search','settings','setup','emergency','lang','intro','command'])screens[id]=()=>({voice:null,html:''});

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => { if (nav.screen === 'settings') render(false); };
  }

  render(false);
  const initialized=refresh().then(()=>render(false)).catch(error=>{S.connectionError=error.message;render(false);});
  return { state:S,navigation:nav,initialized,go,resetTo,refresh,startMic,recordCommand,voiceStatus:()=>voiceStatus,preferences:patch=>{Object.assign(S.settings,patch);if(patch.lang)setLang(patch.lang);if(patch.voice!==undefined){Voice.enabled=patch.voice;if(!patch.voice)Voice.stop();}Store.save();publish();},reload:async()=>{await refresh();render(false);},expireSession:()=>{refreshRevision++;S.activationToken=null;S.applicationReceipt=null;applySession({role:'anonymous'});resetTo('roles');},destroy(){dismissRecordDetails();resetDataTables();disposed=true;Voice.stop();clearTimeout(toast.t);for(const unsubscribe of subscriptions)unsubscribe();if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=null;} };
}
