import {T,LANG} from '../../i18n/index.js';
import {Appointments} from '../../features/appointments/workflow.js';
import {Icon} from '../../components/ui/icon.js';
import {appointmentRecords,providerRecords} from '../../components/data-display/record-tables.js';
export function createHomePage({S,page,esc,villageName,providerCard}){
 return ()=>{
  const l=(te,en)=>LANG==='te'?te:en;
  const name=S.settings.name?', '+esc(S.settings.name):'';
  return {voice:'home',html:page(T.appName,`<section class="patient-welcome"><div><span class="eyebrow">CARE, WITHOUT THE COMPLICATIONS</span><h1>${T.greeting}${name}.</h1><p>${l('మీ ఆరోగ్యం కోసం ఈరోజు ఏ సహాయం కావాలి?','What can we help you with today?')}</p><span class="location-label">${esc(villageName(S.settings.village))}</span></div><button class="voice-orb" data-a="mic" aria-label="${T.speakProblem}">${Icon('mic')}<span>${l('మాట్లాడండి','Speak to search')}</span></button></section>
  <section class="panel"><h2>${l('మీ గ్రామం మరియు పట్టణంలో సేవలు','Services for your village and town')}</h2><p>${l('ఇంటి సందర్శనలు, OP, మందుల డెలివరీ, ల్యాబ్ పరీక్షలు, ఆరోగ్య పరీక్షలు మరియు అంబులెన్స్ సహాయం.','Home visits, OP, medicines and delivery, lab tests, check-ups and ambulance assistance.')}</p><button class="btn accent" data-a="go" data-s="careCatalog">${l('అన్ని సేవలు చూడండి','Explore all services')}</button></section>
  <div class="service-grid">${[['provider','providers',T.needDoctor,l('సేవాదారును కనుగొనండి','Find the right professional')],['calendar','bookings',T.myBookings,l('మీ సందర్శనలు ఒకేచోట','Your visits, all in one place')],['medicine','meds',T.needMedicine,l('ఫార్మసీ స్టాక్ చూడండి','Check local pharmacy stock')],['ambulance','emergency',l('అత్యవసర సహాయం','Emergency help'),l('అత్యవసర సహాయాన్ని పొందండి','Direct access to emergency support')]].map(([icon,screen,label,description])=>`<button class="service-card ${icon}" data-a="go" data-s="${screen}"><span class="service-icon">${Icon(icon)}</span><strong>${label}</strong><small>${description}</small><span class="service-arrow">${Icon('arrow')}</span></button>`).join('')}</div>
  <section class="panel"><div class="section-heading"><h2>${l('మీ అపాయింట్‌మెంట్లు','Your appointments')}</h2><button class="text-button" data-a="go" data-s="bookings">${l('అన్నీ చూడండి','View all')} →</button></div>${appointmentRecords(S.bookings.filter(b=>b.patientId===S.settings.patientId&&Appointments.active(b)),{id:'patient-upcoming',providerById:id=>S.providers.find(p=>p.id===id)})}</section>
  <section class="panel"><div class="section-heading"><h2>${l('మీ ప్రాంతంలో వైద్య సేవలు','Care in your community')}</h2><button class="text-button" data-a="go" data-s="providers">${l('వెతకండి','Browse')} →</button></div>${providerRecords(S.providers,providerCard)}</section>`)};
 };
}
