import { T, LANG } from '../../i18n/index.js';

import { Appointments } from '../../features/appointments/workflow.js';
import { Icon } from '../../components/ui/icon.js';
import { Avatar } from '../../components/ui/avatar.js';

export function createHomePage(ctx) {
  return function () {
    const { S, page, esc, villageName } = ctx;

    const name = S.settings.name ? ', ' + esc(S.settings.name) : '';
    return {
      voice: 'home',
      html: page(T.appName, `<section class="patient-welcome"><div><span class="eyebrow">CARE, WITHOUT THE COMPLICATIONS</span><h1>${T.greeting}${name}.</h1><p>${LANG==='te'?'మీ ఆరోగ్యం కోసం ఈరోజు ఏ సహాయం కావాలి?':'What can we help you with today?'}</p><span class="location-label">${esc(villageName(S.settings.village))}</span></div><button class="voice-orb" data-a="mic" aria-label="${T.speakProblem}">${Icon('mic')}<span>${LANG==='te'?'మాట్లాడండి':'Speak to search'}</span></button></section>
        <div class="service-grid">${[['provider','providers',T.needDoctor,'Find the right professional'],['calendar','bookings',T.myBookings,'Your visits, all in one place'],['medicine','meds',T.needMedicine,'Check local pharmacy stock'],['ambulance','emergency',LANG==='te'?'అత్యవసర సహాయం':'Emergency help','Direct access to emergency support']].map(([icon,screen,label,description])=>`<button class="service-card ${icon}" data-a="go" data-s="${screen}"><span class="service-icon">${Icon(icon)}</span><strong>${label}</strong><small>${description}</small><span class="service-arrow">${Icon('arrow')}</span></button>`).join('')}</div>
        <div class="patient-columns"><section class="panel"><div class="section-heading"><h2>${LANG==='te'?'మీ అపాయింట్‌మెంట్లు':'Your appointments'}</h2><button class="text-button" data-a="go" data-s="bookings">${LANG==='te'?'అన్నీ చూడండి':'View all'} →</button></div>${S.bookings.filter(b=>Appointments.active(b)).slice(0,3).map(b=>`<article class="schedule-item"><span class="schedule-time">${esc(b.time)}<small>${esc(b.date)}</small></span><div><strong>${esc(S.providers.find(p=>p.id===b.pid)?.name||'Healthcare provider')}</strong><p>${Appointments.label(b.status)}</p></div></article>`).join('')||`<div class="empty-illustration">${Icon('calendar')}<h3>${LANG==='te'?'మీ తదుపరి సందర్శన ఇక్కడ ప్రారంభమవుతుంది':'Your next visit starts here'}</h3><p>${LANG==='te'?'వైద్యులను కనుగొని సమయాన్ని ఎంచుకోండి.':'Choose a professional and request a time that works for you.'}</p><button class="btn accent" data-a="go" data-s="providers">${T.needDoctor}</button></div>`}</section>
        <section class="panel"><div class="section-heading"><h2>${LANG==='te'?'మీ ప్రాంతంలో వైద్య సేవలు':'Care in your community'}</h2><button class="text-button" data-a="go" data-s="providers">${LANG==='te'?'వెతకండి':'Browse'} →</button></div>${S.providers.slice(0,4).map(p=>`<button class="provider-preview" data-a="providerDetail" data-id="${esc(p.id)}">${Avatar(p.name)}<span><strong>${esc(p.name)}</strong><small>${esc(p.organization||p.type.toUpperCase())}</small></span><span class="availability-dot ${p.open?'is-open':''}"></span></button>`).join('')||`<p class="empty-state">${LANG==='te'?'మీ ప్రాంతంలో ప్రొవైడర్‌లు ఇంకా అందుబాటులో లేరు.':'No active providers are listed yet. New providers appear after approval and account activation.'}</p>`}</section></div>`)
    };
  
  };
}
