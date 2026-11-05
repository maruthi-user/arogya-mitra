import { T, LANG, LANGS } from '../../i18n/index.js';

import { Voice } from '../../features/voice/speech-service.js';
import { Store } from '../../storage/browser-store.js';
import { Input } from '../../components/forms/field.js';
import { Button } from '../../components/ui/button.js';

export function createSettingsPage(ctx) {
  return function () {
    const { S, page, esc } = ctx;

    const te = Voice.hasVoice();
    return {
      voice: 'settings',
      html: page(T.settings, `
        ${S.session.role==='patient'?`<section class="panel"><h2>${LANG==='te'?'మీ వివరాలు':'Your details'}</h2><p class="muted">${LANG==='te'?'ఖాతా అవసరం లేదు. బుకింగ్ కోసం మాత్రమే వివరాలు.':'Keep your saved contact details up to date.'}</p><form data-form-action="savePatientProfile" class="form-grid">${Input({id:'nameInput',label:T.yourName,value:S.settings.name,attrs:{maxlength:40,autocomplete:'name'}})}${Input({id:'patientPhone',label:LANG==='te'?'ఫోన్ నంబర్':'Phone number',type:'tel',value:S.settings.phone||'',attrs:{autocomplete:'tel',maxlength:20}})}${Input({id:'patientVillage',label:T.village,value:S.settings.village,attrs:{required:true,maxlength:40,autocomplete:'address-level3'}})}${Button({label:LANG==='te'?'సేవ్ చేయండి':'Save details',variant:'accent',attrs:{type:'submit'}})}</form></section>`:''}
        <button class="row-btn" data-a="go" data-s="lang"><span>🌐 ${T.language}</span><strong>${LANGS[LANG].label}</strong></button>
        <button class="row-btn" data-a="toggleVoice"><span>🔊 ${T.voiceHelp}</span><strong>${S.settings.voice ? T.on : T.off}</strong></button>
        ${!te ? `<div class="notice">${T.noVoice}</div>` : ''}
        <button class="row-btn" data-a="help"><span>🎬 ${T.replayIntro}</span><strong>▶</strong></button>
        <p class="inline-note">${LANG==='te'?'రోగి ప్రవేశం ఈ బ్రౌజర్ సెషన్‌కు చెందినది. కుకీలను తొలగిస్తే పాత అభ్యర్థనలు అందుబాటులో ఉండకపోవచ్చు.':'Sign in with your registered mobile number to access your saved bookings.'}</p>
        <button class="row-btn" data-a="switchRole">${LANG==='te'?'హోమ్‌కు వెళ్ళండి':'Return to role selection'}</button>
        ${Store.persistent ? '' : `<div class="notice">${T.storageBlocked}</div>`}`)
    };
  
  };
}
