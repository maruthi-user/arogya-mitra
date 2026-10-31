export const VILLAGES = [
  { id: 'rama', te: 'రామాపురం', en: 'Ramapuram' },
  { id: 'krishna', te: 'కృష్ణాపురం', en: 'Krishnapuram' },
  { id: 'gopala', te: 'గోపాలపురం', en: 'Gopalapuram' },
  { id: 'venkata', te: 'వెంకటాపురం', en: 'Venkatapuram' }
];

/* Road distance in km between villages. Same village counts as 0.5 km. */
export const DIST = {
  'rama|krishna': 3, 'rama|gopala': 8, 'rama|venkata': 12,
  'krishna|gopala': 5, 'krishna|venkata': 9, 'gopala|venkata': 6
};
export function distanceKm(a, b) {
  if (a === b) return 0.5;
  return DIST[a + '|' + b] ?? DIST[b + '|' + a] ?? 10;
}

/* kw = words the voice search matches (Telugu and common English/transliterations). */
export const SYMPTOMS = [
  { id: 'fever', icon: '🌡️', te: 'జ్వరం', en: 'Fever', types: ['mbbs', 'rmp', 'ayush'], kw: ['జ్వరం', 'జ్వర', 'fever', 'jwaram'] },
  { id: 'cough', icon: '😮‍💨', te: 'దగ్గు', en: 'Cough or cold', types: ['mbbs', 'rmp', 'ayush'], kw: ['దగ్గు', 'జలుబు', 'cough', 'cold', 'daggu'] },
  { id: 'stomach', icon: '🤢', te: 'కడుపు నొప్పి', en: 'Stomach pain', types: ['mbbs', 'rmp', 'ayush'], kw: ['కడుపు', 'వాంతి', 'విరేచన', 'stomach', 'vomit', 'vomiting', 'diarrhoea', 'diarrhea', 'loose motion'] },
  { id: 'head', icon: '🤕', te: 'తలనొప్పి', en: 'Headache', types: ['mbbs', 'rmp', 'ayush'], kw: ['తల', 'headache', 'head'] },
  { id: 'wound', icon: '🩹', te: 'గాయం', en: 'Wound', types: ['rmp', 'mbbs'], kw: ['గాయం', 'దెబ్బ', 'wound', 'injury', 'cut'] },
  { id: 'other', icon: '➕', te: 'ఇతర', en: 'Other', types: ['mbbs', 'rmp', 'ayush'], kw: ['ఇతర', 'other'] }
];

export const RED_FLAGS = [
  { id: 'chest', icon: '💔', te: 'ఛాతి నొప్పి', en: 'Chest pain', kw: ['ఛాతి', 'గుండె', 'chest', 'heart'] },
  { id: 'breath', icon: '😮', te: 'ఊపిరి ఆడడం లేదు', en: 'Cannot breathe', kw: ['ఊపిరి', 'breath', 'breathing'] },
  { id: 'snake', icon: '🐍', te: 'పాము కాటు', en: 'Snake bite', kw: ['పాము', 'snake'] },
  { id: 'bleed', icon: '🩸', te: 'ఎక్కువ రక్తస్రావం', en: 'Heavy bleeding', kw: ['రక్త', 'bleed', 'bleeding', 'blood'] }
];

export const EMERGENCY_KW = ['108', 'అత్యవసరం', 'అంబులెన్స్', 'ambulance', 'emergency'];

export const MEDICINES = [
  { id: 'para', te: 'పారాసెటమాల్', en: 'Paracetamol', icon: '💊', rx: false, kw: ['పారాసెటమాల్', 'డోలో', 'paracetamol', 'dolo'] },
  { id: 'ors', te: 'ORS పొడి', en: 'ORS powder', icon: '🧂', rx: false, kw: ['ors', 'ఓఆర్ఎస్', 'ఉప్పు చక్కెర'] },
  { id: 'cetirizine', te: 'సెటిరిజిన్ (అలర్జీ)', en: 'Cetirizine (allergy)', icon: '💊', rx: false, kw: ['సెటిరిజిన్', 'అలర్జీ', 'cetirizine', 'allergy'] },
  { id: 'antacid', te: 'ఆంటాసిడ్ (కడుపు మంట)', en: 'Antacid (acidity)', icon: '💊', rx: false, kw: ['ఆంటాసిడ్', 'మంట', 'antacid', 'gelusil'] },
  { id: 'cough', te: 'దగ్గు సిరప్', en: 'Cough syrup', icon: '🧴', rx: false, kw: ['సిరప్', 'syrup'] },
  { id: 'iron', te: 'ఐరన్ మాత్రలు', en: 'Iron tablets', icon: '💊', rx: false, kw: ['ఐరన్', 'iron'] },
  { id: 'amox', te: 'యాంటీబయాటిక్', en: 'Antibiotic', icon: '💊', rx: true, kw: ['యాంటీబయాటిక్', 'అమాక్సిసిలిన్', 'antibiotic', 'amoxicillin'] }
];
