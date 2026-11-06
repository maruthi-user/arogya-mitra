/** Text for the provider onboarding review screens (verifier queue, admin applications, verifiers). */
const en = {
  applicationsTitle: 'Provider applications',
  applicationsDescription: 'Providers are checked by a verifier first, then you make the final decision.',
  queueTitle: 'Verification queue',
  queueDescription: 'Check the submitted details and documents. Applications you verify go to an administrator for the final decision.',
  addProvider: 'Add provider',
  refresh: 'Refresh',
  search: 'Search name, email, mobile or organisation',
  tabVerification: 'Awaiting verification', tabApproval: 'Awaiting your approval', tabActivation: 'Awaiting activation', tabAll: 'All',
  colApplicant: 'Applicant', colMobile: 'Mobile', colBusiness: 'Business', colStatus: 'Status', colSubmitted: 'Submitted', colAction: '',
  open: 'Review', view: 'View',
  emptyTitle: 'Nothing here', emptyDescription: 'No applications match this list.',
  loadFailed: 'Could not load applications.', retry: 'Retry',
  // drawer
  details: 'Submitted details', documents: 'Documents', history: 'History', noDocuments: 'No documents submitted.',
  loadingDocuments: 'Loading documents…', loadingHistory: 'Loading history…',
  fullName: 'Full name', username: 'Username', email: 'Email', mobile: 'Mobile', organisation: 'Organisation', businessType: 'Business type',
  qualification: 'Qualification', location: 'Location', address: 'Address', licenseId: 'License / registration ID', submitted: 'Submitted',
  verifierRemarks: 'Verifier remarks',
  stepSubmitted: 'Submitted', stepVerified: 'Verified', stepApproved: 'Approved', stepActivated: 'Activated',
  // actions
  verifyHeading: 'Verification', confirmChecks: 'Confirm each check before forwarding',
  checkIdentity: 'Name, email and mobile belong to the applicant', checkQualification: 'Qualification and license / registration ID are valid',
  checkDocuments: 'Documents are readable and match the details', checkContact: 'Address and location are correct',
  remarksForAdmin: 'Remarks for the administrator (optional)', remarksPlaceholder: 'What did you check?',
  verify: 'Verify & forward', reject: 'Reject',
  decisionHeading: 'Final decision', approvalNote: 'Approval note (optional)', approvalNotePlaceholder: 'Shown to the provider in the approval email.',
  approve: 'Approve & send activation link',
  rejectReason: 'Rejection reason (required)', rejectReasonPlaceholder: 'Explain why. This is emailed to the applicant.',
  reasonTooShort: 'Enter a reason of at least 5 characters.', checksMissing: 'Tick every check to forward the application.',
  cancel: 'Cancel', confirmReject: 'Reject & email applicant', saving: 'Saving…',
  activationHeading: 'Activation', activationHint: 'The provider sets a password from the emailed link (valid 24 hours).',
  resend: 'Resend activation link',
  doneVerified: 'Verified. Sent to an administrator for the final decision.', doneApproved: 'Approved. Activation link emailed to the provider.',
  doneRejected: 'Rejected. The applicant has been emailed.', doneResent: 'A new activation link was emailed. The previous link no longer works.',
  noActions: 'No action is needed at this stage.',
  // verifiers
  verifiersTitle: 'Verifiers', verifiersDescription: 'Verifiers check new provider registrations first. They receive an email link to set their own password.',
  addVerifier: 'Add a verifier', sendInvitation: 'Send invitation', invited: 'Invitation sent. The verifier sets a password from the emailed link.',
  colName: 'Name', colEmail: 'Email', colAdded: 'Added', suspend: 'Suspend', reinstate: 'Reinstate',
  suspendConfirm: 'Suspend this verifier? They are signed out immediately.', suspended: 'Verifier suspended and signed out.', reinstated: 'Verifier reinstated.',
  noVerifiers: 'No verifiers yet', noVerifiersHint: 'Invite one to start checking new provider registrations.',
  status: {
    pending_verification: 'Pending verification', pending_admin: 'Pending admin approval', verification_rejected: 'Rejected at verification',
    approved: 'Approved – awaiting activation', activated: 'Activated', rejected: 'Rejected', pending: 'Pending',
    invited: 'Invited', active: 'Active', suspended: 'Suspended'
  },
  events: {
    pending_verification: 'Registration submitted', pending_admin: 'Verified and forwarded', verification_rejected: 'Rejected at verification',
    approved: 'Approved', activated: 'Provider set a password', rejected: 'Rejected by administrator'
  },
  by: 'by'
};

