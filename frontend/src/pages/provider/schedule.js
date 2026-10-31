import { LANG } from '../../i18n/index.js';

import { Input } from '../../components/forms/field.js';
export function createProviderSchedulePage(ctx) {
const { page, provider, appointment, screens } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>{
      const p=provider(); if(!p)return screens.dash();
      return {voice:null,html:page(l('సమయాలు','Schedule'),`<p>${l('రోజువారీ సమయాలు, కామాలతో వేరు చేయండి (24 గంటలు).','Daily appointment times, separated by commas (24-hour format).')}</p>
        ${Input({id:'scheduleSlots',label:l('సమయాలు','Times'),value:p.slots.join(', ')})}
        <p class="fine">${l('ఇప్పటికే ఉన్న అభ్యర్థనలు మారవు.','Existing requests keep their original times. Daily slots apply to today and tomorrow.')}</p>
        <button class="btn accent" data-a="saveSchedule">${l('సేవ్ చేయండి','Save schedule')}</button>`)};
    };
}
