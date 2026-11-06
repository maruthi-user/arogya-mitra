/** Text for the admin workspace React pages. */
const en = {
  retry: 'Retry', refresh: 'Refresh', loading: 'Loading…', saving: 'Saving…', cancel: 'Cancel', save: 'Save', search: 'Search',
  reasonLabel: 'Reason (5–1000 characters)', reasonTooShort: 'Enter a reason of at least 5 characters.',
  // notifications
  notificationsTitle: 'Email notifications',
  notificationsHint: 'Messages are delivered to your configured SMTP server. In local development, open Mailpit at localhost:8025. Queued or failed messages have not been delivered.',
  recipient: 'Recipient', subject: 'Subject', status: 'Status', attempts: 'Attempts', updated: 'Updated', retrySend: 'Retry', retried: 'Email queued for retry.',
  noNotifications: 'No notifications yet',
  // audit
  auditTitle: 'Audit history', auditHint: 'The latest 200 administrative and security events.',
  action: 'Action', actor: 'By', resource: 'Record', detail: 'Reason / details', time: 'Time', noAudit: 'No administrative decisions recorded',
  // pharmacies
  pharmaciesTitle: 'Pharmacy stock', addPharmacy: 'Add a pharmacy', addPharmacyHint: 'Only add a pharmacy with accurate contact details and permission to list its stock.',
  pharmacyName: 'Pharmacy name', phone: 'Phone', village: 'Village', add: 'Add pharmacy', pharmacyAdded: 'Pharmacy added.',
  inStock: 'In stock', notInStock: 'Not in stock', noPharmacies: 'No pharmacies yet', phoneInvalid: 'Enter a 10-digit Indian mobile number.',
  // medicine inquiries
  requestsTitle: 'Medicine inquiries', patient: 'Patient', pharmacy: 'Pharmacy', medicine: 'Medicine', message: 'Message',
  contacted: 'Mark contacted', resolved: 'Mark resolved', noRequests: 'No medicine inquiries yet',
  // business reviews
  businessTitle: 'Business reviews', businessHint: 'Providers submit their business details and licences here after adding services.',
  type: 'Type', address: 'Address', license: 'Licence / qualification', approve: 'Approve', requestChanges: 'Request changes',
  approveBusiness: 'Approve business', requestBusinessChanges: 'Request changes to this business', decisionSaved: 'Decision saved. The provider has been emailed.',
  noBusinesses: 'No businesses to review', feedback: 'Review feedback',
  // organisations
  orgsTitle: 'Organisations & staff', orgsHint: 'Suspending an organisation signs out all of its accounts and hides it from patients.',
  suspend: 'Suspend organisation', reactivate: 'Reactivate organisation', suspendTitle: 'Suspend organisation', reactivateTitle: 'Reactivate organisation',
  suspendedDone: 'Organisation suspended.', reactivatedDone: 'Organisation reactivated.',
  inviteStaff: 'Invite organisation staff', inviteHint: 'Staff can manage only their own organisation’s services and requests. They set a password from the emailed link.',
  organisation: 'Organisation', name: 'Name', username: 'Username', email: 'Email', sendInvite: 'Send setup invitation', invited: 'Invitation email queued.',
  usernameHint: '3–50 lowercase letters, digits, dot, dash or underscore', noOrgs: 'No organisations yet', all: 'All',
  statusLabels: {
    queued: 'Queued', sent: 'Sent', failed: 'Failed', processing: 'Sending',
    requested: 'Requested', contacted: 'Contacted', resolved: 'Resolved',
    draft: 'Draft', pending: 'Pending review', approved: 'Approved', rejected: 'Changes requested',
    active: 'Active', suspended: 'Suspended', awaiting: 'Awaiting activation'
  }
};

