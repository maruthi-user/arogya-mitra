/**
 * Service editor rules, kept apart from the React form so they can be reasoned about (and tested) on
 * their own. Mirrors what the backend accepts on POST/PATCH /api/care/services.
 */
export const CLINICAL_KINDS = ['home_visit', 'checkup', 'op'];
export const NOTE_KINDS = ['lab', 'medicine', 'delivery', 'ambulance'];
export const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 180, 240, 480];

export const defaultDelivery = kind =>
  ['home_visit', 'checkup', 'delivery'].includes(kind) ? 'home' : kind === 'ambulance' ? 'transport' : 'onsite';

/** Start times every `duration` minutes from start until end (at most 49). */
export function windowSlots(start, end, duration) {
  const minutes = t => (/^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : NaN);
  const a = minutes(start), b = minutes(end), step = Number(duration), slots = [];
  if (!Number.isFinite(a) || !Number.isFinite(b) || step < 15 || step > 480 || !Number.isInteger(step) || a >= b) return slots;
  for (let t = a; t + step <= b && slots.length < 49; t += step)
    slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  return slots;
}

/** Editor state for a new service or an existing one. */
export function initialForm(service, { providerId, defaultKind, practitioners }) {
  const s = service || {};
  const kind = s.kind || defaultKind || 'home_visit';
  const eligible = practitioners.filter(p => p.active && !p.suspended && (!p.providerId || p.providerId === (s.providerId || providerId)));
  return {
    kind,
    providerId: s.providerId || providerId || '',
    title: s.title || '', titleTe: s.titleTe || '', description: s.description || '',
    practitionerId: s.practitionerId || (!s.id ? eligible[0]?.id || '' : ''),
    fee: s.feeOnRequest || s.fee == null ? '' : String(s.fee),
    travelFee: String(s.travelFee || 0),
    coverage: s.coverage || [],
    durationMinutes: s.durationMinutes || 30,
    availableDays: s.availableDays || [1, 2, 3, 4, 5],
    scheduleMode: s.id && !s.timeWindow ? 'slots' : 'window',
    windowStart: s.timeWindow?.start || '09:00', windowEnd: s.timeWindow?.end || '18:00',
    slotsText: (s.slots || []).join(', '),
    resource: s.resource && !String(s.resource).startsWith('practitioner:') ? s.resource : 'main',
    capacity: String(s.capacity || 1),
    deliveryMode: s.deliveryMode || defaultDelivery(kind),
    serviceNotes: s.serviceNotes || '',
    available: s.available ?? true,
    active: s.active ?? true
  };
}

export function slotsOf(form) {
  return form.scheduleMode === 'window'
    ? windowSlots(form.windowStart, form.windowEnd, form.durationMinutes)
    : form.slotsText.split(',').map(t => t.trim()).filter(Boolean);
}

/** Request body for the care services API (same fields the legacy editor sent). */
export function toPayload(form, practitioners, draft) {
  const practitioner = practitioners.find(p => p.id === form.practitionerId);
  const windowMode = form.scheduleMode === 'window';
  return {
    kind: form.kind, title: form.title.trim(), titleTe: form.titleTe.trim(), description: form.description.trim(),
    serviceNotes: form.serviceNotes.trim(),
    fee: form.fee === '' ? null : Number(form.fee), travelFee: Number(form.travelFee || 0),
    practitionerId: form.practitionerId,
    resource: form.practitionerId ? 'practitioner:' + form.practitionerId : form.resource.trim() || 'main',
    practitionerName: practitioner?.name || '',
    capacity: Number(form.capacity || 1), durationMinutes: Number(form.durationMinutes),
    deliveryMode: form.deliveryMode,
    timeWindow: windowMode ? { start: form.windowStart, end: form.windowEnd } : null,
    slots: slotsOf(form),
    coverage: form.coverage, availableDays: form.availableDays, active: form.active, available: form.available,
    draft: draft === true, providerId: form.providerId
  };
}

/** First problem as a dictionary key, with the step to send the user back to; null when valid. */
export function validate(form) {
  if (!form.kind || !form.providerId || !form.title.trim() || !form.description.trim()) return { key: 'errRequired', step: 0 };
  if (CLINICAL_KINDS.includes(form.kind) && !form.practitionerId) return { key: 'errPractitioner', step: 0 };
  if (!form.coverage.length || form.coverage.length > 5) return { key: 'errCoverage', step: 1 };
  if (!form.availableDays.length) return { key: 'errDays', step: 1 };
  const slots = slotsOf(form);
  if (form.scheduleMode === 'window' && (!slots.length || slots.length > 48)) return { key: 'errWindow', step: 1 };
  if (!slots.length) return { key: 'errSlots', step: 1 };
  return null;
}
