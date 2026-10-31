import { T, LANG } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';
import { Appointments } from '../../features/appointments/workflow.js';
import { Input } from '../../components/forms/field.js';

export function createBookAppointmentPage(ctx) {
  return function (p) {
    const { S, page, esc, villageName, providerById, distTo, distLabel, typeBadge, fmtTime, isoDate } = ctx;

    const prov = providerById(p.pid);
    const day = p.day ?? 0;
    const date = isoDate(day);
    const nowHm = Appointments.time();
    const slots = (p.availability?.slots||[]).map(slot=>slot.time);
    const taken = t => !p.availability.slots.find(slot=>slot.time===t)?.available;
    return {
      voice: 'book',
      html: page(T.chooseTime, `
        <article class="card"><div class="card-head"><strong>${esc(providerName(prov))}</strong>${typeBadge(prov.type)}</div>
          <div class="meta">📍 ${distLabel(distTo(prov.village))} · ${esc(villageName(prov.village))}</div></article>
        <div class="seg">
          <button class="${day === 0 ? 'sel' : ''}" data-a="day" data-d="0">${T.today}</button>
          <button class="${day === 1 ? 'sel' : ''}" data-a="day" data-d="1">${T.tomorrow}</button>
        </div>
        ${slots.length ? `<div class="grid2">${slots.map(t => taken(t)
          ? `<button class="slot taken" data-a="slotTaken">${fmtTime(t)}</button>`
          : `<button class="slot ${p.time === t ? 'sel' : ''}" data-a="slot" data-t="${t}">${fmtTime(t)}</button>`).join('')}</div>`
          : `<p class="muted">${T.noSlots}</p>`}
        <div class="form-grid">${Input({id:'bookingPatientName',label:LANG==='te'?'మీ పేరు':'Your name',value:p.contactName??S.settings.name,attrs:{required:true,maxlength:40,autocomplete:'name'}})}${Input({id:'bookingPatientPhone',label:LANG==='te'?'ఫోన్ నంబర్':'Contact phone',type:'tel',value:p.contactPhone??S.settings.phone??'',attrs:{required:true,pattern:'(\\+91)?[6-9][0-9]{9}',autocomplete:'tel'}})}</div>
        <label class="field">${LANG === 'te' ? 'కారణం (ఐచ్ఛికం)' : 'Reason for visit (optional)'}<input id="bookingReason" maxlength="300" value="${esc(p.reason || '')}"></label>
        <p class="fine">${LANG === 'te' ? 'ప్రొవైడర్ ఆమోదం అవసరం. అభ్యర్థన 30 నిమిషాల్లో ముగుస్తుంది.' : 'Provider approval required. Requests expire after 30 minutes or at the appointment start.'}</p>
        <button class="btn accent big" data-a="confirm">${LANG === 'te' ? 'అభ్యర్థన పంపండి' : 'Send request'}</button>`)
    };
  
  };
}
