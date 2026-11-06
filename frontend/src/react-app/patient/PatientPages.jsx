import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { VILLAGES, MEDICINES, SYMPTOMS, RED_FLAGS } from '../../services/reference-catalog';
import { LANGS } from '../../i18n/index';
import { patientText, named, today, tomorrow } from '../../i18n/patient';
import { Voice } from '../../features/voice/speech-service';
import { routeVoiceCommand } from '../../features/voice/command-router';
import { Store } from '../../storage/browser-store';
import { Page, useResource, DataList, Field, inputClass, Badge } from '../kit';

const go = (bridge, screen, params) => bridge.current.go(screen, params);
const villageName = (id, language) => named(VILLAGES.find(v => v.id === id), language) || id;

export function ProviderSearch({ snapshot, bridge }) {
  const { language, params, session } = snapshot, t = patientText(language), symptom = SYMPTOMS.find(s => s.id === params.symptom);
  const resource = useResource(() => DataService.load(), [session.subjectId]);
  const [filters, setFilters] = useState({ query: '', type: '', open: false, sort: 'recommended' });
  const proximity = p => p.village === session.profile?.village ? 0 : 1;
  const rows = (resource.data?.providers || []).filter(p => (!symptom?.types || symptom.types.includes(p.type)) && (!filters.type || p.type === filters.type) && (!filters.open || p.open) && `${p.name} ${p.services || ''} ${p.type}`.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase())).sort((a, b) => filters.sort === 'name' ? a.name.localeCompare(b.name, language) : filters.sort === 'distance' ? proximity(a) - proximity(b) : Number(b.open) - Number(a.open) || proximity(a) - proximity(b));
  const set = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  return <Page title={symptom ? named(symptom, language) : t.providers} t={t} resource={resource} width="max-w-none">
    <div className="grid gap-3 sm:grid-cols-4"><Field label={t.search}><input className={inputClass} maxLength={200} value={filters.query} onChange={e => set('query', e.target.value)} /></Field>
      <Field label={t.type}><select className={inputClass} value={filters.type} onChange={e => set('type', e.target.value)}><option value="">{t.all}</option>{['mbbs','rmp','ayush'].map(type => <option key={type} value={type}>{type.toUpperCase()}</option>)}</select></Field>
      <Field label={t.availability}><select className={inputClass} value={String(filters.open)} onChange={e => set('open', e.target.value === 'true')}><option value="false">{t.all}</option><option value="true">{t.openOnly}</option></select></Field>
      <Field label={t.sort}><select className={inputClass} value={filters.sort} onChange={e => set('sort', e.target.value)}>{['recommended','distance','name'].map(key => <option key={key} value={key}>{t[key]}</option>)}</select></Field></div>
    {rows.length ? <DataList showSearch={false} caption={t.providers} rows={rows} columns={[
      { key: 'name', label: t.provider }, { key: 'type', label: t.type }, { key: 'village', label: t.village, render: p => villageName(p.village, language) },
      { key: 'open', label: t.availability, render: p => p.open ? t.open : t.closed }, { key: 'services', label: t.service },
      { key: 'call', label: t.call, render: p => <a className="text-primary underline" href={`tel:${p.phone}`}>{t.call}</a> },
      { key: 'details', label: t.details, render: p => <Button variant="outline" onClick={() => go(bridge, 'providerDetail', { id: p.id })}>{t.review}</Button> },
      { key: 'book', label: t.book, render: p => <Button onClick={() => go(bridge, 'book', { pid: p.id })}>{t.book}</Button> }
    ]} /> : <p>{t.noProviders}</p>}<p className="text-sm">{t.proximity}</p>
  </Page>;
}

export function ProviderDetail({ snapshot, bridge }) {
  const { language, params } = snapshot, t = patientText(language);
  const resource = useResource(async () => (await DataService.load()).providers.find(p => p.id === params.id) || false, [params.id]);
  const p = resource.data;
  return <Page title={p?.name || t.provider} t={t} resource={resource}>{p ? <><Badge status="active" label={p.type?.toUpperCase()} /><p>{t.unverified}</p><p>{p.services || t.unspecified}</p><p>{t.fee}: {p.fee == null ? t.onRequest : `₹${p.fee}`}</p><p>{villageName(p.village, language)}</p><div className="flex gap-2"><a className="rounded border px-3 py-2" href={`tel:${p.phone}`}>{t.call}</a><Button onClick={() => go(bridge, 'book', { pid: p.id })}>{t.book}</Button></div></> : <p>{t.notFound}</p>}</Page>;
}

