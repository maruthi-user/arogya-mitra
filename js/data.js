/* Demo data. Everything here is seeded into localStorage on first run. Phone numbers are fake. */
const STORE_KEY = 'arogyaMitra.v1';

const VILLAGES = [
  { id: 'rama', te: 'రామాపురం', en: 'Ramapuram' },
  { id: 'krishna', te: 'కృష్ణాపురం', en: 'Krishnapuram' },
  { id: 'gopala', te: 'గోపాలపురం', en: 'Gopalapuram' },
  { id: 'venkata', te: 'వెంకటాపురం', en: 'Venkatapuram' }
];

/* Road distance in km between villages. Same village counts as 0.5 km. */
const DIST = {
  'rama|krishna': 3, 'rama|gopala': 8, 'rama|venkata': 12,
  'krishna|gopala': 5, 'krishna|venkata': 9, 'gopala|venkata': 6
};
function distanceKm(a, b) {
  if (a === b) return 0.5;
  return DIST[a + '|' + b] ?? DIST[b + '|' + a] ?? 10;
}

/* kw = words the voice search matches (Telugu and common English/transliterations). */
const SYMPTOMS = [
  { id: 'fever', icon: '🌡️', te: 'జ్వరం', en: 'Fever', types: ['mbbs', 'rmp', 'ayush'], kw: ['జ్వరం', 'జ్వర', 'fever', 'jwaram'] },
  { id: 'cough', icon: '😮‍💨', te: 'దగ్గు', en: 'Cough or cold', types: ['mbbs', 'rmp', 'ayush'], kw: ['దగ్గు', 'జలుబు', 'cough', 'cold', 'daggu'] },
  { id: 'stomach', icon: '🤢', te: 'కడుపు నొప్పి', en: 'Stomach pain', types: ['mbbs', 'rmp', 'ayush'], kw: ['కడుపు', 'వాంతి', 'విరేచన', 'stomach', 'vomit', 'vomiting', 'diarrhoea', 'diarrhea', 'loose motion'] },
  { id: 'head', icon: '🤕', te: 'తలనొప్పి', en: 'Headache', types: ['mbbs', 'rmp', 'ayush'], kw: ['తల', 'headache', 'head'] },
  { id: 'wound', icon: '🩹', te: 'గాయం', en: 'Wound', types: ['rmp', 'mbbs'], kw: ['గాయం', 'దెబ్బ', 'wound', 'injury', 'cut'] },
  { id: 'other', icon: '➕', te: 'ఇతర', en: 'Other', types: ['mbbs', 'rmp', 'ayush'], kw: ['ఇతర', 'other'] }
];

const RED_FLAGS = [
  { id: 'chest', icon: '💔', te: 'ఛాతి నొప్పి', en: 'Chest pain', kw: ['ఛాతి', 'గుండె', 'chest', 'heart'] },
  { id: 'breath', icon: '😮', te: 'ఊపిరి ఆడడం లేదు', en: 'Cannot breathe', kw: ['ఊపిరి', 'breath', 'breathing'] },
  { id: 'snake', icon: '🐍', te: 'పాము కాటు', en: 'Snake bite', kw: ['పాము', 'snake'] },
  { id: 'bleed', icon: '🩸', te: 'ఎక్కువ రక్తస్రావం', en: 'Heavy bleeding', kw: ['రక్త', 'bleed', 'bleeding', 'blood'] }
];

const EMERGENCY_KW = ['108', 'అత్యవసరం', 'అంబులెన్స్', 'ambulance', 'emergency'];

