import { T, LANG, lbl } from '../../i18n/index.js';
import { MEDICINES } from '../../data/reference-data.js';
import { providerName } from '../../data/provider-names.js';

export function createMedicinesPage(ctx) {
  return function (p) {
    const { S, page, esc, villageName, medById, distTo, distLabel } = ctx;

    const med = medById(p.med);
    if (!med) {
      return {
        voice: 'meds',
        html: page(T.whichMedicine, `
          <button class="btn ghost" data-a="go" data-s="medicineRequests">${LANG==='te'?'మీ విచారణలు':'My inquiries'}</button>
          <div class="grid2">${MEDICINES.map(m => `<button class="tile" data-a="med" data-id="${m.id}"><span class="tile-ico">${m.icon}</span>${lbl(m)}</button>`).join('')}</div>
          <button class="btn accent big" data-a="mic">🎤 ${T.speak}</button>`)
      };
    }
    const list = S.pharmacies.slice().sort((a, b) =>
      (b.stock[med.id] - a.stock[med.id]) || (distTo(a.village) - distTo(b.village)));
    return {
      voice: 'medResults',
      html: page(`${med.icon} ${lbl(med)}`, `
        <h2 class="sub">${T.medicineWhere}</h2>
        ${med.rx ? `<div class="notice">📝 ${T.rxNote}</div>` : ''}
        ${list.map(s => {
          const has = s.stock[med.id] && s.open;
          return `<article class="card">
            <div class="card-head"><strong>${esc(providerName(s))}</strong><span class="badge ${has ? 'ok' : 'bad'}">${has ? T.available : T.notAvailable}</span></div>
            <div class="meta">📍 ${distLabel(distTo(s.village))} · ${esc(villageName(s.village))}${s.delivery ? ' · 🛵 ' + T.homeDelivery : ''}${s.open ? '' : ' · ' + T.closed}</div>
            <div class="actions"><a class="btn green" href="tel:${esc(s.phone)}">📞 ${T.callShop}</a><button class="btn accent" data-a="requestMedicine" data-id="${esc(s.id)}" data-med="${med.id}">${LANG==='te'?'లభ్యతను అడగండి':'Send inquiry'}</button></div>
          </article>`;
        }).join('')}
        <button class="btn ghost" data-a="clearMed">${T.whichMedicine}</button>
        ${!list.length?`<p class="empty-state">${LANG==='te'?'మందుల దుకాణాలు ఇంకా చేర్చబడలేదు.':'No pharmacies have been listed yet.'}</p>`:''}
        <p class="fine">${LANG==='te'?'స్టాక్ మరియు ప్రిస్క్రిప్షన్ అవసరాలను ఫార్మసీతో నిర్ధారించండి.':'Confirm stock and prescription requirements with the pharmacy.'}</p>`)
    };
  
  };
}
