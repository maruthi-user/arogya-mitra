import { createBookingAction } from '../features/appointments/booking-actions.js';
import { T, LANG, TOUR, lbl, applyLang } from '../i18n/index.js';
import { VILLAGES, MEDICINES } from '../data/reference-data.js';

import { Appointments } from '../features/appointments/workflow.js';
import { Voice } from '../features/voice/speech-service.js';
import { Store } from '../storage/browser-store.js';
import { DataService } from '../services/data-service.js';
import { createRoleUI } from './role-workflows.js';
import { createRouter, initialScreen } from './router.js';
import { createAppState } from './state.js';
import { escapeHtml } from '../utils/html.js';
import { renderHeader } from '../components/navigation/header.js';
import { renderPageLayout } from '../layouts/page-layout.js';
import { createProviderCard } from '../features/providers/components/provider-card.js';
import { routeVoiceCommand } from '../features/voice/command-router.js';
import { createVoiceRequestPage } from '../pages/shared/voice-request.js';
import { createIntroTourPage } from '../pages/shared/intro-tour.js';
import { createLanguagePage } from '../pages/shared/language.js';
import { createVillageSetupPage } from '../pages/patient/village-setup.js';
import { createHomePage } from '../pages/patient/home.js';
import { createSymptomsPage } from '../pages/patient/symptoms.js';
import { createProviderSearchPage } from '../pages/patient/provider-search.js';
import { createBookAppointmentPage } from '../pages/patient/book-appointment.js';
import { createRequestSubmittedPage } from '../pages/patient/request-submitted.js';
import { createMedicinesPage } from '../pages/patient/medicines.js';
import { createEmergencyPage } from '../pages/shared/emergency.js';
import { createSettingsPage } from '../pages/shared/settings.js';
import { createGlobalSearchPage } from '../pages/shared/global-search.js';
import { ConfirmDialog } from '../components/feedback/dialog.js';
import { createAccountWorkflows } from '../features/auth/workflows.js';
export function startApplication() {

  const S = createAppState();
  let busy = false;
  let ready = true;
  function applySession(session) {
    S.session=session;
    S.settings.role=['patient','provider','admin'].includes(session.role)?session.role:null;
    S.settings.patientId=session.role==='patient'?session.subjectId:null;
    S.settings.providerId=session.role==='provider'?session.subjectId:null;
    if(session.role==='patient'){
      S.settings.name=session.profile?.name==='Guest'?'':session.profile?.name||'';
      S.settings.village=session.profile?.village||'rama';S.settings.phone=session.profile?.phone||'';
    }else S.settings.name=session.name||'';
  }
  async function refresh() {
    applySession(await DataService.session());Object.assign(S,await DataService.load());
    if(S.session.role==='admin'){
      const [applications,notifications,audit,requests]=await Promise.all([DataService.applications(),DataService.notifications(),DataService.audit(),DataService.medicineRequests()]);
      Object.assign(S,{applications,notifications,audit,medicineRequests:requests});
    }else {S.applications=[];S.notifications=[];S.audit=[];S.medicineRequests=S.session.role==='patient'?await DataService.medicineRequests():[];}
    S.connectionError='';ready=true;
  }
  Voice.enabled = S.settings.voice;

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const listeningEl = document.getElementById('listening');

  let interacted = false;
  let currentVoice = null;
  let tourToken = 0;
  let introStep = 0;

  function setLang(code) {
    applyLang(code);
    Voice.setLang(LANG);
    document.getElementById('listenText').textContent = T.listening;
  }
  setLang(S.settings.lang || 'te');

  const nav = { screen: initialScreen(S.settings), params: {}, stack: [] };
  const hash=window.location?.hash||'';
  if(hash.startsWith('#activate=')){S.activationToken=hash.slice(10);nav.screen='activate';window.history?.replaceState(null,'',window.location.pathname);}
  else if(hash==='#provider-login'||hash==='#admin-login'){nav.screen='login';nav.params={role:hash==='#admin-login'?'admin':'provider'};}

  /* ---------- helpers ---------- */

  const esc = escapeHtml;
  const villageName = id => { const v = VILLAGES.find(x => x.id === id); return v ? lbl(v) : ''; };
  const medById = id => MEDICINES.find(m => m.id === id);
  const providerById = id => S.providers.find(p => p.id === id);
  const pharmacyById = id => S.pharmacies.find(p => p.id === id);
  const distTo = village => S.settings.village === village ? 0 : 1;

  function distLabel(proximity) { return LANG==='te'?(proximity===0?'మీ గ్రామంలో':'వేరే గ్రామంలో'):(proximity===0?'In your village':'Other village'); }

  function fmtTime(t) {
    const [h, m] = t.split(':').map(Number);
    if (LANG === 'en') return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
    const period = h < 12 ? T.morning : h < 16 ? T.noon : T.evening;
    return period + ' ' + (h % 12 || 12) + ':' + String(m).padStart(2, '0');
  }

  function isoDate(offset) {
    return Appointments.date(offset);
  }

  function dateLabel(iso) {
    if (iso === isoDate(0)) return T.today;
    if (iso === isoDate(1)) return T.tomorrow;
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }

  function typeBadge(type) {
    const map = { mbbs: ['info', 'MBBS'], rmp: ['warn', 'RMP'], ayush: ['info', T.ayush] };
    const [cls, label] = map[type] || ['info', ''];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  /* ---------- navigation ---------- */

  const router = createRouter(nav, () => { Voice.stop(); tourToken++; }, () => render());
  const { go, goBack, resetTo } = router;

  /* ---------- shared UI pieces ---------- */

  function header(title) { return renderHeader({ title, canGoBack: nav.stack.length > 0, role: S.settings.role, name:S.session.role==='patient'?S.settings.name||'Guest':S.session.name }); }

  function navbar() { return roleUI.navbar(nav.screen); }

  function page(title, body) { return renderPageLayout({ title, body, header: header(title), navigation: navbar(), mode: DataService.mode }); }
  const providerCard = createProviderCard({ distTo, distLabel, villageName, typeBadge });

  /* ---------- screens: each returns { html, voice, after } ---------- */

  const screens = {};

  /* ---------- render ---------- */

  function render(speak) {
    if (['dash','providerBookings','schedule','providerProfile'].includes(nav.screen) && S.session.role !== 'provider') {nav.screen='login';nav.params={role:'provider'};nav.stack=[];}
    if(nav.screen.startsWith('admin')&&S.session.role!=='admin'){nav.screen='login';nav.params={role:'admin'};nav.stack=[];}
    if(['home','symptoms','providers','book','bookings','confirmed','meds','command','providerDetail','search','medicineRequests'].includes(nav.screen)&&S.session.role!=='patient'){nav.screen='roles';nav.stack=[];}
    const r = screens[nav.screen](nav.params);
    app.innerHTML = r.html;
    app.dataset.screen = nav.screen;
    app.dataset.role = ['roles','login','register','activate','requestSetup','applicationSubmitted'].includes(nav.screen)?'public':S.settings.role||'public';
    window.scrollTo(0, 0);
    currentVoice = r.voice;
    if (r.after) r.after();
    if (speak !== false && interacted && r.voice) Voice.say(r.voice);
  }

  /* ---------- intro tour ---------- */

  function showStep(i) {
    introStep = i;
    const last = i === TOUR.length - 1;
    const icon = document.getElementById('tourIcon');
    if (!icon) return;
    icon.textContent = TOUR[i].icon;
    document.getElementById('tourText').textContent = TOUR[i].text;
    document.getElementById('dots').innerHTML = TOUR.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    document.getElementById('introNext').textContent = last ? T.start : T.next;
  }

  async function playTour() {
    const token = ++tourToken;
    Voice.stop();
    if (introStep === 0) await Voice.say('intro');
    for (let i = introStep; i < TOUR.length; i++) {
      if (token !== tourToken) return;
      showStep(i);
      await Voice.say(TOUR[i].voice);
      await new Promise(r => setTimeout(r, 600));
    }
    if (token === tourToken) finishIntro();
  }

  function finishIntro() {
    const replay = nav.stack.length > 0;
    S.settings.introSeen = true;
    Store.save();
    introStep = 0;
    if (replay) goBack();
    else resetTo(S.settings.village ? 'home' : 'setup');
  }

  /* ---------- voice search ---------- */

  function handleVoice(text) { routeVoiceCommand(text, go, () => toast(T.notUnderstood)); }

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
      listeningEl.hidden = st !== 'listening';
      if (st === 'error') toast(T.micError);
      if (st === 'unsupported') toast(T.noMic);
    });
  }

  /* ---------- bookings ---------- */

  const createBooking = createBookingAction({state:S,navigation:nav,refresh,render,toast});

  /* ---------- actions ---------- */

  const actions = {
    toggleLanguage:()=>{setLang(LANG==='te'?'en':'te');S.settings.lang=LANG;Store.save();render(false);},
    openSearch:()=>go('search',{query:''}),
    globalSearch:()=>{nav.params.query=document.getElementById('globalSearch').value;render(false);},
    searchMedicine:d=>go('meds',{med:d.id}),
    filterProviders:()=>{
      Object.assign(nav.params,{query:document.getElementById('providerSearch').value,type:document.getElementById('providerType').value,
        open:document.getElementById('providerOpen').value==='open',sort:document.getElementById('providerSort').value,page:1});render(false);
    },
    providerPage:d=>{nav.params.page=Number(d.page);render(false);},
    go: d => go(d.s),
    home: () => resetTo(S.settings.role === 'admin'?'adminHome':S.settings.role === 'provider' ? 'dash' : 'home'),
    setLang: d => {
      S.settings.lang = d.id;
      Store.save();
      setLang(d.id);
      if (nav.stack.length) goBack();
      else resetTo('roles');
    },
    back: goBack,
    help: () => { introStep = 0; go('intro'); },
    speak: () => { if (currentVoice) Voice.say(currentVoice); else if (nav.screen === 'intro') playTour(); },
    mic: startMic,
    recordCommand,
    cancelMic: () => { Voice.stop(); listeningEl.hidden = true; },
    submitCommand: () => {
      const text = document.getElementById('commandInput').value.trim();
      nav.params.text = text;
      if (text) handleVoice(text); else toast(T.notUnderstood);
    },
    emergency: () => go('emergency'),
    symptom: d => go('providers', { symptom: d.id }),
    pickVillage: d => { S.settings.village = d.id; Store.save(); render(false); },
    setupDone: () => {
      if (!S.settings.village) { toast(T.chooseVillage); return; }
      resetTo('home');
    },
    setVillage: async d => { S.settings.village = d.id;Store.save();if(S.session.role==='patient')await DataService.patientProfile(S.settings.patientId,{village:d.id});render(false); },
    book: async d => {const availability=await DataService.slots(d.id,Appointments.date(0));go('book',{pid:d.id,day:0,time:null,availability});},
    day: async d => {
      Object.assign(nav.params,{reason:document.getElementById('bookingReason').value,contactName:document.getElementById('bookingPatientName').value,contactPhone:document.getElementById('bookingPatientPhone').value,day:Number(d.d),time:null});
      nav.params.availability=await DataService.slots(nav.params.pid,Appointments.date(nav.params.day));render(false);
    },
    slot: d => {Object.assign(nav.params,{reason:document.getElementById('bookingReason').value,contactName:document.getElementById('bookingPatientName').value,contactPhone:document.getElementById('bookingPatientPhone').value,time:d.t});render(false);},
    slotTaken: () => toast(T.slotTaken),
    confirm: createBooking,
    cancelBk: async d => { await DataService.status(d.id, 'cancelled', roleUI.actor()); await refresh(); render(false); },
    doneBk: async d => { await DataService.status(d.id, 'done', roleUI.actor()); await refresh(); render(false); },
    retry: async () => { await refresh(); render(false); },
    med: d => { nav.params = { med: d.id }; render(); },
    clearMed: () => { nav.params = {}; render(); },
    toggleVoice: () => {
      S.settings.voice = !S.settings.voice;
      Voice.enabled = S.settings.voice;
      if (!Voice.enabled) Voice.stop();
      Store.save();
      render(false);
    },
    toggleOpen: async () => {
      const ent = providerById(S.settings.providerId) || pharmacyById(S.settings.providerId);
      if (ent) { await DataService.open(ent.id, !ent.open); await refresh(); render(false); }
    },
    toggleStock: async d => {
      const shop = pharmacyById(S.settings.providerId);
      if (shop) { await DataService.stock(shop.id, d.id, !shop.stock[d.id]); await refresh(); render(false); }
    },
    resetData: () => ConfirmDialog({title:T.resetData,message:T.resetConfirm,confirmLabel:T.confirm,cancelLabel:T.cancel,onConfirm:() => {
      const clean = Store.reset();
      S.settings.lang=clean.settings.lang;S.settings.voice=true;
      Voice.enabled = true;
      introStep = 0;
      setLang('te');
      resetTo('lang');
    }}),
    introPlay: () => { void playTour(); },
    introNext: () => {
      tourToken++;
      Voice.stop();
      if (introStep >= TOUR.length - 1) { finishIntro(); return; }
      showStep(introStep + 1);
      Voice.say(TOUR[introStep].voice);
    },
    introSkip: finishIntro
  };

  /* ---------- events ---------- */

  document.addEventListener('pointerdown', () => { interacted = true; }, { once: true });

  async function dispatch(el) {
    interacted = true;
    const fn = actions[el.dataset.a];
    // Emergency access and microphone cancellation must remain available during requests.
    if (fn && ['emergency', 'cancelMic'].includes(el.dataset.a)) { fn(el.dataset, el); return; }
    if (!fn || busy || (!ready && !['retry', 'emergency', 'back', 'speak'].includes(el.dataset.a))) return;
    busy = true;
    app.setAttribute('aria-busy', 'true');
    try {
      if (DataService.mode === 'api' && ['go', 'book', 'dash', 'symptom', 'med', 'home', 'submitCommand', 'providerDetail','openSearch'].includes(el.dataset.a)) await refresh();
      await fn(el.dataset, el);
    }
    catch (error) {
      toast(error.message||'Request failed. Please try again.');
      if(error.status===401){applySession({role:'anonymous'});resetTo('roles');}
      if (error.status === 409) { try { await refresh(); render(false); } catch (_) {} }
    } finally { busy = false; app.removeAttribute('aria-busy'); }
  }
  document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(el)return dispatch(el);});
  document.addEventListener('submit',e=>{const action=e.target.dataset.formAction;if(action){e.preventDefault();return dispatch({dataset:{a:action}});}});

  document.addEventListener('change', e => {
    if (e.target.id === 'nameInput') {
      S.settings.name = e.target.value.trim();
      Store.save();
    }
  });

  const pageContext = { S,page,header,esc,villageName,medById,providerById,pharmacyById,distTo,distLabel,typeBadge,fmtTime,isoDate,dateLabel,providerCard,finishIntro, get introStep() { return introStep; } };
  screens.command = createVoiceRequestPage(pageContext);
  screens.intro = createIntroTourPage(pageContext);
  screens.lang = createLanguagePage(pageContext);
  screens.setup = createVillageSetupPage(pageContext);
  screens.home = createHomePage(pageContext);
  screens.symptoms = createSymptomsPage(pageContext);
  screens.providers = createProviderSearchPage(pageContext);
  screens.book = createBookAppointmentPage(pageContext);
  screens.confirmed = createRequestSubmittedPage(pageContext);
  screens.meds = createMedicinesPage(pageContext);
  screens.emergency = createEmergencyPage(pageContext);
  screens.settings = createSettingsPage(pageContext);
  screens.search = createGlobalSearchPage(pageContext);
  const roleUI = createRoleUI({S,page,esc,providerById,typeBadge,dateLabel,fmtTime,isoDate,go,resetTo,refresh,render,toast});
  Object.assign(screens,roleUI.screens);
  Object.assign(actions,roleUI.actions);
  const accountUI=createAccountWorkflows({S,page,go,resetTo,refresh,render,toast,applySession});
  Object.assign(screens,accountUI.screens);Object.assign(actions,accountUI.actions);

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => { if (nav.screen === 'settings') render(false); };
  }

  render(false);
  const initialized=refresh().then(()=>render(false)).catch(error=>{S.connectionError=error.message;render(false);});
  return { state:S,navigation:nav,initialized };
}
