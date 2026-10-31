import { T, LANG } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';

export function createProviderDetailsPage(ctx) {
const { page, esc, providerById, typeBadge, provider, screens } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return params=>{
      const p=providerById(params.id); if(!p)return screens.roles();
      return {voice:null,html:page(esc(providerName(p)),`${typeBadge(p.type)}<p>${l('వృత్తిపరమైన ధృవీకరణ పూర్తి కాలేదు','Professional credentials have not been independently verified.')}</p>
        <p>${esc(p.services||l('సేవల వివరాలు ఇవ్వలేదు','Services not specified'))}</p><p>${l('ఫీజు','Fee')}: ${p.fee == null ? l('ఇవ్వలేదు','Not specified') : '₹'+p.fee}</p>
        <button class="btn accent" data-a="book" data-id="${esc(p.id)}">${T.book}</button>`)};
    };
}
