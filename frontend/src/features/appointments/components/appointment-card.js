import { LANG, T } from '../../../i18n/index.js';
import { Appointments } from '../workflow.js';
import { providerName } from '../../../data/provider-names.js';
import { Button } from '../../../components/ui/button.js';
import { escapeHtml } from '../../../utils/html.js';
export function renderAppointmentHistory(b) {
  return `<details><summary>${LANG==='te'?'స్థితి చరిత్ర':'Status history'}</summary>${(b.history||[]).map(h=>`<p class="fine">${Appointments.label(h.status)} · ${escapeHtml(new Date(h.at).toLocaleString(LANG==='te'?'te-IN':'en-IN',{timeZone:'Asia/Kolkata'}))}</p>`).join('')}</details>`;
}
export function renderAppointmentActions(b,providerView=false) {
  const l=(te,en)=>LANG==='te'?te:en;
  const button=(status,label)=>Button({label,action:'bookingStatus',attrs:{'data-id':b.id,'data-status':status}});
  let buttons='';
  if(providerView&&b.status==='pending')buttons=button('confirmed',l('ఆమోదించండి','Accept'))+button('declined',l('తిరస్కరించండి','Decline'));
  if(providerView&&b.status==='confirmed'&&new Date(b.date+'T'+b.time+'+05:30').getTime()<=Date.now())buttons=button('done',l('పూర్తయింది','Completed'))+button('no_show',l('హాజరు కాలేదు','No-show'));
  if(['pending','confirmed'].includes(b.status))buttons+=button('cancelled',T.cancel);
  return buttons;
}
export function createAppointmentCard({providerById,esc,dateLabel,fmtTime}) {
  const l=(te,en)=>LANG === 'te'?te:en;
  function appointment(b, providerView=false) {
    const p=providerById(b.pid);
    const buttons=renderAppointmentActions(b,providerView);
    return `<article class="card"><strong>${esc(providerView ? b.name : p ? providerName(p) : '')}</strong>
      <span class="badge info">${Appointments.label(b.status)}</span><p>${dateLabel(b.date)} · ${fmtTime(b.time)}</p>
      ${b.reason ? `<p>${esc(b.reason)}</p>` : ''}${providerView&&b.phone?`<a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>`:''}<div class="actions wrap">${buttons}</div>
      ${renderAppointmentHistory(b)}</article>`;
  }
return appointment;
}
