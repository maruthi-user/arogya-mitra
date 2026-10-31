import { T, LANG } from '../../i18n/index.js';

export function createPatientAppointmentsPage(ctx) {
const { S, page, appointment } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>({voice:'bookings',html:page(T.myBookings,S.bookings.filter(b=>b.patientId === S.settings.patientId).sort((a,b)=>b.createdAt-a.createdAt).map(b=>appointment(b)).join('')||`<p>${T.noBookings}</p>`)});
}
