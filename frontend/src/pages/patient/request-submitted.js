import { T, LANG } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';
import { Appointments } from '../../features/appointments/workflow.js';

export function createRequestSubmittedPage(ctx) {
  return function (p) {
    const { S, header, esc, villageName, providerById, distTo, distLabel, fmtTime, dateLabel } = ctx;

    const b = S.bookings.find(x => x.id === p.bid);
    const prov = b && providerById(b.pid);
    return {
      voice: null,
      html: `${header(LANG === 'te' ? 'అభ్యర్థన పంపబడింది' : 'Request submitted')}<main class="content center">
        <div class="bigcheck">✓</div>
        <h2>${esc(prov ? providerName(prov) : '')}</h2><p class="notice">${Appointments.label(b.status)}</p><p>${LANG === 'te' ? 'ప్రొవైడర్ ఆమోదం కోసం వేచి ఉండండి.' : 'Await provider approval; your appointment is not confirmed yet.'}</p>
        <p class="when">${b ? dateLabel(b.date) + ' · ' + fmtTime(b.time) : ''}</p>
        <p class="muted">📍 ${prov ? distLabel(distTo(prov.village)) + ' · ' + esc(villageName(prov.village)) : ''}</p>
        <div class="actions wide">
          ${prov ? `<a class="btn green" href="tel:${esc(prov.phone)}">📞 ${T.call}</a>` : ''}
          <button class="btn ghost" data-a="home">🏠 ${T.home}</button>
        </div>
      </main>`
    };
  
  };
}
