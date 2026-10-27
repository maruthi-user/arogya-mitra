/* All UI text and voice scripts, in Telugu and English. T, VOICE and TOUR always hold the active language
   (see applyLang), so the rest of the code reads T.xxx without caring which language is on. */
const T = {};
const VOICE = {};
const TOUR = [];
let LANG = 'te';

const STR_TE = {
  appName: 'ఆరోగ్య మిత్ర',
  greeting: 'నమస్కారం',
  guest: 'అతిథి',
  emergency: 'అత్యవసరం: 108',
  needDoctor: 'డాక్టర్ కావాలి',
  needMedicine: 'మందులు కావాలి',
  myBookings: 'నా బుకింగ్‌లు',
  home: 'హోమ్',
  speak: 'మాట్లాడండి',
  help: 'సహాయం',
  back: 'వెనక్కి',
  next: 'తర్వాత',
  skip: 'దాటవేయండి',
  start: 'ప్రారంభించండి',
  continue: 'కొనసాగించండి',
  listen: 'వినండి',
  howToUse: 'ఈ యాప్ ఎలా వాడాలి?',
  chooseVillage: 'మీ గ్రామం ఎంచుకోండి',
  yourName: 'మీ పేరు (ఐచ్ఛికం)',
  whatProblem: 'మీ సమస్య ఏమిటి?',
  speakProblem: 'మాట్లాడి చెప్పండి',
  dangerSigns: 'ప్రమాదకర లక్షణాలు',
  nearbyDoctors: 'దగ్గరి వైద్యులు',
  call: 'కాల్',
  book: 'బుక్',
  open: 'తెరిచి ఉంది',
  closed: 'మూసి ఉంది',
  km: 'కి.మీ',
  metres: 'మీ',
  mbbs: 'MBBS ✓',
  rmp: 'ప్రాథమిక సేవ',
  ayush: 'ఆయుష్',
  pharmacyType: 'మందుల షాప్',
  chooseTime: 'సమయం ఎంచుకోండి',
  today: 'ఈ రోజు',
  tomorrow: 'రేపు',
  morning: 'ఉదయం',
  noon: 'మధ్యాహ్నం',
  evening: 'సాయంత్రం',
  noSlots: 'ఈ రోజు సమయాలు లేవు. రేపు ఎంచుకోండి.',
  confirm: 'నిర్ధారించండి',
  slotTaken: 'ఈ సమయం ఇప్పటికే బుక్ అయింది',
  booked: 'బుకింగ్ అయింది',
  bookingsTitle: 'నా బుకింగ్‌లు',
  noBookings: 'ఇంకా బుకింగ్‌లు లేవు',
  cancel: 'రద్దు చేయండి',
  cancelled: 'రద్దు అయింది',
  done: 'పూర్తయింది',
  whichMedicine: 'ఏ మందు కావాలి?',
  medicineWhere: 'మందులు ఎక్కడ?',
  available: 'ఉంది',
  notAvailable: 'లేదు',
  homeDelivery: 'ఇంటికి తెచ్చి ఇస్తారు',
  callShop: 'షాప్‌కి కాల్ చేయండి',
  rxNote: 'కొన్ని మందులకు డాక్టర్ చీటీ అవసరం',
  emergencyTitle: 'ప్రమాదం!',
  emergencyBody: 'వెంటనే 108కి కాల్ చేయండి. ఆలస్యం చేయవద్దు.',
  callAmbulance: '108కి కాల్ చేయండి',
  settings: 'సెట్టింగ్స్',
  village: 'గ్రామం',
  language: 'భాష',
  chooseLanguage: 'మీ భాష ఎంచుకోండి',
  voiceHelp: 'వాయిస్ సహాయం',
  on: 'ఆన్',
  off: 'ఆఫ్',
  noVoice: 'ఈ ఫోన్‌లో తెలుగు వాయిస్ లేదు. రికార్డ్ చేసిన ఆడియో ఫైళ్లు వాడండి (README చూడండి).',
  replayIntro: 'పరిచయ వీడియో మళ్ళీ చూడండి',
  providerView: 'ప్రొవైడర్‌గా చూడండి',
  chooseProvider: 'మీరు ఎవరు?',
  dashTitle: 'ప్రొవైడర్ డాష్‌బోర్డ్',
  openToday: 'నేను ఇప్పుడు తెరిచి ఉన్నాను',
  stock: 'మందుల నిల్వ',
  requests: 'బుకింగ్ అభ్యర్థనలు',
  noRequests: 'అభ్యర్థనలు లేవు',
  resetData: 'డేటా తొలగించండి',
  resetConfirm: 'మొత్తం డేటా తొలగించాలా?',
  listening: 'వింటున్నాను…',
  noMic: 'ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ పనిచేయదు. బొమ్మను నొక్కండి.',
  micError: 'వినలేకపోయాను. మళ్ళీ ప్రయత్నించండి.',
  notUnderstood: 'అర్థం కాలేదు. మళ్ళీ చెప్పండి.',
  demoNote: 'ఇది డెమో డేటా. ఫోన్ నంబర్లు నిజమైనవి కావు.',
  storageBlocked: 'ఈ బ్రౌజర్‌లో నిల్వ నిలిపివేయబడింది. రీలోడ్ చేస్తే డేటా పోతుంది.'
};

