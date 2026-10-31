import { T, LANG } from '../../i18n/index.js';

export function createVoiceRequestPage(ctx) {
  return function (p) {
    const { page, esc } = ctx;

    return { voice: null, html: page(LANG === 'te' ? 'మీ అభ్యర్థన' : 'Your request', `
      <label class="field">${LANG === 'te' ? 'చెప్పండి లేదా టైప్ చేయండి' : 'Speak or type your request'}
        <input id="commandInput" maxlength="300" value="${esc(p.text || '')}" autocomplete="off"></label>
      <button class="btn accent" data-a="submitCommand">${LANG === 'te' ? 'కొనసాగించు' : 'Continue'}</button>
      <button class="btn ghost" data-a="recordCommand">🎤 ${T.speak}</button>
      <p class="fine">${LANG === 'te' ? 'ఉదాహరణ: జ్వరం, డాక్టర్, పారాసెటమాల్' : 'Try: fever, doctor, paracetamol. Voice search currently matches keywords; it does not diagnose conditions.'}</p>`) };
  
  };
}
