import { LANG } from '../../i18n/index.js';
/* Presentation helpers; the backend is authoritative for identity and workflow transitions. */
export const Appointments = {
  date(offset = 0) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(p => [p.type,p.value]));
    return new Date(Date.UTC(Number(parts.year), Number(parts.month)-1, Number(parts.day)+offset)).toISOString().slice(0,10);
  },
  time() { return new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).format(new Date()); },
  label(status) {
    const labels = {
      pending: ['నిర్ధారణ కోసం వేచి ఉంది', 'Awaiting confirmation'], confirmed: ['నిర్ధారించబడింది', 'Confirmed'],
      declined: ['తిరస్కరించబడింది', 'Declined'], cancelled: ['రద్దు చేయబడింది', 'Cancelled'],
      done: ['పూర్తయింది', 'Completed'], no_show: ['హాజరు కాలేదు', 'No-show'], expired: ['గడువు ముగిసింది', 'Expired']
    };
    return (labels[status] || ['', status])[LANG === 'te' ? 0 : 1];
  },
  active(b) { return b.status === 'confirmed' || (b.status === 'pending' && b.expiresAt > Date.now()); },
  canChange(b, status, actor) {
    if (actor.role === 'patient') return b.patientId === actor.id && ['pending', 'confirmed'].includes(b.status) && status === 'cancelled';
    if (actor.role !== 'provider' || b.pid !== actor.id) return false;
    if (['done','no_show'].includes(status) && new Date(b.date+'T'+b.time+'+05:30').getTime() > Date.now()) return false;
    return (b.status === 'pending' && ['confirmed', 'declined'].includes(status))
      || (b.status === 'confirmed' && ['done', 'no_show', 'cancelled'].includes(status));
  }
};