const STR_EN = {
  appName: 'Arogya Mitra',
  greeting: 'Hello',
  guest: 'Guest',
  emergency: 'Emergency: 108',
  needDoctor: 'Need a doctor',
  needMedicine: 'Need medicine',
  myBookings: 'My bookings',
  home: 'Home',
  speak: 'Speak',
  help: 'Help',
  back: 'Back',
  next: 'Next',
  skip: 'Skip',
  start: 'Start',
  continue: 'Continue',
  listen: 'Listen',
  howToUse: 'How to use this app',
  chooseVillage: 'Choose your village',
  yourName: 'Your name (optional)',
  whatProblem: 'What is your problem?',
  speakProblem: 'Speak your problem',
  dangerSigns: 'Danger signs',
  nearbyDoctors: 'Nearby doctors',
  call: 'Call',
  book: 'Book',
  open: 'Open',
  closed: 'Closed',
  km: 'km',
  metres: 'm',
  mbbs: 'MBBS ✓',
  rmp: 'Basic care',
  ayush: 'AYUSH',
  pharmacyType: 'Pharmacy',
  chooseTime: 'Choose a time',
  today: 'Today',
  tomorrow: 'Tomorrow',
  morning: 'Morning',
  noon: 'Afternoon',
  evening: 'Evening',
  noSlots: 'No slots left today. Choose tomorrow.',
  confirm: 'Confirm',
  slotTaken: 'This time is already booked',
  booked: 'Booked',
  bookingsTitle: 'My bookings',
  noBookings: 'No bookings yet',
  cancel: 'Cancel',
  cancelled: 'Cancelled',
  done: 'Done',
  whichMedicine: 'Which medicine do you need?',
  medicineWhere: 'Where is it available?',
  available: 'In stock',
  notAvailable: 'Not in stock',
  homeDelivery: 'Home delivery',
  callShop: 'Call the shop',
  rxNote: 'Some medicines need a doctor’s prescription',
  emergencyTitle: 'Emergency!',
  emergencyBody: 'Call 108 right now. Do not wait.',
  callAmbulance: 'Call 108',
  settings: 'Settings',
  village: 'Village',
  language: 'Language',
  chooseLanguage: 'Choose your language',
  voiceHelp: 'Voice help',
  on: 'On',
  off: 'Off',
  noVoice: 'This phone has no English voice. Use recorded audio files (see README).',
  replayIntro: 'Watch the intro again',
  providerView: 'View as a provider',
  chooseProvider: 'Who are you?',
  dashTitle: 'Provider dashboard',
  openToday: 'I am open now',
  stock: 'Medicine stock',
  requests: 'Booking requests',
  noRequests: 'No requests',
  resetData: 'Delete all data',
  resetConfirm: 'Delete all data?',
  listening: 'Listening…',
  noMic: 'Voice input does not work in this browser. Tap a picture instead.',
  micError: 'Could not hear you. Try again.',
  notUnderstood: 'Not understood. Please say it again.',
  demoNote: 'This is demo data. Phone numbers are not real.',
  storageBlocked: 'Storage is blocked in this browser. Data will be lost on reload.'
};

