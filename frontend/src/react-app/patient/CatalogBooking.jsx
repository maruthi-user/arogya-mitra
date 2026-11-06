import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@layout/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@layout/ui/dialog';
import { DataService } from '../../services/data-service';
import { VILLAGES, SERVICE_KINDS } from '../../services/reference-catalog';
import { patientText, named, serviceTitle, today } from '../../i18n/patient';
import { filterServices } from '../../features/care/patient-model';
import { Page, useResource, DataList, Field, inputClass, Badge } from '../kit';

const categories = { patientPractitioners: 'practitioner', patientHospitals: 'hospital', patientLabs: 'laboratory', patientClinics: 'clinic', patientPharmacies: 'pharmacy', patientAmbulance: 'ambulance' };
export const serviceFee = (s, t) => s.feeOnRequest ? t.onRequest : `₹${s.totalFee ?? Number(s.fee || 0) + Number(s.travelFee || 0)}`;
const kindName = (kind, language) => { const row = SERVICE_KINDS.find(k => k[0] === kind); return row ? row[language === 'te' ? 1 : 2] : kind; };

export function ServiceDetails({ service: s, language, t }) {
  const fields = [[t.service, serviceTitle(s, language)], [t.provider, s.organization], [t.description, s.description], [t.kind, kindName(s.kind, language)],
    [t.fee, serviceFee(s, t)], [t.travel, s.travelFee ?? 0], [t.duration, s.durationMinutes], [t.practitioner, s.practitionerName],
    [t.coverage, (s.coverage || []).map(id => named(VILLAGES.find(v => v.id === id), language) || id).join(', ')],
    [t.times, (s.slots || []).join(', ')], [t.days, (s.availableDays || []).join(', ')], [t.deliveryMode, s.deliveryMode]];
  return <><dl className="grid gap-3 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{value ?? '—'}</dd></div>)}</dl>
    {s.phone && <a className="inline-block py-2 text-primary underline" href={`tel:${s.phone}`}>{t.call}: {s.phone}</a>}
    {s.kind === 'ambulance' && <p className="rounded border border-amber-200 p-3 text-sm">{t.ambulanceNote}</p>}</>;
}

