import { T } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';

export function createEmergencyPage(ctx) {
  return function () {
    const { S, header, esc, distTo, distLabel, typeBadge } = ctx;

    const doc = S.providers.filter(p => p.type === 'mbbs' && p.open).sort((a, b) => distTo(a.village) - distTo(b.village))[0];
    return {
      voice: 'emergency',
      html: `${header(T.emergencyTitle)}<main class="content center emergency">
        <div class="alarm">🚑</div>
        <p class="e-body">${T.emergencyBody}</p>
        <a class="btn danger huge" href="tel:108">📞 ${T.callAmbulance}</a>
        ${doc ? `<div class="card left">${'<strong>' + esc(providerName(doc)) + '</strong>'} ${typeBadge(doc.type)}
          <div class="meta">📍 ${distLabel(distTo(doc.village))}</div>
          <div class="actions"><a class="btn green" href="tel:${esc(doc.phone)}">📞 ${T.call}</a></div></div>` : ''}
        <button class="btn ghost" data-a="back">${T.back}</button>
      </main>`
    };
  
  };
}