const MEDICINES = [
  { id: 'para', te: 'పారాసెటమాల్', en: 'Paracetamol', icon: '💊', rx: false, kw: ['పారాసెటమాల్', 'డోలో', 'paracetamol', 'dolo'] },
  { id: 'ors', te: 'ORS పొడి', en: 'ORS powder', icon: '🧂', rx: false, kw: ['ors', 'ఓఆర్ఎస్', 'ఉప్పు చక్కెర'] },
  { id: 'cetirizine', te: 'సెటిరిజిన్ (అలర్జీ)', en: 'Cetirizine (allergy)', icon: '💊', rx: false, kw: ['సెటిరిజిన్', 'అలర్జీ', 'cetirizine', 'allergy'] },
  { id: 'antacid', te: 'ఆంటాసిడ్ (కడుపు మంట)', en: 'Antacid (acidity)', icon: '💊', rx: false, kw: ['ఆంటాసిడ్', 'మంట', 'antacid', 'gelusil'] },
  { id: 'cough', te: 'దగ్గు సిరప్', en: 'Cough syrup', icon: '🧴', rx: false, kw: ['సిరప్', 'syrup'] },
  { id: 'iron', te: 'ఐరన్ మాత్రలు', en: 'Iron tablets', icon: '💊', rx: false, kw: ['ఐరన్', 'iron'] },
  { id: 'amox', te: 'యాంటీబయాటిక్', en: 'Antibiotic', icon: '💊', rx: true, kw: ['యాంటీబయాటిక్', 'అమాక్సిసిలిన్', 'antibiotic', 'amoxicillin'] }
];

/* Providers who see patients. type: mbbs (verified doctor), rmp (basic care only), ayush. */
const PROVIDER_SEED = [
  { id: 'p1', name: 'డా. శ్రీనివాస్', type: 'mbbs', village: 'rama', phone: '9000000001', open: true, slots: ['10:00', '11:00', '12:00', '17:00', '18:00'] },
  { id: 'p2', name: 'లక్ష్మి క్లినిక్', type: 'rmp', village: 'krishna', phone: '9000000002', open: true, slots: ['16:00', '17:00', '18:00'] },
  { id: 'p3', name: 'డా. పద్మ', type: 'mbbs', village: 'gopala', phone: '9000000003', open: false, slots: ['09:00', '10:00', '11:00'] },
  { id: 'p4', name: 'రమేష్ ఆయుష్ వైద్యశాల', type: 'ayush', village: 'venkata', phone: '9000000004', open: true, slots: ['10:00', '11:00', '15:00'] },
  { id: 'p5', name: 'సాయి క్లినిక్', type: 'rmp', village: 'rama', phone: '9000000005', open: true, slots: ['09:00', '10:00', '16:00', '17:00'] }
];

const PHARMACY_SEED = [
  { id: 's1', name: 'సాయి మెడికల్స్', village: 'rama', phone: '9000000011', open: true, delivery: true,
    stock: { para: true, ors: true, cetirizine: true, antacid: true, cough: false, iron: true, amox: true } },
  { id: 's2', name: 'శ్రీ వెంకటేశ్వర మెడికల్', village: 'krishna', phone: '9000000012', open: true, delivery: false,
    stock: { para: false, ors: true, cetirizine: false, antacid: true, cough: true, iron: false, amox: true } },
  { id: 's3', name: 'గోపాల్ మెడికల్ హాల్', village: 'gopala', phone: '9000000013', open: true, delivery: true,
    stock: { para: true, ors: false, cetirizine: true, antacid: false, cough: true, iron: true, amox: false } }
];

/* English names for providers and shops, looked up by id so saved Telugu data needs no migration. */
const EN_NAMES = {
  p1: 'Dr. Srinivas', p2: 'Lakshmi Clinic', p3: 'Dr. Padma', p4: 'Ramesh Ayush Clinic', p5: 'Sai Clinic',
  s1: 'Sai Medicals', s2: 'Sri Venkateswara Medical', s3: 'Gopal Medical Hall'
};
function providerName(p) {
  return LANG === 'en' ? (EN_NAMES[p.id] || p.name) : p.name;
}

function seedState() {
  return {
    v: 1,
    settings: { lang: null, village: null, name: '', voice: true, introSeen: false, providerId: null },
    providers: JSON.parse(JSON.stringify(PROVIDER_SEED)),
    pharmacies: JSON.parse(JSON.stringify(PHARMACY_SEED)),
    bookings: []
  };
}
