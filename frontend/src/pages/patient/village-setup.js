import { T, lbl } from '../../i18n/index.js';
import { VILLAGES } from '../../data/reference-data.js';

export function createVillageSetupPage(ctx) {
  return function () {
    const { S, header, esc } = ctx;

    const chosen = S.settings.village;
    return {
      voice: 'setup',
      html: `${header(T.chooseVillage)}<main class="content">
        <div class="stack">
          ${VILLAGES.map(v => `<button class="choice ${chosen === v.id ? 'sel' : ''}" data-a="pickVillage" data-id="${v.id}">📍 ${lbl(v)}${chosen === v.id ? ' ✓' : ''}</button>`).join('')}
        </div>
        <label class="field">${T.yourName}<input type="text" id="nameInput" value="${esc(S.settings.name)}" maxlength="40" autocomplete="off"></label>
        <button class="btn accent big" data-a="setupDone">${T.continue}</button>
      </main>`
    };
  
  };
}
