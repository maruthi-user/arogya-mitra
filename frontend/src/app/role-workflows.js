import { LANG } from '../i18n/index.js';
import { DataService } from '../services/data-service.js';
import { createAppointmentCard } from '../features/appointments/components/appointment-card.js';
import { createRoleNavigation } from '../components/navigation/role-navigation.js';

import { createRoleSelectionPage } from '../pages/landing/role-selection.js';
import { createProviderDashboardPage } from '../pages/provider/dashboard.js';
import { createProviderAppointmentsPage } from '../pages/provider/appointments.js';
import { createPatientAppointmentsPage } from '../pages/patient/appointments.js';
import { createProviderDetailsPage } from '../pages/patient/provider-details.js';
import { createProviderSchedulePage } from '../pages/provider/schedule.js';
import { createProviderProfilePage } from '../pages/provider/profile.js';
export function createRoleUI({ S, page, esc, providerById, typeBadge, dateLabel, fmtTime, isoDate, go, resetTo, refresh, render, toast }) {
  const l = (te,en) => LANG === 'te' ? te : en;
  const actor = () => ({ role:S.settings.role, id:S.settings.role === 'provider' ? S.settings.providerId : S.settings.patientId });
  const provider = () => providerById(S.settings.providerId);
  const appointment = createAppointmentCard({providerById,esc,dateLabel,fmtTime});
  const mine=()=>S.bookings.filter(b=>b.pid === S.settings.providerId);
  const screens = {};
  const listView={query:'',status:'',sort:'date',page:1};
  const ctx = {S,page,esc,providerById,typeBadge,dateLabel,fmtTime,isoDate,provider,appointment,mine,screens,listView};
  screens.roles = createRoleSelectionPage(ctx);
  screens.dash = createProviderDashboardPage(ctx);
  screens.providerBookings = createProviderAppointmentsPage(ctx);
  screens.bookings = createPatientAppointmentsPage(ctx);
  screens.providerDetail = createProviderDetailsPage(ctx);
  screens.schedule = createProviderSchedulePage(ctx);
  screens.providerProfile = createProviderProfilePage(ctx);
  const actions={
    filterAppointments:()=>{Object.assign(listView,{query:document.getElementById('appointmentSearch').value,status:document.getElementById('appointmentStatus').value,sort:document.getElementById('appointmentSort').value,page:1});render(false);},
    appointmentPage:d=>{listView.page=Number(d.page);render(false);},
    switchRole:()=>resetTo('roles'),
    providerDetail:d=>go('providerDetail',{id:d.id}),
    bookingStatus:async d=>{await DataService.status(d.id,d.status,actor());await refresh();render(false);},
    saveSchedule:async()=>{
      const p=provider();await DataService.profile(p.id,{slots:document.getElementById('scheduleSlots').value.split(',').map(t=>t.trim()),fee:p.fee||0,services:p.services||''});
      await refresh();render(false);toast(l('సేవ్ అయింది','Saved'));
    },
    saveProfile:async()=>{
      const p=provider();await DataService.profile(p.id,{slots:p.slots,fee:Number(document.getElementById('profileFee').value),services:document.getElementById('profileServices').value.trim()});
      await refresh();render(false);toast(l('సేవ్ అయింది','Saved'));
    }
  };
  const navbar = createRoleNavigation(S);
  return {screens,actions,navbar,actor};
}
