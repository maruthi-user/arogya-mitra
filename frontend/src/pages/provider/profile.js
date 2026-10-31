import { T, LANG } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';

import { Input } from '../../components/forms/field.js';
export function createProviderProfilePage(ctx) {
const { page, esc, typeBadge, provider, screens } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>{
      const p=provider(); if(!p)return screens.dash();
      return {voice:null,html:page(l('ప్రొవైడర్ ప్రొఫైల్','Provider profile'),`<h2>${esc(providerName(p))}</h2>${typeBadge(p.type)}<p>${l('వృత్తిపరమైన ధృవీకరణ పెండింగ్‌లో ఉంది','Professional credentials have not been independently verified.')}</p>
        ${Input({id:'profileServices',label:l('సేవలు','Services'),value:p.services||'',attrs:{maxlength:200}})}
        ${Input({id:'profileFee',label:l('ఫీజు (₹)','Fee (₹)'),type:'number',value:p.fee||0,attrs:{min:0,max:100000}})}
        <button class="btn accent" data-a="saveProfile">${l('సేవ్ చేయండి','Save profile')}</button>
        <button class="btn ghost" data-a="go" data-s="settings">${T.settings}</button>`)};
    };
}
