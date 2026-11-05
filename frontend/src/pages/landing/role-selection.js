import { LANG } from '../../i18n/index.js';
import { Brand } from '../../components/ui/brand.js';

const artwork = {
  patient: '<circle cx="32" cy="19" r="10"/><path d="M12 57v-7c0-12 9-18 20-18 8 0 14 3 18 9"/><path d="M42 44c-7-7-16 4 0 14 16-10 7-21 0-14Z" fill="#ffb51b" stroke="#fff" stroke-width="2"/>',
  provider: '<path d="M9 58V25l16-6V8h19v11l13 6v33H9Z" fill="#fffdf4"/><path d="M26 58V42h14v16M5 26l20-7m19 0 17 7"/><path d="M34 14v14m-7-7h14" stroke="#f5a817" stroke-width="5"/><path d="M17 34h4m24 0h4" stroke="#62bfa7" stroke-width="5"/>',
  admin: '<path d="M32 5c8 6 17 8 24 9v18c0 15-15 24-24 28C23 56 8 47 8 32V14c7-1 16-3 24-9Z" fill="#f8fffd"/><path d="M32 24v19m-9-9h18" stroke="#07996b" stroke-width="7"/>'
};
const roleArt = role => `<span class="entry-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${artwork[role]}</svg></span>`;

export function createRoleSelectionPage({S}) {
  return () => {
    const l = (te,en) => LANG === 'te' ? te : en;
    const roles = [
      {id:'patient', title:l('రోగి','Patient'), description:l('సేవలను కనుగొనండి. బుక్ చేసుకోండి.','Find care. Book services.'), tags:[l('ఇంటి సందర్శనలు','Home visits'),l('ఆసుపత్రి ఓపీ','Hospital OP'),l('మందులు','Medicines'),l('ల్యాబ్ పరీక్షలు','Lab tests')], action:l('రోగిగా కొనసాగండి','Continue as Patient')},
      {id:'provider', title:l('సేవాదారు','Provider'), description:l('సేవలు అందించండి. అభ్యర్థనలు నిర్వహించండి.','Offer care. Manage requests.'), tags:[l('క్లినిక్‌లు & ఆసుపత్రులు','Clinics & hospitals'),l('ఫార్మసీలు','Pharmacies'),l('ల్యాబ్‌లు & అంబులెన్స్‌లు','Labs & ambulances')], action:l('సేవాదారు ప్రవేశం','Provider sign in')},
      {id:'admin', title:l('నిర్వాహకుడు','Admin'), description:l('సేవాదారుల సమీక్ష. సేవల నిర్వహణ.','Review providers. Manage operations.'), action:l('నిర్వాహక ప్రవేశం','Admin sign in')}
    ];
    return {voice:null, html:`<div class="care-entry">
      <header class="entry-header"><div class="entry-header-inner">${Brand()}<button class="entry-language" data-a="toggleLanguage" aria-label="${l('Switch to English','తెలుగులోకి మార్చండి')}"><span class="${LANG==='en'?'selected':''}" lang="en"><span class="language-full">English</span><span class="language-short">EN</span></span><span class="language-divider" aria-hidden="true"></span><span class="${LANG==='te'?'selected':''}" lang="te">తెలుగు</span></button></div></header>
      <main class="entry-main">
        ${S.connectionError?`<div class="inline-note" role="alert">${l('సేవలకు కనెక్ట్ కాలేదు. మళ్లీ ప్రయత్నించండి.','Unable to connect to services. Please try again.')} <button class="text-button" data-a="retry">${l('మళ్లీ ప్రయత్నించండి','Retry connection')}</button></div>`:''}
        <section class="entry-intro" aria-labelledby="entry-heading"><h1 id="entry-heading">${l('సంరక్షణ ఇక్కడే మొదలు.','Care starts <span>here.</span>')}</h1><p>${l('మీరు ఎలా కొనసాగాలనుకుంటున్నారో ఎంచుకోండి','Choose how you want to continue')}</p></section>
        <section class="entry-grid" aria-label="${l('మీ పాత్రను ఎంచుకోండి','Choose your role')}">${roles.map(role=>`<article class="entry-card entry-${role.id}" aria-labelledby="entry-${role.id}">${roleArt(role.id)}<div class="entry-card-body"><h2 id="entry-${role.id}">${role.title}</h2><p class="entry-description">${role.description}</p>${role.tags?`<div class="entry-tags">${role.tags.map(tag=>`<span>${tag}</span>`).join('')}</div>`:`<p class="entry-admin-details">${l('దరఖాస్తులు మరియు ఆమోదాలు','Applications and approvals')}<br>${l('ప్లాట్‌ఫారమ్ నిర్వహణ','Platform management')}</p>`}<div class="entry-actions"><button class="entry-button" data-a="chooseRole" data-role="${role.id}">${role.action}</button>${role.id==='patient'?`<button class="entry-register" data-a="go" data-s="patientRegister">${l('\u0c28\u0c2e\u0c4b\u0c26\u0c41','Create patient account')}</button>`:role.id==='provider'?`<button class="entry-register" data-a="go" data-s="register">${l('మీ సేవను నమోదు చేయండి','Register your service')}</button>`:''}</div></div></article>`).join('')}</section>
        <footer class="entry-footer"><a class="entry-emergency" href="tel:108"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 2.8c.6-.3 1.3-.1 1.6.5l2 4c.3.5.2 1.1-.2 1.5l-1.7 1.7a15 15 0 0 0 5.2 5.2l1.7-1.7c.4-.4 1-.5 1.5-.2l4 2c.6.3.8 1 .5 1.6l-1.4 3c-.3.7-1 1.1-1.8 1C9.7 20.5 3.5 14.3 2.6 6c-.1-.8.3-1.5 1-1.8l3-1.4Z"/></svg>${l('అత్యవసర సహాయం','Emergency help')}</a><p>${l('గ్రామాలను సమీప వైద్య సేవలతో కలుపుతూ','Connecting villages with nearby care')}</p></footer>
      </main><div class="entry-waves" aria-hidden="true"></div></div>`};
  };
}
