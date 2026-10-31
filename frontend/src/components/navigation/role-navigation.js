import { LANG } from '../../i18n/index.js';
import { Brand } from '../ui/brand.js';
import { Icon } from '../ui/icon.js';
export function createRoleNavigation(S) {
const l=(te,en)=>LANG === 'te'?te:en;
  function navbar(current) {
    if(!S.settings.role || current === 'roles')return '';
    const links=S.settings.role === 'admin'
      ? [['adminHome','అవలోకనం','Overview'],['adminApplications','దరఖాస్తులు','Applications'],['adminNotifications','ఇమెయిల్','Notifications'],['adminPharmacies','ఫార్మసీలు','Pharmacies'],['adminRequests','అభ్యర్థనలు','Inquiries'],['adminAudit','చరిత్ర','Audit history']]
      : S.settings.role === 'provider'
      ? [['dash','డాష్‌బోర్డ్','Dashboard'],['providerBookings','అపాయింట్‌మెంట్లు','Appointments'],['schedule','సమయాలు','Schedule'],['providerProfile','ప్రొఫైల్','Profile']]
      : [['home','హోమ్','Home'],['providers','వైద్య సేవలు','Find care'],['bookings','అపాయింట్‌మెంట్లు','Appointments'],['settings','ప్రొఫైల్','Profile']];
    const icons={home:'home',providers:'provider',bookings:'calendar',settings:'patient',dash:'home',providerBookings:'calendar',schedule:'clock',providerProfile:'provider',adminHome:'home',adminApplications:'provider',adminNotifications:'mail',adminPharmacies:'medicine',adminRequests:'stock',adminAudit:'audit'};
    return `<nav class="nav" aria-label="${l('ప్రధాన నావిగేషన్','Main navigation')}"><div class="sidebar-brand">${Brand()}</div><div class="nav-links">${links.map(([s,te,en])=>`<button data-a="go" data-s="${s}" ${current===s?'aria-current="page"':''}>${Icon(icons[s])}<span>${l(te,en)}</span></button>`).join('')}</div><div class="sidebar-footer"><button class="text-button" data-a="switchRole">${l('హోమ్‌కు','Back to home')}</button><small>Arogya Mitra<br>Your health companion</small></div></nav>`;
  }
return navbar;
}
