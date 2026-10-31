import { LANGS } from '../../i18n/index.js';

export function createLanguagePage(ctx) {
  return function () {
    const { S } = ctx;

    return {
      voice: null,
      html: `<section class="intro">
        <div class="brand">🩺 ఆరోగ్య మిత్ర · Arogya Mitra</div>
        <p class="howto">మీ భాష ఎంచుకోండి<br>Choose your language</p>
        <div class="stack">
          ${Object.keys(LANGS).map(k => `<button class="choice langbtn ${S.settings.lang === k ? 'sel' : ''}" data-a="setLang" data-id="${k}">${LANGS[k].label}${S.settings.lang === k ? ' ✓' : ''}</button>`).join('')}
        </div>
      </section>`
    };
  
  };
}
