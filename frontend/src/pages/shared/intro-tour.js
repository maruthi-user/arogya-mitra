import { T, LANG, TOUR } from '../../i18n/index.js';

export function createIntroTourPage(ctx) {
  return function () {
    const { finishIntro, introStep } = ctx;

    const step = introStep;
    const last = step === TOUR.length - 1;
    return {
      voice: null,
      html: `<section class="intro">
        <div class="brand">🩺 ${T.appName}</div>
        <p class="howto">${T.howToUse}</p>
        <div class="video-box">
          <video id="introVideo" playsinline controls hidden></video>
          <div id="tour" class="tour">
            <div class="tour-icon" id="tourIcon">${TOUR[step].icon}</div>
            <p class="tour-text" id="tourText">${TOUR[step].text}</p>
          </div>
        </div>
        <div class="dots" id="dots">${TOUR.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn accent big" data-a="introPlay" id="introPlay">▶ ${T.listen}</button>
        <div class="actions">
          <button class="btn ghost" data-a="introNext" id="introNext">${last ? T.start : T.next}</button>
          <button class="btn ghost" data-a="introSkip">${T.skip}</button>
        </div>
      </section>`,
      after() {
        const v = document.getElementById('introVideo');
        v.addEventListener('loadedmetadata', () => {
          v.hidden = false;
          document.getElementById('tour').hidden = true;
          document.getElementById('dots').hidden = true;
          document.getElementById('introPlay').hidden = true;
          document.getElementById('introNext').hidden = true;
        });
        v.addEventListener('ended', finishIntro);
        v.src = 'assets/intro-' + LANG + '.mp4';
      }
    };
  
  };
}
