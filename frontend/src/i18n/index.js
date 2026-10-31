import * as te from './te.js';
import * as en from './en.js';
/* All UI text and voice scripts, in Telugu and English. T, VOICE and TOUR always hold the active language
   (see applyLang), so the rest of the code reads T.xxx without caring which language is on. */
export const T = {};
export const VOICE = {};
export const TOUR = [];
export let LANG = 'te';

export const LANGS = {
  te: { label: 'తెలుగు', speech: 'te-IN', strings: te.strings, voice: te.voice, tour: te.tour },
  en: { label: 'English', speech: 'en-IN', strings: en.strings, voice: en.voice, tour: en.tour }
};

export function applyLang(code) {
  LANG = LANGS[code] ? code : 'te';
  const l = LANGS[LANG];
  for (const k in T) delete T[k];
  for (const k in VOICE) delete VOICE[k];
  Object.assign(T, l.strings);
  Object.assign(VOICE, l.voice);
  TOUR.length = 0;
  l.tour.forEach(s => TOUR.push(s));
  document.documentElement.lang = LANG;
  document.title = T.appName;
}

/* Pick the active-language label from an item that has { te, en }. Falls back to Telugu. */
export function lbl(x) {
  return x[LANG] || x.te;
}