/* Spoken scripts. `key` doubles as the audio file name: assets/audio/<lang>/<key>.mp3 plays if present, else browser TTS. */
const VOICE_TE = {
  intro: 'నమస్కారం! ఆరోగ్య మిత్ర యాప్‌కి స్వాగతం. ఈ యాప్‌తో మీ దగ్గరి డాక్టర్‌ని, మందుల షాపుని సులభంగా కనుగొనవచ్చు.',
  step1: 'మీ సమస్య చెప్పండి, లేదా బొమ్మను నొక్కండి.',
  step2: 'మీ దగ్గరి డాక్టర్ లేదా మందుల షాపు కనిపిస్తుంది.',
  step3: 'ఆకుపచ్చ బటన్ నొక్కితే కాల్ చేయవచ్చు. బుక్ నొక్కితే సమయం ఎంచుకోవచ్చు.',
  step4: 'ప్రమాదం అయితే, ఎరుపు బటన్ నొక్కి నూట ఎనిమిదికి కాల్ చేయండి.',
  setup: 'మీ గ్రామం ఎంచుకోండి.',
  home: 'డాక్టర్ కావాలా? మందులు కావాలా? ఒకటి ఎంచుకోండి.',
  symptoms: 'మీ సమస్య ఏమిటి? బొమ్మను నొక్కండి, లేదా మాట్లాడి చెప్పండి.',
  providers: 'ఇవి మీ దగ్గరి వైద్యులు. కాల్ చేయడానికి ఆకుపచ్చ బటన్ నొక్కండి.',
  meds: 'ఏ మందు కావాలి? ఒకటి ఎంచుకోండి, లేదా మాట్లాడి చెప్పండి.',
  medResults: 'ఈ మందు ఉన్న షాపులు ఇవి.',
  book: 'సమయం ఎంచుకోండి.',
  confirmed: 'మీ బుకింగ్ అయింది.',
  bookings: 'ఇవి మీ బుకింగ్‌లు.',
  emergency: 'వెంటనే నూట ఎనిమిదికి కాల్ చేయండి. ఆలస్యం చేయవద్దు.',
  settings: 'ఇవి సెట్టింగ్స్.',
  dash: 'ఇది ప్రొవైడర్ డాష్‌బోర్డ్.'
};

const VOICE_EN = {
  intro: 'Hello! Welcome to Arogya Mitra. With this app you can easily find a doctor or a medicine shop near you.',
  step1: 'Tell us your problem, or tap a picture.',
  step2: 'You will see the doctors and medicine shops near you.',
  step3: 'Tap the green button to call. Tap Book to choose a time.',
  step4: 'In an emergency, tap the red button and call one zero eight.',
  setup: 'Choose your village.',
  home: 'Need a doctor? Need medicine? Choose one.',
  symptoms: 'What is your problem? Tap a picture, or speak.',
  providers: 'These are the doctors near you. Tap the green button to call.',
  meds: 'Which medicine do you need? Choose one, or speak.',
  medResults: 'These are the shops for this medicine.',
  book: 'Choose a time.',
  confirmed: 'Your booking is done.',
  bookings: 'These are your bookings.',
  emergency: 'Call one zero eight right now. Do not wait.',
  settings: 'These are the settings.',
  dash: 'This is the provider dashboard.'
};

const TOUR_TE = [
  { icon: '🎤', voice: 'step1', text: 'మీ సమస్య చెప్పండి లేదా బొమ్మను నొక్కండి' },
  { icon: '🩺', voice: 'step2', text: 'దగ్గరి డాక్టర్ లేదా మందుల షాపు కనిపిస్తుంది' },
  { icon: '📞', voice: 'step3', text: 'కాల్ చేయండి లేదా బుక్ చేయండి' },
  { icon: '🚑', voice: 'step4', text: 'ప్రమాదమైతే ఎరుపు బటన్: 108' }
];

const TOUR_EN = [
  { icon: '🎤', voice: 'step1', text: 'Tell us your problem or tap a picture' },
  { icon: '🩺', voice: 'step2', text: 'See nearby doctors and medicine shops' },
  { icon: '📞', voice: 'step3', text: 'Call them or book a time' },
  { icon: '🚑', voice: 'step4', text: 'In an emergency, tap the red button: 108' }
];

const LANGS = {
  te: { label: 'తెలుగు', speech: 'te-IN', strings: STR_TE, voice: VOICE_TE, tour: TOUR_TE },
  en: { label: 'English', speech: 'en-IN', strings: STR_EN, voice: VOICE_EN, tour: TOUR_EN }
};

function applyLang(code) {
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
function lbl(x) {
  return x[LANG] || x.te;
}
