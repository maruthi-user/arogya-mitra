import React from 'react';

/**
 * Screens rendered by React instead of the legacy host. Each entry names the roles that may see it and
 * builds the element from the current snapshot ({screen, params, session, language}) and the app bridge.
 * Access is still decided by app/access-policy.js; the role list here only guards against rendering a page
 * for the wrong workspace while a redirect is in flight.
 */
const ManageAccount = React.lazy(() => import('@layout/account/ManageAccount'));
const OnboardingReview = React.lazy(() => import('./onboarding/OnboardingReview'));
const VerifierManagement = React.lazy(() => import('./onboarding/VerifierManagement'));
const admin = name => React.lazy(() => import('./admin/AdminPages').then(m => ({ default: m[name] })));
const AdminNotifications = admin('AdminNotifications');
const AdminAudit = admin('AdminAudit');
const AdminPharmacies = admin('AdminPharmacies');
const AdminMedicineRequests = admin('AdminMedicineRequests');
const AdminBusinessReviews = admin('AdminBusinessReviews');
const AdminOrganisations = admin('AdminOrganisations');
const provider = name => React.lazy(() => import('./provider/ProviderPages').then(m => ({ default: m[name] })));
const CareOverview = provider('CareOverview');
const CareServices = provider('CareServices');
const BusinessProfile = provider('BusinessProfile');
const ProviderNotifications = provider('ProviderNotifications');
const ProviderAppointments = provider('ProviderAppointments');
const ProviderTeam = provider('ProviderTeam');
const ProviderSchedule = provider('ProviderSchedule');
const ProviderProfile = provider('ProviderProfile');
const managed = ['provider', 'admin'];
const patientPage = name => React.lazy(() => import('./patient/CatalogBooking').then(m => ({ default: m[name] })));
const PatientCatalog = patientPage('PatientCatalog');
const PatientBooking = patientPage('PatientBooking');
const MyBookings = React.lazy(() => import('./patient/MyBookings'));
const Medicines = React.lazy(() => import('./patient/Medicines'));
const patientOther = name => React.lazy(() => import('./patient/PatientPages').then(m => ({ default: m[name] })));
const otherPatientPages = Object.fromEntries(['ProviderSearch','ProviderDetail','BookAppointment','AppointmentConfirmed','Symptoms','GlobalSearch','Settings','Emergency','Language','Intro','Command'].map(name => [name, patientOther(name)]));
const otherScreens = { providers:'ProviderSearch', providerDetail:'ProviderDetail', book:'BookAppointment', confirmed:'AppointmentConfirmed', symptoms:'Symptoms', search:'GlobalSearch', settings:'Settings', setup:'Settings', emergency:'Emergency', lang:'Language', intro:'Intro', command:'Command' };