export function BookAppointment({ snapshot, bridge }) {
  const { session, params, language } = snapshot, t = patientText(language), profile = session.profile || {}, id = params.pid;
  const [date, setDate] = useState(today), [time, setTime] = useState('');
  const [form, setForm] = useState({ name: profile.name === 'Guest' ? '' : profile.name || '', phone: profile.phone || '', village: profile.village || '', reason: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const resource = useResource(async () => { const [state, availability] = await Promise.all([DataService.load(), DataService.slots(id, date)]); return { provider: state.providers.find(p => p.id === id), availability }; }, [id, date]);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await DataService.patientProfile(session.subjectId, { name: form.name.trim(), phone: form.phone.trim(), village: form.village.trim(), language });
      const saved = await DataService.book({ pid: id, date, time, name: form.name.trim(), village: form.village.trim(), patientId: session.subjectId, reason: form.reason.trim() });
      try { await bridge.current.refresh(); } catch { /* Show saved confirmation even when aggregate refresh fails. */ }
      go(bridge, 'confirmed', { id: saved.id });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const p = resource.data?.provider, slots = resource.data?.availability.slots || [];
  return <Page title={t.book} t={t} resource={resource}>{p ? <form onSubmit={submit} className="space-y-3"><h2 className="font-semibold">{p.name}</h2><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
    <Field label={t.date}><input className={inputClass} type="date" required min={today()} max={tomorrow()} value={date} onChange={e => { setDate(e.target.value); setTime(''); }} /></Field>
    <Field label={t.time}><select className={inputClass} required disabled={resource.loading} value={time} onChange={e => setTime(e.target.value)}><option value="">{t.chooseTime}</option>{slots.filter(s => s.available).map(s => <option key={s.time} value={s.time}>{s.time}</option>)}</select></Field>
    {!resource.loading && !slots.some(s => s.available) && <p className="sm:col-span-2">{t.noSlots}</p>}
    <Field label={t.name}><input className={inputClass} required maxLength={40} autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} /></Field>
    <Field label={t.phone}><input className={inputClass} required type="tel" pattern="(\+91)?[6-9][0-9]{9}" value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
    <Field label={t.village}><input className={inputClass} required maxLength={40} value={form.village} onChange={e => set('village', e.target.value)} /></Field>
    <Field label={t.reason}><input className={inputClass} maxLength={300} value={form.reason} onChange={e => set('reason', e.target.value)} /></Field>
    <p className="text-sm sm:col-span-2">{t.appointmentNote}</p>{error && <p role="alert" className="text-red-600 sm:col-span-2">{error}</p>}
    <Button type="submit" disabled={busy || resource.loading || !slots.some(s => s.available && s.time === time)}>{busy ? t.saving : t.send}</Button>
  </fieldset></form> : <p>{t.notFound}</p>}</Page>;
}

export function AppointmentConfirmed({ snapshot, bridge }) {
  const { language, params, session } = snapshot, t = patientText(language);
  const resource = useResource(async () => { const state = await DataService.load(), booking = state.bookings.find(b => b.id === (params.id || params.bid) && b.patientId === session.subjectId); return booking ? { booking, provider: state.providers.find(p => p.id === booking.pid) } : false; }, [params.id, params.bid, session.subjectId]);
  const d = resource.data;
  return <Page title={t.submitted} t={t} resource={resource}>{d ? <><h2>{d.provider?.name}</h2><Badge status={d.booking.status} label={t.statuses[d.booking.status] || d.booking.status} /><p>{t.awaiting}</p><p>{d.booking.date} · {d.booking.time}</p><p className="break-all">{t.reference}: {d.booking.id}</p>{!session.accountId && <p>{t.guestWarning}</p>}{d.provider?.phone && <a className="block text-primary underline" href={`tel:${d.provider.phone}`}>{t.call}</a>}</> : <p>{t.notFound}</p>}<Button onClick={() => go(bridge, 'home')}>{t.home}</Button></Page>;
}

export function Symptoms({ snapshot, bridge }) {
  const t = patientText(snapshot.language);
  return <Page title={t.whatProblem} t={t}><div className="grid grid-cols-2 gap-3">{SYMPTOMS.map(s => <Button key={s.id} variant="outline" className="h-auto whitespace-normal py-4" onClick={() => go(bridge, 'providers', { symptom: s.id })}>{s.icon} {named(s, snapshot.language)}</Button>)}</div><h2 className="font-semibold text-red-600">{t.dangerSigns}</h2><div className="grid grid-cols-2 gap-3">{RED_FLAGS.map(s => <Button key={s.id} variant="outline" className="h-auto whitespace-normal py-4 text-red-600" onClick={() => go(bridge, 'emergency')}>{s.icon} {named(s, snapshot.language)}</Button>)}</div><Button onClick={() => bridge.current.startMic()}>{t.speakProblem}</Button></Page>;
}

export function GlobalSearch({ snapshot, bridge }) {
  const { language, session } = snapshot, t = patientText(language), [query, setQuery] = useState('');
  const resource = useResource(() => DataService.load(), [session.subjectId]), q = query.trim().toLocaleLowerCase();
  const providers = q ? (resource.data?.providers || []).filter(p => `${p.name} ${p.services || ''}`.toLocaleLowerCase().includes(q)) : [];
  const medicines = q ? MEDICINES.filter(m => `${m.te} ${m.en} ${(m.kw || []).join(' ')}`.toLocaleLowerCase().includes(q)) : [];
  const rows = [...providers.map(p => ({ ...p, recordType: 'provider' })), ...medicines.map(m => ({ ...m, name: named(m, language), recordType: 'medicine' }))];
  return <Page title={t.searchTitle} t={t} resource={resource}><Field label={t.search}><input className={inputClass} type="search" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} /></Field><p className="text-sm">{t.searchHint}</p>{q && (rows.length ? <DataList showSearch={false} caption={t.searchTitle} rows={rows} getKey={r => r.recordType + r.id} columns={[{ key: 'name', label: t.name }, { key: 'recordType', label: t.type, render: r => t[r.recordType] }, { key: 'details', label: t.review, render: r => <Button onClick={() => go(bridge, r.recordType === 'provider' ? 'providerDetail' : 'meds', r.recordType === 'provider' ? { id: r.id } : { med: r.id })}>{r.recordType === 'provider' ? t.review : t.pharmacies}</Button> }]} /> : <p>{t.noMatches}</p>)}</Page>;
}

