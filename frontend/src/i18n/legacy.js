import { LANG } from './index.js';

// Text retained by the legacy authentication, navigation and shared controls.
const messages = {
  "te_aaa47c": {
    "te": "en",
    "en": "te"
  },
  "access_denied_f040a5": {
    "te": "అనుమతి లేదు",
    "en": "Access denied"
  },
  "your_role_does_not_have_access_to_this_page_c04e2b": {
    "te": "ఈ పేజీకి మీ పాత్రకు అనుమతి లేదు.",
    "en": "Your role does not have access to this page."
  },
  "go_to_my_home_2018f0": {
    "te": "నా హోమ్",
    "en": "Go to my home"
  },
  "page_not_found_a67610": {
    "te": "పేజీ దొరకలేదు",
    "en": "Page not found"
  },
  "this_page_is_unavailable_check_the_link_or_return__b7237c": {
    "te": "ఈ లింక్ అందుబాటులో లేదు.",
    "en": "This page is unavailable. Check the link or return home."
  },
  "home_e8f373": {
    "te": "హోమ్",
    "en": "Home"
  },
  "account_created_sign_in_with_your_mobile_number_87aecb": {
    "te": "ఖాతా సృష్టించబడింది. ప్రవేశించండి.",
    "en": "Account created. Sign in with your mobile number."
  },
  "accept_the_terms_and_privacy_policy_858559": {
    "te": "నిబంధనలు మరియు గోప్యతా విధానం అంగీకరించండి.",
    "en": "Accept the Terms and Privacy Policy."
  },
  "the_passwords_do_not_match_466cf0": {
    "te": "పాస్‌వర్డ్‌లు సరిపోలలేదు.",
    "en": "The passwords do not match."
  },
  "password_changed_sign_in_with_your_new_password_952461": {
    "te": "కొత్త పాస్‌వర్డ్‌తో ప్రవేశించండి.",
    "en": "Password changed. Sign in with your new password."
  },
  "pending_verification_d85c73": {
    "te": "ధృవీకరణ కోసం వేచి ఉంది",
    "en": "Pending verification"
  },
  "your_provider_registration_has_been_received_a_ver_41488e": {
    "te": "మీ నమోదు అందింది. ముందుగా ధృవీకర్త, తర్వాత నిర్వాహకుడు సమీక్షిస్తారు.",
    "en": "Your provider registration has been received. A verifier checks it first, then an administrator makes the final decision."
  },
  "next_steps_9dac05": {
    "te": "తదుపరి దశలు",
    "en": "Next steps"
  },
  "submitted_78f718": {
    "te": "సమర్పించారు",
    "en": "Submitted"
  },
  "verification_596206": {
    "te": "ధృవీకరణ",
    "en": "Verification"
  },
  "admin_approval_ddc7b7": {
    "te": "నిర్వాహక ఆమోదం",
    "en": "Admin approval"
  },
  "set_password_932641": {
    "te": "పాస్‌వర్డ్ సెట్ చేయండి",
    "en": "Set password"
  },
  "you_cannot_sign_in_until_approved_we_will_email_ea_e87bb6": {
    "te": "ఆమోదం వరకు మీరు ప్రవేశించలేరు. ప్రతి నిర్ణయాన్ని ఇమెయిల్ చేస్తాము. ఆమోదం తర్వాత ఇమెయిల్‌లోని లింక్‌తో మీ పాస్‌వర్డ్ సెట్ చేసుకోండి.",
    "en": "You cannot sign in until approved. We will email each decision. Once approved, use the link in that email to set your password."
  },
  "username_b1d32f": {
    "te": "యూజర్‌నేమ్",
    "en": "Username"
  },
  "sign_in_959baf": {
    "te": "ప్రవేశ పేజీకి",
    "en": "Sign in"
  },
  "change_your_temporary_password_7268d4": {
    "te": "తాత్కాలిక పాస్‌వర్డ్ మార్చండి",
    "en": "Change your temporary password"
  },
  "choose_a_new_password_before_accessing_your_dashbo_b73501": {
    "te": "డాష్‌బోర్డ్ ఉపయోగించే ముందు కొత్త పాస్‌వర్డ్ ఎంచుకోండి.",
    "en": "Choose a new password before accessing your dashboard."
  },
  "temporary_password_2c5d52": {
    "te": "తాత్కాలిక పాస్‌వర్డ్",
    "en": "Temporary password"
  },
  "new_password_014e81": {
    "te": "కొత్త పాస్‌వర్డ్",
    "en": "New password"
  },
  "confirm_new_password_8d6108": {
    "te": "కొత్త పాస్‌వర్డ్ నిర్ధారించండి",
    "en": "Confirm new password"
  },
  "use_at_least_8_characters_including_a_letter_and_a_5c91b8": {
    "te": "కనీసం 8 అక్షరాలు, ఒక అక్షరం మరియు ఒక అంకె ఉండాలి.",
    "en": "Use at least 8 characters, including a letter and a number."
  },
  "change_password_2bb4b9": {
    "te": "పాస్‌వర్డ్ మార్చండి",
    "en": "Change password"
  },
  "sign_out_b7318c": {
    "te": "నిష్క్రమించండి",
    "en": "Sign out"
  },
  "welcome_back_993033": {
    "te": "తిరిగి స్వాగతం",
    "en": "Welcome back"
  },
  "sign_in_to_manage_applications_and_platform_operat_e12c04": {
    "te": "నిర్వహణ కోసం సురక్షితంగా లాగిన్ అవ్వండి.",
    "en": "Sign in to manage applications and platform operations."
  },
  "sign_in_to_your_practice_your_patients_and_schedul_d2561b": {
    "te": "మీ ప్రాక్టీస్‌ను నిర్వహించడానికి లాగిన్ అవ్వండి.",
    "en": "Sign in to your practice. Your patients and schedule, together."
  },
  "email_address_a07784": {
    "te": "ఇమెయిల్ చిరునామా",
    "en": "Email address"
  },
  "username_or_email_20f020": {
    "te": "యూజర్‌నేమ్ లేదా ఇమెయిల్",
    "en": "Username or email"
  },
  "password_635af0": {
    "te": "పాస్‌వర్డ్",
    "en": "Password"
  },
  "forgot_password_or_need_an_activation_link_2312ad": {
    "te": "పాస్‌వర్డ్ మర్చిపోయారా?",
    "en": "Forgot password or need an activation link?"
  },
  "sign_in_4328bd": {
    "te": "లాగిన్",
    "en": "Sign in"
  },
  "apply_as_a_healthcare_provider_26ef43": {
    "te": "ప్రొవైడర్‌గా నమోదు చేసుకోండి",
    "en": "Apply as a healthcare provider"
  },
  "patient_registration_ea17e4": {
    "te": "రోగి నమోదు",
    "en": "Patient registration"
  },
  "mobile_number_username_1ca757": {
    "te": "మొబైల్ నంబర్ (యూజర్‌నేమ్)",
    "en": "Mobile number (username)"
  },
  "name_386207": {
    "te": "పేరు",
    "en": "Name"
  },
  "village_32ced9": {
    "te": "గ్రామం",
    "en": "Village"
  },
  "confirm_password_22dec6": {
    "te": "పాస్‌వర్డ్ నిర్ధారణ",
    "en": "Confirm password"
  },
  "register_8d02bf": {
    "te": "నమోదు",
    "en": "Register"
  },
  "patient_sign_in_3cee7b": {
    "te": "రోగి ప్రవేశం",
    "en": "Patient sign in"
  },
  "username_mobile_number_81f831": {
    "te": "యూజర్‌నేమ్ (మొబైల్ నంబర్)",
    "en": "Username (mobile number)"
  },
  "sign_in_58c632": {
    "te": "ప్రవేశించండి",
    "en": "Sign in"
  },
  "bring_care_closer_7c5a2b": {
    "te": "సంరక్షణను చేరువ చేయండి.",
    "en": "Bring care closer."
  },
  "register_your_details_sign_in_after_admin_approval_69fd46": {
    "te": "నమోదు చేసుకోండి. నిర్వాహకుని ఆమోదం తర్వాత ప్రవేశించండి.",
    "en": "Register your details. Sign in after admin approval."
  },
  "submit_registration_00e9fd": {
    "te": "నమోదు పంపండి",
    "en": "Submit registration"
  },
  "admin_review_0a6435": {
    "te": "నిర్వాహకుని సమీక్ష",
    "en": "Admin review"
  },
  "sign_in_after_approval_3375a8": {
    "te": "ఆమోదం తర్వాత ప్రవేశించండి",
    "en": "Sign in after approval"
  },
  "back_to_role_selection_a20a1a": {
    "te": "పాత్ర ఎంపికకు తిరిగి వెళ్లండి",
    "en": "Back to role selection"
  },
  "create_provider_account_a4403f": {
    "te": "సేవాదారు ఖాతాను సృష్టించండి",
    "en": "Create provider account"
  },
  "start_with_your_contact_details_8504c6": {
    "te": "మీ సంప్రదింపు వివరాలతో ప్రారంభించండి.",
    "en": "Start with your contact details."
  },
  "full_name_c1a9cb": {
    "te": "పూర్తి పేరు",
    "en": "Full name"
  },
  "enter_your_full_name_f958de": {
    "te": "మీ పూర్తి పేరు",
    "en": "Enter your full name"
  },
  "enter_your_email_address_896e75": {
    "te": "మీ ఇమెయిల్ చిరునామా",
    "en": "Enter your email address"
  },
  "mobile_number_a0c42b": {
    "te": "మొబైల్ నంబర్",
    "en": "Mobile number"
  },
  "enter_your_mobile_number_347f2d": {
    "te": "మీ మొబైల్ నంబర్",
    "en": "Enter your mobile number"
  },
  "we_generate_a_username_from_your_name_after_admin__2c1dc7": {
    "te": "మీ పేరుతో యూజర్‌నేమ్ సృష్టిస్తాము. ఆమోదం తర్వాత యూజర్‌నేమ్ మరియు తాత్కాలిక పాస్‌వర్డ్ ఇమెయిల్ చేస్తాము. మొదటి ప్రవేశంలో పాస్‌వర్డ్ మార్చాలి.",
    "en": "We generate a username from your name. After admin approval, we email your username and temporary password. You must change the password at first sign-in."
  },
  "i_agree_to_the_terms_and_privacy_policy_below_3aff4a": {
    "te": "నేను దిగువ నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరిస్తున్నాను.",
    "en": "I agree to the Terms and Privacy Policy below."
  },
  "terms_privacy_policy_eaa820": {
    "te": "నిబంధనలు & గోప్యతా విధానం",
    "en": "Terms & Privacy Policy"
  },
  "provide_accurate_information_businesses_and_servic_99ea13": {
    "te": "ఖచ్చితమైన సమాచారం సమర్పించండి. సేవలు ప్రజలకు కనిపించడానికి వ్యాపారం మరియు సేవల ఆమోదం అవసరం. ఆమోదం అధికారిక వృత్తిపరమైన ధృవీకరణ కాదు.",
    "en": "Provide accurate information. Businesses and services require review before public listing. Approval is not official professional credential verification."
  },
  "we_store_contact_details_business_evidence_and_req_6c6fb3": {
    "te": "ఖాతా నిర్వహణకు సంప్రదింపు వివరాలు, వ్యాపార పత్రాలు మరియు అభ్యర్థనలను నిల్వ చేస్తాము. సమర్పించిన పత్రాలను మీ సంస్థ మరియు నిర్వాహకులు మాత్రమే చూడగలరు. ఆమోద వివరాలు ఇమెయిల్ ద్వారా పంపబడతాయి.",
    "en": "We store contact details, business evidence and requests to operate your account. Submitted evidence is accessible to your organisation and administrators. Approval credentials and decisions are sent by email."
  },
  "create_account_8c1a1f": {
    "te": "ఖాతాను సృష్టించండి",
    "en": "Create account"
  },
  "already_registered_8b463f": {
    "te": "ఇప్పటికే ఖాతా ఉందా?",
    "en": "Already registered?"
  },
  "your_services_appear_to_patients_after_admin_appro_9f08af": {
    "te": "నిర్వాహకుని ఆమోదం తర్వాత మాత్రమే మీ సేవలు రోగులకు కనిపిస్తాయి.",
    "en": "Your services appear to patients after admin approval."
  },
  "patient_939864": {
    "te": "రోగి",
    "en": "Patient"
  },
  "find_care_book_services_f4adcc": {
    "te": "సేవలను కనుగొనండి. బుక్ చేసుకోండి.",
    "en": "Find care. Book services."
  },
  "home_visits_c63570": {
    "te": "ఇంటి సందర్శనలు",
    "en": "Home visits"
  },
  "hospital_op_1b8d6e": {
    "te": "ఆసుపత్రి ఓపీ",
    "en": "Hospital OP"
  },
  "medicines_f90730": {
    "te": "మందులు",
    "en": "Medicines"
  },
  "lab_tests_5b25d6": {
    "te": "ల్యాబ్ పరీక్షలు",
    "en": "Lab tests"
  },
  "continue_as_patient_413e5f": {
    "te": "రోగిగా కొనసాగండి",
    "en": "Continue as Patient"
  },
  "provider_68a0fc": {
    "te": "సేవాదారు",
    "en": "Provider"
  },
  "offer_care_manage_requests_9f3c1c": {
    "te": "సేవలు అందించండి. అభ్యర్థనలు నిర్వహించండి.",
    "en": "Offer care. Manage requests."
  },
  "clinics_hospitals_2accd6": {
    "te": "క్లినిక్‌లు & ఆసుపత్రులు",
    "en": "Clinics & hospitals"
  },
  "pharmacies_92eb73": {
    "te": "ఫార్మసీలు",
    "en": "Pharmacies"
  },
  "labs_ambulances_e03ad7": {
    "te": "ల్యాబ్‌లు & అంబులెన్స్‌లు",
    "en": "Labs & ambulances"
  },
  "provider_sign_in_1b922a": {
    "te": "సేవాదారు ప్రవేశం",
    "en": "Provider sign in"
  },
  "admin_2b40b8": {
    "te": "నిర్వాహకుడు",
    "en": "Admin"
  },
  "review_providers_manage_operations_aedbac": {
    "te": "సేవాదారుల సమీక్ష. సేవల నిర్వహణ.",
    "en": "Review providers. Manage operations."
  },
  "admin_sign_in_aa6c1a": {
    "te": "నిర్వాహక ప్రవేశం",
    "en": "Admin sign in"
  },
  "text_5fedf7": {
    "te": "Switch to English",
    "en": "తెలుగులోకి మార్చండి"
  },
  "selected_be4e61": {
    "te": "",
    "en": "selected"
  },
  "text_30d22e": {
    "te": "selected",
    "en": ""
  },
  "unable_to_connect_to_services_please_try_again_0af5df": {
    "te": "సేవలకు కనెక్ట్ కాలేదు. మళ్లీ ప్రయత్నించండి.",
    "en": "Unable to connect to services. Please try again."
  },
  "retry_connection_1083d6": {
    "te": "మళ్లీ ప్రయత్నించండి",
    "en": "Retry connection"
  },
  "care_starts_span_here_span_54f3c2": {
    "te": "సంరక్షణ ఇక్కడే మొదలు.",
    "en": "Care starts <span>here.</span>"
  },
  "choose_how_you_want_to_continue_707454": {
    "te": "మీరు ఎలా కొనసాగాలనుకుంటున్నారో ఎంచుకోండి",
    "en": "Choose how you want to continue"
  },
  "choose_your_role_4bb12b": {
    "te": "మీ పాత్రను ఎంచుకోండి",
    "en": "Choose your role"
  },
  "applications_and_approvals_027dd9": {
    "te": "దరఖాస్తులు మరియు ఆమోదాలు",
    "en": "Applications and approvals"
  },
  "platform_management_cf2f67": {
    "te": "ప్లాట్‌ఫారమ్ నిర్వహణ",
    "en": "Platform management"
  },
  "create_patient_account_07da8d": {
    "te": "నమోదు",
    "en": "Create patient account"
  },
  "register_your_service_a0d94e": {
    "te": "మీ సేవను నమోదు చేయండి",
    "en": "Register your service"
  },
  "verifier_sign_in_4b9e2c": {
    "te": "ధృవీకర్త ప్రవేశం",
    "en": "Verifier sign in"
  },
  "emergency_help_0e3f6d": {
    "te": "అత్యవసర సహాయం",
    "en": "Emergency help"
  },
  "connecting_villages_with_nearby_care_4dbc5c": {
    "te": "గ్రామాలను సమీప వైద్య సేవలతో కలుపుతూ",
    "en": "Connecting villages with nearby care"
  },
  "search_records_e6fa70": {
    "te": "శోధించండి",
    "en": "Search records"
  },
  "search_records_6ffd22": {
    "te": "బుకింగ్‌లలో వెతకండి",
    "en": "Search records…"
  },
  "search_1081c9": {
    "te": "వెతకండి",
    "en": "Search"
  },
  "rows_619417": {
    "te": "వరుసలు",
    "en": "Rows"
  },
  "table_pages_52366a": {
    "te": "పట్టిక పేజీలు",
    "en": "Table pages"
  },
  "previous_18be47": {
    "te": "మునుపటి",
    "en": "Previous"
  },
  "next_6ce64e": {
    "te": "తరువాత",
    "en": "Next"
  },
  "sort_by_2eb753": {
    "te": "క్రమం",
    "en": "Sort by"
  },
  "default_order_369fed": {
    "te": "మూల క్రమం",
    "en": "Default order"
  },
  "ascending_17777e": {
    "te": "ఆరోహణ",
    "en": "Ascending"
  },
  "descending_60ffdf": {
    "te": "అవరోహణ",
    "en": "Descending"
  },
  "reset_c8696a": {
    "te": "రీసెట్",
    "en": "Reset"
  },
  "details_bb9102": {
    "te": "పూర్తి వివరాలు",
    "en": "Details"
  },
  "view_details_bbe43a": {
    "te": "పూర్తి వివరాలు",
    "en": "View details"
  },
  "table_5631f4": {
    "te": "పట్టిక",
    "en": "Table"
  },
  "records_4d4617": {
    "te": "వివరాలు",
    "en": "Records"
  },
  "no_matching_records_886ed3": {
    "te": "సరిపోయే వివరాలు లేవు",
    "en": "No matching records"
  },
  "text_f410b4": {
    "te": "English",
    "en": "తెలుగు"
  },
  "main_navigation_de9116": {
    "te": "ప్రధాన నావిగేషన్",
    "en": "Main navigation"
  }
};
export const legacyText = (key, language = LANG) => messages[key]?.[language === 'te' ? 'te' : 'en'] || key;

