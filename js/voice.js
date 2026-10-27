/* Voice output and input.
   Output: plays assets/audio/<key>.mp3 (recorded human voice) if it exists, otherwise browser Telugu TTS.
   Input: browser speech recognition (te-IN or en-IN, following the chosen language). Works in Chrome/Edge on Android and desktop. */
const Voice = {
  enabled: true,
  audio: null,
  code: 'te',
  speech: 'te-IN',

  setLang(code) {
    this.stop();
    this.code = code;
    this.speech = LANGS[code].speech;
  },

  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause();
      this.audio = null;
    }
  },

  hasVoice() {
    if (!('speechSynthesis' in window)) return false;
    return speechSynthesis.getVoices().some(v => v.lang && v.lang.toLowerCase().startsWith(this.code));
  },

  /* Resolves when speech ends (or after a safety timeout). Never rejects. */
  say(key) {
    const text = VOICE[key] || key;
    return new Promise(resolve => {
      if (!this.enabled) { resolve(); return; }
      this.stop();
      let fellBack = false;
      const useTts = () => {
        if (fellBack) return;
        fellBack = true;
        this.tts(text).then(resolve);
      };
      const a = new Audio('assets/audio/' + this.code + '/' + key + '.mp3');
      this.audio = a;
      a.onended = () => resolve();
      a.onerror = useTts;
      a.play().catch(useTts);
    });
  },

  tts(text) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = this.speech;
      u.rate = 0.9;
      const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(this.code));
      if (v) u.voice = v;
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
      setTimeout(resolve, 20000);
    });
  },

  canListen() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  },

  listen(onText, onState) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onState('unsupported'); return; }
    this.stop();
    const r = new SR();
    r.lang = this.speech;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onstart = () => onState('listening');
    r.onresult = e => onText(Array.from(e.results[0]).map(x => x.transcript).join(' '));
    r.onerror = () => onState('error');
    r.onend = () => onState('end');
    try { r.start(); } catch (e) { onState('error'); }
  }
};
