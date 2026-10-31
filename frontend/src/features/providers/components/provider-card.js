import { T, LANG } from '../../../i18n/index.js';
import { providerName } from '../../../data/provider-names.js';
import { escapeHtml as esc } from '../../../utils/html.js';
export function createProviderCard({distTo,distLabel,villageName,typeBadge}) {
  function providerCard(p) {
    const km = distTo(p.village);
    return `<article class="card">
      <div class="card-head"><strong>${esc(providerName(p))}</strong>${typeBadge(p.type)}</div>
      <div class="meta">📍 ${distLabel(km)} · ${esc(villageName(p.village))} · <span class="${p.open ? 'ok-t' : 'bad-t'}">${p.open ? T.open : T.closed}</span></div>
      <div class="actions">
        <a class="btn green" href="tel:${esc(p.phone)}">📞 ${T.call}</a>
        <button class="btn ghost" data-a="book" data-id="${p.id}">📅 ${T.book}</button><button class="btn ghost" data-a="providerDetail" data-id="${p.id}">${LANG === 'te' ? 'వివరాలు' : 'Details'}</button>
      </div>
    </article>`;
  }

return providerCard;
}