const te = {
  retry: 'మళ్లీ ప్రయత్నించండి', refresh: 'రిఫ్రెష్', loading: 'లోడ్ అవుతోంది…', saving: 'సేవ్ అవుతోంది…', cancel: 'రద్దు', save: 'సేవ్ చేయండి', search: 'వెతకండి',
  reasonLabel: 'కారణం (5–1000 అక్షరాలు)', reasonTooShort: 'కనీసం 5 అక్షరాల కారణం నమోదు చేయండి.',
  notificationsTitle: 'ఇమెయిల్ నోటిఫికేషన్లు',
  notificationsHint: 'సందేశాలు మీ SMTP సర్వర్ ద్వారా పంపబడతాయి. స్థానిక అభివృద్ధిలో localhost:8025 వద్ద Mailpit తెరవండి. క్యూలో ఉన్న లేదా విఫలమైన సందేశాలు అందలేదు.',
  recipient: 'గ్రహీత', subject: 'విషయం', status: 'స్థితి', attempts: 'ప్రయత్నాలు', updated: 'నవీకరించిన సమయం', retrySend: 'మళ్లీ పంపండి', retried: 'ఇమెయిల్ మళ్లీ పంపడానికి క్యూలో ఉంది.',
  noNotifications: 'ఇంకా నోటిఫికేషన్లు లేవు',
  auditTitle: 'చరిత్ర', auditHint: 'తాజా 200 నిర్వహణ మరియు భద్రతా సంఘటనలు.',
  action: 'చర్య', actor: 'ఎవరు', resource: 'రికార్డు', detail: 'కారణం / వివరాలు', time: 'సమయం', noAudit: 'నిర్వహణ నిర్ణయాలు ఇంకా లేవు',
  pharmaciesTitle: 'మందుల నిల్వ', addPharmacy: 'ఫార్మసీని జోడించండి', addPharmacyHint: 'సరైన సంప్రదింపు వివరాలు మరియు నిల్వ చూపడానికి అనుమతి ఉన్న ఫార్మసీని మాత్రమే జోడించండి.',
  pharmacyName: 'ఫార్మసీ పేరు', phone: 'ఫోన్', village: 'గ్రామం', add: 'ఫార్మసీని జోడించండి', pharmacyAdded: 'ఫార్మసీ జోడించబడింది.',
  inStock: 'నిల్వ ఉంది', notInStock: 'నిల్వ లేదు', noPharmacies: 'ఇంకా ఫార్మసీలు లేవు', phoneInvalid: '10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.',
  requestsTitle: 'మందుల విచారణలు', patient: 'రోగి', pharmacy: 'ఫార్మసీ', medicine: 'మందు', message: 'సందేశం',
  contacted: 'సంప్రదించారు', resolved: 'పరిష్కరించారు', noRequests: 'ఇంకా మందుల విచారణలు లేవు',
  businessTitle: 'వ్యాపార సమీక్ష', businessHint: 'సేవలు జోడించిన తర్వాత సేవాదారులు తమ వ్యాపార వివరాలు మరియు లైసెన్స్‌లను ఇక్కడ సమర్పిస్తారు.',
  type: 'రకం', address: 'చిరునామా', license: 'లైసెన్స్ / అర్హత', approve: 'ఆమోదించండి', requestChanges: 'సవరణలు కోరండి',
  approveBusiness: 'వ్యాపారాన్ని ఆమోదించండి', requestBusinessChanges: 'ఈ వ్యాపారానికి సవరణలు కోరండి', decisionSaved: 'నిర్ణయం సేవ్ అయింది. సేవాదారుకి ఇమెయిల్ పంపబడింది.',
  noBusinesses: 'సమీక్షించడానికి వ్యాపారాలు లేవు', feedback: 'సమీక్ష అభిప్రాయం',
  orgsTitle: 'సంస్థలు & సిబ్బంది', orgsHint: 'సంస్థను నిలిపివేస్తే దాని అన్ని ఖాతాలు నిష్క్రమిస్తాయి మరియు రోగులకు కనిపించదు.',
  suspend: 'నిలిపివేయండి', reactivate: 'పునఃప్రారంభించండి', suspendTitle: 'సంస్థను నిలిపివేయండి', reactivateTitle: 'సంస్థను ప్రారంభించండి',
  suspendedDone: 'సంస్థ నిలిపివేయబడింది.', reactivatedDone: 'సంస్థ పునఃప్రారంభించబడింది.',
  inviteStaff: 'సిబ్బందిని ఆహ్వానించండి', inviteHint: 'సిబ్బంది తమ సంస్థ సేవలు మరియు అభ్యర్థనలను మాత్రమే నిర్వహించగలరు. ఇమెయిల్ లింక్‌తో పాస్‌వర్డ్ సెట్ చేసుకుంటారు.',
  organisation: 'సంస్థ', name: 'పేరు', username: 'యూజర్ పేరు', email: 'ఇమెయిల్', sendInvite: 'ఆహ్వాన లింక్ పంపండి', invited: 'ఆహ్వానం ఇమెయిల్ క్యూలో ఉంది.',
  usernameHint: '3–50 చిన్న అక్షరాలు, అంకెలు, చుక్క, - లేదా _', noOrgs: 'ఇంకా సంస్థలు లేవు', all: 'అన్నీ',
  statusLabels: {
    queued: 'క్యూలో ఉంది', sent: 'పంపబడింది', failed: 'విఫలమైంది', processing: 'పంపుతోంది',
    requested: 'అభ్యర్థించారు', contacted: 'సంప్రదించారు', resolved: 'పరిష్కరించారు',
    draft: 'ముసాయిదా', pending: 'సమీక్షలో ఉంది', approved: 'ఆమోదించారు', rejected: 'సవరణలు అవసరం',
    active: 'క్రియాశీలం', suspended: 'నిలిపివేయబడింది', awaiting: 'యాక్టివేషన్ కోసం వేచి ఉంది'
  }
};

export const adminText = language => (language === 'te' ? te : en);