export function PatientCatalog({ snapshot, bridge }) {
  const { language, screen } = snapshot, t = patientText(language);
  const resource = useResource(() => DataService.careServices(false), [snapshot.session.role, snapshot.session.subjectId]);
  const initial = { query: '', kind: '', village: '', accepting: '', sort: 'name' };
  const [filters, setFilters] = useState(initial), [draft, setDraft] = useState(initial), [selected, setSelected] = useState(null);
  const business = categories[screen];
  const rows = filterServices((resource.data || []).filter(s => !business || s.businessType === business), filters);
  const set = (key, value) => setDraft(f => ({ ...f, [key]: value }));
  function apply(e) { e.preventDefault(); const village = VILLAGES.find(v => [v.id, v.en, v.te].some(n => String(n || '').toLocaleLowerCase() === draft.village.trim().toLocaleLowerCase()))?.id || draft.village.trim(); setFilters({ ...draft, village }); }
  function book(s) { if (snapshot.session.role !== 'patient') bridge.current.go('login', { role: 'patient' }); else bridge.current.go('careConfirm', { id: s.id }); }
  return <Page title={t.catalog} t={t} resource={resource} width="max-w-none">
    <form onSubmit={apply} className="mb-3 grid gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-6">
      <Field label={t.search}><input className={inputClass} maxLength={200} value={draft.query} onChange={e => set('query', e.target.value)} /></Field>
      <Field label={t.kind}><select className={inputClass} value={draft.kind} onChange={e => set('kind', e.target.value)}><option value="">{t.all}</option>{SERVICE_KINDS.map(([id, te, en]) => <option key={id} value={id}>{language === 'te' ? te : en}</option>)}</select></Field>
      <Field label={t.village}><input className={inputClass} maxLength={40} value={draft.village} onChange={e => set('village', e.target.value)} /></Field>
      <Field label={t.availability}><select className={inputClass} value={draft.accepting} onChange={e => set('accepting', e.target.value)}><option value="">{t.all}</option><option value="yes">{t.accepting}</option></select></Field>
      <Field label={t.sort}><select className={inputClass} value={draft.sort} onChange={e => set('sort', e.target.value)}>{['name', 'feeAsc', 'feeDesc'].map(id => <option key={id} value={id}>{t[id]}</option>)}</select></Field>
      <div className="flex items-end gap-2"><Button type="submit">{t.search}</Button><Button type="button" variant="outline" onClick={() => { setDraft(initial); setFilters(initial); }}>{t.clear}</Button></div>
    </form>
    {rows.length ? <DataList showSearch={false} caption={t.catalog} rows={rows} columns={[
      { key: 'title', label: t.service, render: s => serviceTitle(s, language) }, { key: 'organization', label: t.provider },
      { key: 'kind', label: t.kind, render: s => kindName(s.kind, language) }, { key: 'fee', label: t.fee, render: s => serviceFee(s, t) },
      { key: 'available', label: t.availability, render: s => s.available ? t.accepting : t.unavailable },
      { key: 'details', label: t.details, render: s => <Button variant="outline" onClick={() => setSelected(s)}>{t.review}</Button> },
      { key: 'book', label: t.bookService, render: s => <Button disabled={!s.available} onClick={() => book(s)}>{t.bookService}</Button> }
    ]} /> : <p className="rounded border p-6 text-sm">{t.noServices}</p>}
    {business === 'ambulance' && <p className="mt-3 text-sm">{t.ambulanceNote}</p>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogTitle>{t.review}</DialogTitle><DialogDescription>{selected && serviceTitle(selected, language)}</DialogDescription>{selected && <><div className="flex justify-end gap-2"><Button disabled={!selected.available} onClick={() => book(selected)}>{t.bookService}</Button><Button variant="outline" onClick={() => setSelected(null)}>{t.cancel}</Button></div><ServiceDetails service={selected} language={language} t={t} /></>}</DialogContent></Dialog>
  </Page>;
}

export function PatientBooking({ snapshot, bridge }) {
  const { language, session, params, screen } = snapshot, t = patientText(language), id = params.id;
  const profile = session.profile || {};
  const resource = useResource(async () => (await DataService.careServices(false)).find(s => s.id === id) || false, [id]);
  const service = resource.data, form = screen === 'careRequest';
  const [date, setDate] = useState(today), [draft, setDraft] = useState({ name: profile.name === 'Guest' ? '' : profile.name || '', phone: profile.phone || '', village: profile.village || '', time: '', mode: 'visit', address: '', details: '', paymentPreference: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(null);
  const [coordinates, setCoordinates] = useState(null), [locating, setLocating] = useState(false), [locationStatus, setLocationStatus] = useState(t.locationHelp);
  const geoSeq = useRef(0);
  useEffect(() => () => { geoSeq.current++; }, []);
  const availability = useResource(() => id && form ? DataService.careSlots(id, date) : Promise.resolve({ slots: [] }), [id, date, form]);
  const slots = availability.data?.slots || [];
  const set = (key, value) => setDraft(f => ({ ...f, [key]: value }));
  async function locate(checked) {
    const revision = ++geoSeq.current;
    setCoordinates(null); setLocating(checked);
    if (!checked) { setLocationStatus(t.locationHelp); return; }
    setLocationStatus(t.locating);
    try {
      if (!navigator.geolocation) throw new Error();
      const p = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
      if (revision !== geoSeq.current) return;
      setCoordinates({ latitude: p.coords.latitude, longitude: p.coords.longitude });
      set('address', `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`); setLocationStatus(t.located);
    } catch { if (revision === geoSeq.current) setLocationStatus(t.locationDenied); }
    finally { if (revision === geoSeq.current) setLocating(false); }
  }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await DataService.patientProfile(session.subjectId, { name: draft.name.trim(), phone: draft.phone.trim(), village: draft.village.trim(), language });
      const request = await DataService.careRequest({ serviceId: id, date, time: draft.time, village: draft.village.trim(), mode: draft.mode, address: draft.address.trim(), details: draft.details.trim(), paymentPreference: draft.paymentPreference, ...(coordinates || {}) });
      setSaved(request); try { await bridge.current.refresh(); } catch { /* Request reference must remain visible even if aggregate refresh fails. */ }
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  if (saved) return <Page title={t.submitted} t={t}><p>{t.awaiting}</p><p className="break-all font-semibold">{t.reference}: {saved.id}</p>{!session.accountId && <p className="rounded border p-3">{t.guestWarning}</p>}<Button onClick={() => bridge.current.go('home')}>{t.home}</Button></Page>;
  return <Page title={form ? t.bookingDetails : t.review} t={t} resource={resource}>
    {!service ? !resource.loading && !resource.error && <p>{t.selectService}</p> : <>
      <div className="flex flex-wrap justify-end gap-2">{!form && <Button disabled={!service.available} onClick={() => bridge.current.go('careRequest', { id })}>{t.bookService}</Button>}<Button variant="outline" disabled={busy} onClick={() => bridge.current.go('home')}>{t.cancelBooking}</Button></div>
      {!form ? <ServiceDetails service={service} language={language} t={t} /> : <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">{serviceTitle(service, language)} · {serviceFee(service, t)}</h2>
        <fieldset disabled={busy} className="contents">
          <Field label={t.name}><input className={inputClass} required maxLength={40} autoComplete="name" value={draft.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label={t.phone}><input className={inputClass} required type="tel" pattern="(\+91)?[6-9][0-9]{9}" autoComplete="tel" value={draft.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label={t.village}><input className={inputClass} required maxLength={40} value={draft.village} onChange={e => set('village', e.target.value)} /></Field>
          <div><label className="flex min-h-10 items-center gap-2"><input type="checkbox" checked={!!coordinates || locating} onChange={e => locate(e.target.checked)} />{t.location}</label><p role="status" className="text-xs">{locationStatus}</p></div>
          <Field label={t.address} className="sm:col-span-2"><textarea className={`${inputClass} h-auto py-2`} rows={3} required maxLength={300} value={draft.address} onChange={e => { set('address', e.target.value); geoSeq.current++; setCoordinates(null); setLocating(false); }} /></Field>
          <Field label={t.date}><input className={inputClass} required type="date" min={today()} value={date} onChange={e => { setDate(e.target.value); set('time', ''); }} /></Field>
          <Field label={t.time}><select className={inputClass} required disabled={availability.loading || !!availability.error} value={draft.time} onChange={e => set('time', e.target.value)}><option value="">{availability.loading ? t.loading : t.chooseTime}</option>{slots.filter(s => s.remaining > 0).map(s => <option key={s.time} value={s.time}>{s.time}</option>)}</select></Field>
          {availability.error && <div role="alert" className="sm:col-span-2"><p>{availability.error}</p><Button type="button" variant="outline" onClick={availability.reload}>{t.retry}</Button></div>}
          {!availability.loading && !availability.error && !slots.some(s => s.remaining > 0) && <p className="sm:col-span-2">{t.noSlots}</p>}
          <Field label={t.mode}><select className={inputClass} value={draft.mode} onChange={e => set('mode', e.target.value)}><option value="visit">{t.visit}</option><option value="callback">{t.callback}</option></select></Field>
          <Field label={t.details}><input className={inputClass} required={['medicine', 'delivery', 'lab', 'ambulance'].includes(service.kind)} maxLength={500} value={draft.details} onChange={e => set('details', e.target.value)} /></Field>
          <Field label={t.payment}><select className={inputClass} value={draft.paymentPreference} onChange={e => set('paymentPreference', e.target.value)}><option value="">{t.later}</option><option value="cash">{t.cash}</option><option value="online">{t.online}</option></select></Field>
          <p className="text-sm sm:col-span-2">{t.paymentNote}</p>{error && <p role="alert" className="text-red-600 sm:col-span-2">{error}</p>}
          <Button type="submit" disabled={busy || locating || availability.loading || !slots.some(s => s.remaining > 0 && s.time === draft.time)}>{busy ? t.saving : t.bookService}</Button>
        </fieldset>
      </form>}
    </>}
  </Page>;
}