export function Settings({ snapshot, bridge, setup = false }) {
  const { language, session } = snapshot, t = patientText(language), profile = session.profile || {};
  const [form, setForm] = useState({ name: profile.name === 'Guest' ? '' : profile.name || '', phone: profile.phone || '', village: profile.village || '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [voice, setVoice] = useState(Voice.enabled);
  async function save(e) { e.preventDefault(); setBusy(true); setError(''); try { await DataService.patientProfile(session.subjectId, { ...form, name: form.name.trim() || 'Guest', language }); await bridge.current.refresh(); toast({ description: t.saved }); if (setup) go(bridge, 'home'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return <Page title={setup ? t.chooseVillage : t.settings} t={t}>
    {session.role === 'patient' && <form onSubmit={save} className="space-y-3 rounded border bg-card p-4"><h2 className="font-semibold">{t.profile}</h2><p className="text-sm">{t.profileHelp}</p><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">{['name','phone','village'].map(key => <Field key={key} label={t[key]}><input className={inputClass} type={key === 'phone' ? 'tel' : 'text'} required={key === 'village'} maxLength={key === 'phone' ? 20 : 40} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} /></Field>)}{error && <p role="alert" className="text-red-600">{error}</p>}<Button type="submit">{busy ? t.saving : t.save}</Button></fieldset></form>}
    {!session.accountId && session.role === 'patient' && <p className="rounded border p-3 text-sm">{t.guestWarning}</p>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => go(bridge, 'lang')}>{t.language}: {LANGS[language].label}</Button><Button variant="outline" aria-pressed={voice} onClick={() => { const value = !voice; setVoice(value); bridge.current.preferences({ voice: value }); }}>{t.voiceHelp}: {voice ? t.on : t.off}</Button><Button variant="outline" onClick={() => go(bridge, 'intro')}>{t.replayIntro}</Button><Button variant="outline" onClick={() => go(bridge, 'roles')}>{t.roleSelection}</Button></div>
    {!Voice.hasVoice() && <p>{t.noVoice}</p>}{!Store.persistent && <p>{t.storageBlocked}</p>}
  </Page>;
}

export function Emergency({ snapshot }) {
  const t = patientText(snapshot.language), resource = useResource(() => DataService.load(), [snapshot.session.subjectId]);
  const doc = resource.data?.providers.filter(p => p.type === 'mbbs' && p.open).sort((a, b) => Number(b.village === snapshot.session.profile?.village) - Number(a.village === snapshot.session.profile?.village))[0];
  return <Page title={t.emergencyTitle} t={t}><p className="text-xl font-semibold">{t.emergencyBody}</p><a className="inline-flex min-h-12 items-center rounded bg-red-600 px-6 text-lg font-semibold text-white" href="tel:108">{t.callAmbulance}</a>{doc && <div className="rounded border p-4"><h2>{doc.name}</h2><p>{villageName(doc.village, snapshot.language)}</p><a className="text-primary underline" href={`tel:${doc.phone}`}>{t.call}</a></div>}</Page>;
}

export function Language({ snapshot, bridge }) {
  const t = patientText(snapshot.language);
  return <Page title={t.chooseLanguage} t={t}><div className="flex flex-wrap gap-3">{Object.entries(LANGS).map(([code, value]) => <Button key={code} variant={snapshot.language === code ? 'default' : 'outline'} lang={code} aria-pressed={snapshot.language === code} onClick={() => { bridge.current.preferences({ lang: code }); go(bridge, snapshot.session.role === 'anonymous' ? 'roles' : 'settings'); }}>{value.label}</Button>)}</div></Page>;
}

export function Intro({ snapshot, bridge }) {
  const t = patientText(snapshot.language), tour = LANGS[snapshot.language].tour, [step, setStep] = useState(0), [video, setVideo] = useState(false), seq = useRef(0);
  useEffect(() => () => { seq.current++; Voice.stop(); }, []);
  function finish() { seq.current++; Voice.stop(); bridge.current.preferences({ introSeen: true }); go(bridge, snapshot.session.role === 'patient' ? (snapshot.session.profile?.village ? 'home' : 'setup') : snapshot.session.role === 'anonymous' ? 'roles' : 'settings'); }
  async function play() { const token = ++seq.current; for (let i = step; i < tour.length; i++) { if (token !== seq.current) return; setStep(i); await Voice.say(tour[i].voice); } if (token === seq.current) finish(); }
  return <Page title={t.howToUse} t={t}><video key={snapshot.language} src={`/assets/intro-${snapshot.language}.mp4`} controls playsInline hidden={!video} onLoadedMetadata={() => setVideo(true)} onEnded={finish} className="w-full rounded" />{!video && <><div className="rounded border p-6 text-center"><span className="text-5xl" aria-hidden="true">{tour[step].icon}</span><p className="mt-4 text-lg">{tour[step].text}</p><p>{step + 1} / {tour.length}</p></div><Button onClick={play}>{t.listen}</Button></>}<div className="flex gap-3"><Button variant="outline" onClick={() => { seq.current++; Voice.stop(); if (step === tour.length - 1) finish(); else { setStep(step + 1); Voice.say(tour[step + 1].voice); } }}>{step === tour.length - 1 ? t.start : t.next}</Button><Button variant="outline" onClick={finish}>{t.skip}</Button></div></Page>;
}

export function Command({ snapshot, bridge }) {
  const t = patientText(snapshot.language), [text, setText] = useState(snapshot.params.text || ''), [listening, setListening] = useState(() => bridge.current.voiceStatus?.() === 'listening');
  useEffect(() => { setText(snapshot.params.text || ''); }, [snapshot.params.text]);
  useEffect(() => { const update = e => setListening(e.detail === 'listening'); document.addEventListener('arogya-voice-state', update); return () => { document.removeEventListener('arogya-voice-state', update); Voice.stop(); }; }, []);
  function submit(e) { e.preventDefault(); routeVoiceCommand(text.trim(), (s, p) => go(bridge, s, p), () => toast({ description: t.notUnderstood })); }
  return <Page title={t.command} t={t}><form onSubmit={submit} className="space-y-3"><Field label={t.commandLabel}><input className={inputClass} maxLength={300} autoComplete="off" value={text} onChange={e => setText(e.target.value)} /></Field><div className="flex flex-wrap gap-3"><Button type="submit">{t.continue}</Button><Button type="button" variant="outline" onClick={() => bridge.current.recordCommand()}>{t.speak}</Button><Button type="button" variant="outline" onClick={() => { Voice.stop(); setListening(false); }}>{t.cancel}</Button></div><p role="status">{listening ? t.listening : ''}</p><p className="text-sm">{t.commandHint}</p></form></Page>;
}
