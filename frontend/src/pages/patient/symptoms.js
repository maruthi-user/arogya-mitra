import { T, lbl } from '../../i18n/index.js';
import { SYMPTOMS, RED_FLAGS } from '../../data/reference-data.js';

export function createSymptomsPage(ctx) {
  return function () {
    const { page } = ctx;

    return {
      voice: 'symptoms',
      html: page(T.whatProblem, `
        <div class="grid2">
          ${SYMPTOMS.map(s => `<button class="tile" data-a="symptom" data-id="${s.id}"><span class="tile-ico">${s.icon}</span>${lbl(s)}</button>`).join('')}
        </div>
        <h2 class="danger-h">⚠️ ${T.dangerSigns}</h2>
        <div class="grid2">
          ${RED_FLAGS.map(f => `<button class="tile red" data-a="emergency"><span class="tile-ico">${f.icon}</span>${lbl(f)}</button>`).join('')}
        </div>
        <button class="btn accent big" data-a="mic">🎤 ${T.speakProblem}</button>`)
    };
  
  };
}
