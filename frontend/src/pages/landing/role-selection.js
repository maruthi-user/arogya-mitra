import { legacyText } from '../../i18n/legacy.js';
import { Brand } from '../../components/ui/brand.js';

const artwork = {
  patient: '<circle cx="32" cy="19" r="10"/><path d="M12 57v-7c0-12 9-18 20-18 8 0 14 3 18 9"/><path d="M42 44c-7-7-16 4 0 14 16-10 7-21 0-14Z" fill="#ffb51b" stroke="#fff" stroke-width="2"/>',
  provider: '<path d="M9 58V25l16-6V8h19v11l13 6v33H9Z" fill="#fffdf4"/><path d="M26 58V42h14v16M5 26l20-7m19 0 17 7"/><path d="M34 14v14m-7-7h14" stroke="#f5a817" stroke-width="5"/><path d="M17 34h4m24 0h4" stroke="#62bfa7" stroke-width="5"/>',
  admin: '<path d="M32 5c8 6 17 8 24 9v18c0 15-15 24-24 28C23 56 8 47 8 32V14c7-1 16-3 24-9Z" fill="#f8fffd"/><path d="M32 24v19m-9-9h18" stroke="#07996b" stroke-width="7"/>'
};
const roleArt = role => `<span class="entry-icon" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${artwork[role]}</svg></span>`;

export function createRoleSelectionPage({S}) {
  return () => {
    const roles = [
      {id:'patient', title:legacyText('patient_939864'), description:legacyText('find_care_book_services_f4adcc'), tags:[legacyText('home_visits_c63570'),legacyText('hospital_op_1b8d6e'),legacyText('medicines_f90730'),legacyText('lab_tests_5b25d6')], action:legacyText('continue_as_patient_413e5f')},
      {id:'provider', title:legacyText('provider_68a0fc'), description:legacyText('offer_care_manage_requests_9f3c1c'), tags:[legacyText('clinics_hospitals_2accd6'),legacyText('pharmacies_92eb73'),legacyText('labs_ambulances_e03ad7')], action:legacyText('provider_sign_in_1b922a')},
      {id:'admin', title:legacyText('admin_2b40b8'), description:legacyText('review_providers_manage_operations_aedbac'), action:legacyText('admin_sign_in_aa6c1a')}
    ];
    return {voice:null, html:`<div class="care-entry">
      <header class="entry-header"><div class="entry-header-inner">${Brand()}<button class="entry-language" data-a="toggleLanguage" aria-label="${legacyText('text_5fedf7')}"><span class="${legacyText('selected_be4e61')}" lang="en"><span class="language-full">English</span><span class="language-short">EN</span></span><span class="language-divider" aria-hidden="true"></span><span class="${legacyText('text_30d22e')}" lang="te">తెలుగు</span></button></div></header>
      <main class="entry-main">
        ${S.connectionError?`<div class="inline-note" role="alert">${legacyText('unable_to_connect_to_services_please_try_again_0af5df')} <button class="text-button" data-a="retry">${legacyText('retry_connection_1083d6')}</button></div>`:''}
        <section class="entry-intro" aria-labelledby="entry-heading"><h1 id="entry-heading">${legacyText('care_starts_span_here_span_54f3c2')}</h1><p>${legacyText('choose_how_you_want_to_continue_707454')}</p></section>
        <section class="entry-grid" aria-label="${legacyText('choose_your_role_4bb12b')}">${roles.map(role=>`<article class="entry-card entry-${role.id}" aria-labelledby="entry-${role.id}">${roleArt(role.id)}<div class="entry-card-body"><h2 id="entry-${role.id}">${role.title}</h2><p class="entry-description">${role.description}</p>${role.tags?`<div class="entry-tags">${role.tags.map(tag=>`<span>${tag}</span>`).join('')}</div>`:`<p class="entry-admin-details">${legacyText('applications_and_approvals_027dd9')}<br>${legacyText('platform_management_cf2f67')}</p>`}<div class="entry-actions"><button class="entry-button" data-a="chooseRole" data-role="${role.id}">${role.action}</button>${role.id==='patient'?`<button class="entry-register" data-a="go" data-s="patientRegister">${legacyText('create_patient_account_07da8d')}</button>`:role.id==='provider'?`<button class="entry-register" data-a="go" data-s="register">${legacyText('register_your_service_a0d94e')}</button>`:role.id==='admin'?`<button class="entry-register" data-a="chooseRole" data-role="verifier">${legacyText('verifier_sign_in_4b9e2c')}</button>`:''}</div></div></article>`).join('')}</section>
        <footer class="entry-footer"><a class="entry-emergency" href="tel:108"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.6 2.8c.6-.3 1.3-.1 1.6.5l2 4c.3.5.2 1.1-.2 1.5l-1.7 1.7a15 15 0 0 0 5.2 5.2l1.7-1.7c.4-.4 1-.5 1.5-.2l4 2c.6.3.8 1 .5 1.6l-1.4 3c-.3.7-1 1.1-1.8 1C9.7 20.5 3.5 14.3 2.6 6c-.1-.8.3-1.5 1-1.8l3-1.4Z"/></svg>${legacyText('emergency_help_0e3f6d')}</a><p>${legacyText('connecting_villages_with_nearby_care_4dbc5c')}</p></footer>
      </main><div class="entry-waves" aria-hidden="true"></div></div>`};
  };
}
