import { LANG } from '../../i18n/index.js';
import { Brand } from '../ui/brand.js';
import { Icon } from '../ui/icon.js';
export function createRoleNavigation(S) {
const l=(te,en)=>LANG === 'te'?te:en;
  function navbar(current) {
    if(!S.settings.role || current === 'roles')return '';
    let links=S.settings.role === 'admin'
      ? [['adminHome','అవలోకనం','Overview'],['adminApplications','దరఖాస్తులు','Applications'],['adminNotifications','ఇమెయిల్','Notifications'],['adminPharmacies','ఫార్మసీలు','Pharmacies'],['adminRequests','అభ్యర్థనలు','Inquiries'],['adminAudit','చరిత్ర','Audit history']]
      : S.settings.role === 'provider'
      ? [['careDashboard','అవలోకనం','Overview'],['businessProfile','వ్యాపార ప్రొఫైల్','Business Profile'],['providerNotifications','నోటిఫికేషన్లు','Notifications'],['account','సెట్టింగులు','Settings']]
      : [['home','హోమ్','Home'],['providers','వైద్య సేవలు','Find care'],['bookings','అపాయింట్‌మెంట్లు','Appointments'],['settings','ప్రొఫైల్','Profile']];
    if(S.settings.role==='provider'&&['pharmacy','laboratory','ambulance'].includes(S.providers.find(p=>p.id===S.settings.providerId)?.businessType))links=links.filter(([screen])=>screen==='dash');
    links=links.concat(S.settings.role==='admin'?[['careManage','సేవల సమీక్ష','Services'],['careOrgs','సంస్థలు','Organisations']]:S.settings.role==='provider'?[['careManage','సేవలు','Services']]:[['careCatalog','అన్ని సేవలు','All services']]);
    if(S.settings.role==='patient')links.push(['careHistory','\u0c05\u0c2d\u0c4d\u0c2f\u0c30\u0c4d\u0c25\u0c28\u0c32\u0c41','Service requests']);
    if(['admin','provider'].includes(S.settings.role)&&['careHistory','carePending','providerAvailability'].includes(current))current='careManage';
    const icons={careManage:'stock',careHistory:'calendar',careCatalog:'provider',careOrgs:'provider',home:'home',providers:'provider',bookings:'calendar',settings:'patient',dash:'home',providerBookings:'calendar',schedule:'clock',providerProfile:'provider',adminHome:'home',adminApplications:'provider',adminNotifications:'mail',adminPharmacies:'medicine',adminRequests:'stock',adminAudit:'audit'};
    return `<nav class="nav" aria-label="${l('ప్రధాన నావిగేషన్','Main navigation')}"><div class="sidebar-brand">${Brand()}</div><div class="nav-links">${links.map(([s,te,en])=>`<button data-a="go" data-s="${s}" ${current===s?'aria-current="page"':''}>${Icon(icons[s])}<span>${l(te,en)}</span></button>`).join('')}</div><div class="sidebar-footer"><small>Arogya Mitra<br>Your health companion</small></div></nav>`;
  }
return navbar;
}