const PAGES = {
  ...Object.fromEntries(Object.entries(otherScreens).map(([id, name]) => [id, { roles: ['emergency','lang','intro'].includes(id) ? ['anonymous','patient','provider','admin','verifier'] : id === 'settings' ? ['patient','provider','admin','verifier'] : ['patient'], render: (s, bridge) => { const Component = otherPatientPages[name]; return <Component key={`${s.session.subjectId || s.session.role}:${s.screen}:${s.params.id || s.params.pid || s.params.symptom || ''}`} snapshot={s} bridge={bridge} setup={s.screen === 'setup'} />; } }])),
  ...Object.fromEntries(['home','careHistory','bookings'].map(id => [id, { roles: ['patient'], render: (s, bridge) => <MyBookings key={`${s.session.subjectId}:${s.screen}`} snapshot={s} bridge={bridge} /> }])),
  ...Object.fromEntries(['meds','medicineRequests'].map(id => [id, { roles: ['patient'], render: (s, bridge) => <Medicines key={`${s.session.subjectId}:${s.screen}:${s.params.med || ''}`} snapshot={s} bridge={bridge} /> }])),
  ...Object.fromEntries(['careCatalog','patientPractitioners','patientHospitals','patientLabs','patientClinics','patientPharmacies','patientAmbulance'].map(id => [id, { roles: id === 'careCatalog' ? ['anonymous','patient','provider','admin','verifier'] : ['patient'], render: (s, bridge) => <PatientCatalog key={`${s.session.subjectId || 'public'}:${s.screen}`} snapshot={s} bridge={bridge} /> }])),
  ...Object.fromEntries(['careConfirm','careRequest'].map(id => [id, { roles: ['patient'], render: (s, bridge) => <PatientBooking key={`${s.session.subjectId}:${s.params.id || ''}`} snapshot={s} bridge={bridge} /> }])),
  account: { roles: ['provider', 'admin', 'verifier'], render: () => <ManageAccount /> },
  adminApplications: { roles: ['admin'], render: ({ language }, bridge) => <OnboardingReview key="admin:all" mode="admin" initialTab="" language={language} bridge={bridge} /> },
  adminPendingProviders: { roles: ['admin'], render: ({ language }, bridge) => <OnboardingReview key="admin:pending" mode="admin" initialTab="pending_admin" language={language} bridge={bridge} /> },
  verifierQueue: { roles: ['verifier'], render: ({ language }, bridge) => <OnboardingReview key="verifier" mode="verifier" initialTab="pending_verification" language={language} bridge={bridge} /> },
  adminVerifiers: { roles: ['admin'], render: ({ language }) => <VerifierManagement language={language} /> },
  adminNotifications: { roles: ['admin'], render: ({ language }) => <AdminNotifications language={language} /> },
  adminAudit: { roles: ['admin'], render: ({ language }) => <AdminAudit language={language} /> },
  adminPharmacies: { roles: ['admin'], render: ({ language }) => <AdminPharmacies language={language} /> },
  adminRequests: { roles: ['admin'], render: ({ language }) => <AdminMedicineRequests language={language} /> },
  businessReviews: { roles: ['admin'], render: ({ language }) => <AdminBusinessReviews language={language} /> },
  careOrgs: { roles: ['admin'], render: ({ language }) => <AdminOrganisations language={language} /> },
  careDashboard: { roles: managed, render: (s, bridge) => <CareOverview snapshot={s} bridge={bridge} /> },
  dash: { roles: managed, render: (s, bridge) => <CareOverview snapshot={s} bridge={bridge} /> },
  adminHome: { roles: ['admin'], render: (s, bridge) => <CareOverview snapshot={s} bridge={bridge} /> },
  careManage: { roles: managed, render: (s, bridge) => <CareServices key={`${s.params?.tab || ''}:${s.params?.status || ''}`} snapshot={s} bridge={bridge} /> },
  businessProfile: { roles: ['provider'], render: (s, bridge) => <BusinessProfile snapshot={s} bridge={bridge} /> },
  providerNotifications: { roles: ['provider'], render: s => <ProviderNotifications snapshot={s} /> },
  providerBookings: { roles: ['provider'], render: s => <ProviderAppointments snapshot={s} /> },
  careStaffManage: { roles: ['provider'], render: s => <ProviderTeam snapshot={s} /> },
  schedule: { roles: ['provider'], render: s => <ProviderSchedule snapshot={s} /> },
  providerProfile: { roles: ['provider'], render: s => <ProviderProfile snapshot={s} /> }
};

/** The React element for this screen, or null when the legacy host should render it. */
export function reactPage(snapshot, bridge) {
  const page = PAGES[snapshot.screen];
  if (!page || !page.roles.includes(snapshot.session.role)) return null;
  return <React.Fragment key={[snapshot.session.role, snapshot.session.subjectId || '', snapshot.session.accountId || ''].join(':')}>{page.render(snapshot, bridge)}</React.Fragment>;
}

export const REACT_SCREENS = new Set(Object.keys(PAGES));
