import { EMERGENCY_KW, RED_FLAGS, MEDICINES, SYMPTOMS } from '../../data/reference-data.js';
export function routeVoiceCommand(text, go, onUnknown) {
  function matches(text, words) {
    return words.some(w => /^[\x00-\x7f]+$/.test(w)
      ? new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text)
      : text.includes(w));
  }

  function handleVoice(text) {
    const t = text.toLowerCase();
    if (matches(t, EMERGENCY_KW) || RED_FLAGS.some(f => matches(t, f.kw))) return go('emergency');
    const med = MEDICINES.find(m => matches(t, m.kw));
    if (med) return go('meds', { med: med.id });
    const sym = SYMPTOMS.find(s => s.id !== 'other' && matches(t, s.kw));
    if (sym) return go('providers', { symptom: sym.id });
    if (matches(t, ['మందు', 'మందులు', 'మాత్ర', 'medicine', 'tablet'])) return go('meds');
    if (matches(t, ['డాక్టర్', 'వైద్యుడు', 'doctor'])) return go('symptoms');
    onUnknown();
  }

handleVoice(text);
}