const te = {
  applicationsTitle: 'సేవాదారు దరఖాస్తులు',
  applicationsDescription: 'ముందుగా ధృవీకర్త తనిఖీ చేస్తారు, తర్వాత మీరు తుది నిర్ణయం తీసుకుంటారు.',
  queueTitle: 'ధృవీకరణ జాబితా',
  queueDescription: 'సమర్పించిన వివరాలు మరియు పత్రాలను తనిఖీ చేయండి. మీరు ధృవీకరించిన దరఖాస్తులు తుది నిర్ణయం కోసం నిర్వాహకుడికి వెళ్తాయి.',
  addProvider: 'సేవాదారుని జోడించండి',
  refresh: 'రిఫ్రెష్',
  search: 'పేరు, ఇమెయిల్, మొబైల్ లేదా సంస్థ వెతకండి',
  tabVerification: 'ధృవీకరణ కోసం', tabApproval: 'మీ ఆమోదం కోసం', tabActivation: 'క్రియాశీలత కోసం', tabAll: 'అన్నీ',
  colApplicant: 'దరఖాస్తుదారు', colMobile: 'మొబైల్', colBusiness: 'వ్యాపారం', colStatus: 'స్థితి', colSubmitted: 'పంపిన సమయం', colAction: '',
  open: 'సమీక్షించండి', view: 'చూడండి',
  emptyTitle: 'ఇక్కడ ఏమీ లేదు', emptyDescription: 'ఈ జాబితాలో దరఖాస్తులు లేవు.',
  loadFailed: 'దరఖాస్తులు లోడ్ కాలేదు.', retry: 'మళ్లీ ప్రయత్నించండి',
  details: 'సమర్పించిన వివరాలు', documents: 'పత్రాలు', history: 'చరిత్ర', noDocuments: 'పత్రాలు సమర్పించలేదు.',
  loadingDocuments: 'పత్రాలు లోడ్ అవుతున్నాయి…', loadingHistory: 'చరిత్ర లోడ్ అవుతోంది…',
  fullName: 'పూర్తి పేరు', username: 'యూజర్‌నేమ్', email: 'ఇమెయిల్', mobile: 'మొబైల్', organisation: 'సంస్థ', businessType: 'వ్యాపార రకం',
  qualification: 'అర్హత', location: 'ప్రాంతం', address: 'చిరునామా', licenseId: 'లైసెన్స్ ID', submitted: 'పంపిన సమయం',
  verifierRemarks: 'ధృవీకర్త వ్యాఖ్యలు',
  stepSubmitted: 'సమర్పించారు', stepVerified: 'ధృవీకరించారు', stepApproved: 'ఆమోదించారు', stepActivated: 'క్రియాశీలం',
  verifyHeading: 'ధృవీకరణ', confirmChecks: 'పంపే ముందు ప్రతి తనిఖీని నిర్ధారించండి',
  checkIdentity: 'పేరు, ఇమెయిల్ మరియు మొబైల్ దరఖాస్తుదారుకి చెందినవి', checkQualification: 'అర్హత మరియు లైసెన్స్ ID సరైనవి',
  checkDocuments: 'పత్రాలు చదవగలిగేవి మరియు సరిపోలుతున్నాయి', checkContact: 'చిరునామా మరియు ప్రాంతం సరైనవి',
  remarksForAdmin: 'నిర్వాహకుడి కోసం వ్యాఖ్యలు (ఐచ్ఛికం)', remarksPlaceholder: 'మీరు ఏమి తనిఖీ చేశారు?',
  verify: 'ధృవీకరించి పంపండి', reject: 'తిరస్కరించండి',
  decisionHeading: 'తుది నిర్ణయం', approvalNote: 'ఆమోద గమనిక (ఐచ్ఛికం)', approvalNotePlaceholder: 'సేవాదారుకి ఇమెయిల్‌లో చూపబడుతుంది.',
  approve: 'ఆమోదించి లింక్ పంపండి',
  rejectReason: 'తిరస్కరణ కారణం (తప్పనిసరి)', rejectReasonPlaceholder: 'కారణాన్ని వివరించండి. ఇది దరఖాస్తుదారుకి ఇమెయిల్‌లో పంపబడుతుంది.',
  reasonTooShort: 'కనీసం 5 అక్షరాల కారణం నమోదు చేయండి.', checksMissing: 'పంపడానికి ప్రతి తనిఖీని టిక్ చేయండి.',
  cancel: 'రద్దు', confirmReject: 'తిరస్కరించి ఇమెయిల్ పంపండి', saving: 'సేవ్ అవుతోంది…',
  activationHeading: 'క్రియాశీలత', activationHint: 'సేవాదారు ఇమెయిల్ లింక్‌తో పాస్‌వర్డ్ సెట్ చేసుకుంటారు (24 గంటలు చెల్లుతుంది).',
  resend: 'లింక్ మళ్లీ పంపండి',
  doneVerified: 'ధృవీకరించారు. తుది నిర్ణయం కోసం నిర్వాహకుడికి పంపబడింది.', doneApproved: 'ఆమోదించారు. క్రియాశీలత లింక్ పంపబడింది.',
  doneRejected: 'తిరస్కరించారు. దరఖాస్తుదారుకి ఇమెయిల్ పంపబడింది.', doneResent: 'కొత్త క్రియాశీలత లింక్ పంపబడింది. పాత లింక్ ఇక పనిచేయదు.',
  noActions: 'ఈ దశలో ఎలాంటి చర్య అవసరం లేదు.',
  verifiersTitle: 'ధృవీకర్తలు', verifiersDescription: 'ధృవీకర్తలు కొత్త సేవాదారుల వివరాలను మొదట తనిఖీ చేస్తారు. పాస్‌వర్డ్ సెట్ చేసుకునే లింక్ వారికి ఇమెయిల్‌లో వెళ్తుంది.',
  addVerifier: 'ధృవీకర్తను జోడించండి', sendInvitation: 'ఆహ్వానం పంపండి', invited: 'ఆహ్వానం పంపబడింది.',
  colName: 'పేరు', colEmail: 'ఇమెయిల్', colAdded: 'జోడించిన సమయం', suspend: 'నిలిపివేయండి', reinstate: 'పునరుద్ధరించండి',
  suspendConfirm: 'ఈ ధృవీకర్తను నిలిపివేయాలా? వారు వెంటనే నిష్క్రమిస్తారు.', suspended: 'ధృవీకర్తను నిలిపివేశారు.', reinstated: 'ధృవీకర్తను పునరుద్ధరించారు.',
  noVerifiers: 'ఇంకా ధృవీకర్తలు లేరు', noVerifiersHint: 'కొత్త సేవాదారులను తనిఖీ చేయడానికి ఒకరిని ఆహ్వానించండి.',
  status: {
    pending_verification: 'ధృవీకరణ కోసం వేచి ఉంది', pending_admin: 'నిర్వాహక ఆమోదం కోసం వేచి ఉంది', verification_rejected: 'ధృవీకరణలో తిరస్కరించారు',
    approved: 'ఆమోదించారు – క్రియాశీలత కోసం వేచి ఉంది', activated: 'క్రియాశీలమైంది', rejected: 'తిరస్కరించారు', pending: 'వేచి ఉంది',
    invited: 'ఆహ్వానించారు', active: 'క్రియాశీలం', suspended: 'నిలిపివేశారు'
  },
  events: {
    pending_verification: 'నమోదు సమర్పించారు', pending_admin: 'ధృవీకరించి పంపారు', verification_rejected: 'ధృవీకరణలో తిరస్కరించారు',
    approved: 'ఆమోదించారు', activated: 'సేవాదారు పాస్‌వర్డ్ సెట్ చేశారు', rejected: 'నిర్వాహకుడు తిరస్కరించారు'
  },
  by: 'ద్వారా'
};

export const onboardingText = language => (language === 'te' ? te : en);
