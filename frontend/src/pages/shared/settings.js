import { T, LANG, LANGS, lbl } from '../../i18n/index.js';
import { VILLAGES } from '../../data/reference-data.js';

import { Voice } from '../../features/voice/speech-service.js';
import { Store } from '../../storage/browser-store.js';
import { Input, Select } from '../../components/forms/field.js';
import { Button } from '../../components/ui/button.js';

export function createSettingsPage(ctx) {
  return function () {
    const { S, page, esc } = ctx;

    const te = Voice.hasVoice();
    return {
      voice: 'settings',
      html: page(T.settings, `
        ${S.session.role==='patient'?`<section class="panel"><h2>${LANG==='te'?'మీ వివరాలు':'Your details'}</h2><p class="muted">${LANG==='te'?'ఖాతా అవసరం లేదు. బుకింగ్ కోసం మాత్రమే వివరాలు.':'No account needed. These details help your selected provider contact you.'}</p><form data-form-action="savePatientProfile" class="form-grid">${Input({id:'nameInput',label:T.yourName,value:S.settings.name,attrs:{maxlength:40,autocomplete:'name'}})}${Input({id:'patientPhone',label:LANG==='te'?'ఫోన్ నంబర్':'Phone number',type:'tel',value:S.settings.phone||'',attrs:{autocomplete:'tel',maxlength:20}})}${Select({id:'patientVillage',label:T.village,value:S.settings.village,options:VILLAGES.map(v=>({value:v.id,label:lbl(v)}))})}${Button({label:LANG==='te'?'సేవ్ చేయండి':'Save details',variant:'accent',attrs:{type:'submit'}})}</form></section>`:''}
        <button class="row-btn" data-a="go" data-s="lang"><span>🌐 ${T.language}</span><strong>${LANGS[LANG].label}</strong></button>
        <button class="row-btn" data-a="toggleVoice"><span>🔊 ${T.voiceHelp}</span><strong>${S.settings.voice ? T.on : T.off}</strong></button>
        ${!te ? `<div class="notice">${T.noVoice}</div>` : ''}
        <button class="row-btn" data-a="help"><span>🎬 ${T.replayIntro}</span><strong>▶</strong></button>
        <p class="inline-note">${LANG==='te'?'రోగి ప్రవేశం ఈ బ్రౌజర్ సెషన్‌కు చెందినది. కుకీలను తొలగిస్తే పాత అభ్యర్థనలు అందుబాటులో ఉండకపోవచ్చు.':'Patient access belongs to this browser session. Clearing cookies or session expiry can remove access to previous requests.'}</p>
        <button class="row-btn" data-a="switchRole">${LANG==='te'?'హోమ్‌కు వెళ్ళండి':'Return to role selection'}</button>
        ${Store.persistent ? '' : `<div class="notice">${T.storageBlocked}</div>`}`)
    };
  
  };
}