const navigation = {
  "adminHome": {
    "te": "అవలోకనం",
    "en": "Overview"
  },
  "adminApplications": {
    "te": "దరఖాస్తులు",
    "en": "Applications"
  },
  "adminNotifications": {
    "te": "ఇమెయిల్",
    "en": "Notifications"
  },
  "adminPharmacies": {
    "te": "ఫార్మసీలు",
    "en": "Pharmacies"
  },
  "adminRequests": {
    "te": "అభ్యర్థనలు",
    "en": "Inquiries"
  },
  "adminAudit": {
    "te": "చరిత్ర",
    "en": "Audit history"
  },
  "careDashboard": {
    "te": "అవలోకనం",
    "en": "Overview"
  },
  "businessProfile": {
    "te": "వ్యాపార ప్రొఫైల్",
    "en": "Business Profile"
  },
  "providerNotifications": {
    "te": "నోటిఫికేషన్లు",
    "en": "Notifications"
  },
  "account": {
    "te": "సెట్టింగులు",
    "en": "Settings"
  },
  "home": {
    "te": "హోమ్",
    "en": "Home"
  },
  "providers": {
    "te": "వైద్య సేవలు",
    "en": "Find care"
  },
  "bookings": {
    "te": "అపాయింట్‌మెంట్లు",
    "en": "Appointments"
  },
  "settings": {
    "te": "ప్రొఫైల్",
    "en": "Profile"
  },
  "careManage": {
    "te": "సేవలు",
    "en": "Services"
  },
  "careOrgs": {
    "te": "సంస్థలు",
    "en": "Organisations"
  },
  "careCatalog": {
    "te": "అన్ని సేవలు",
    "en": "All services"
  },
  "careHistory": {
    "te": "అభ్యర్థనలు",
    "en": "Service requests"
  }
};
export const legacyNav = id => navigation[id]?.[LANG === 'te' ? 'te' : 'en'] || id;
