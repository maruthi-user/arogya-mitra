import {appointmentRecords} from '../../components/data-display/record-tables.js';
import { T, LANG } from '../../i18n/index.js';

export function createPatientAppointmentsPage(ctx) {
const { S, page, appointment } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>({voice:'bookings',html:page(T.myBookings,appointmentRecords(S.bookings.filter(b=>b.patientId===S.settings.patientId),{id:'patient-appointments',providerById:id=>S.providers.find(p=>p.id===id)}))});
}
