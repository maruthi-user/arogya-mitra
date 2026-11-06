import React, { useMemo, useState } from 'react';
import { Plus, FileText, Upload } from 'lucide-react';
import { Button } from '@layout/ui/button';
import EmptyState from '@layout/blocks/EmptyState';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { SERVICE_KINDS, VILLAGES, BUSINESS_TYPES } from '../../services/reference-catalog';
import { config } from '../../config/runtime-config';
import { providerText } from '../../i18n/provider';
import { Page, useResource, Badge, formatWhen, DataList, ReasonDialog, Field, inputClass, ExpiryCountdown } from '../kit';
import ServiceEditor from './ServiceEditor';

const named = (item, language) => (item ? (language === 'te' ? item.te || item.en : item.en || item.te) : '');
const kindLabel = (kind, language) => { const row = SERVICE_KINDS.find(k => k[0] === kind); return row ? (language === 'te' ? row[1] : row[2]) : kind; };
const serviceTitle = (s, language) => (language === 'te' ? s.titleTe || s.title : s.title);
const failed = e => toast({ variant: 'destructive', description: e.message });
const go = (bridge, screen, params) => bridge?.current?.go(screen, params);

/** Tab strip used by several pages; `items` is [[id, label, count?], ...]. */
function Tabs({ items, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-fit">
      {items.map(([id, text, count]) => (
        <button key={id || 'all'} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${value === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {text}{count != null && <span className="ml-1 text-xs tabular-nums">{count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Account -> business -> services -> review, with the business status (provider overview and profile). */
/**
 * What the reviewer needs before the profile can be submitted. Mirrors the checks in
 * BusinessOnboardingService.validate so providers see what is missing before they press submit.
 */
const CLINICAL_TYPES = ['practitioner', 'hospital', 'clinic'];
function SubmissionChecklist({ values, business, pendingFiles, t }) {
  const items = [
    [t.checkName, !!values.organization?.trim()],
    [t.checkAddress, (values.address || '').trim().length >= 5],
    [t.checkLicense, !!values.registrationId?.trim()],
    ...(CLINICAL_TYPES.includes(values.businessType) ? [[t.checkQualification, ['mbbs', 'rmp', 'ayush'].includes(values.designation)]] : []),
    [t.checkDocuments, !!business?.documents?.length || !!pendingFiles?.length]
  ];
  const ready = items.every(([, done]) => done);
  return (
    <section className="rounded-lg border bg-card p-4" aria-labelledby="submission-checklist">
      <h2 id="submission-checklist" className="text-base font-semibold">{t.checklistTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.checklistWhy}</p>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {items.map(([label, done]) => (
          <li key={label} className="flex items-start gap-2 text-sm">
            <span aria-hidden="true" className={done ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}>{done ? '✓' : '○'}</span>
            <span>{label}<span className="sr-only"> — {done ? t.checkReady : t.checkMissing}</span></span>
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-sm font-medium ${ready ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-200'}`} role="status">{ready ? t.checkReady : `${t.checkMissing}: ${items.filter(([, d]) => !d).length}`}</p>
    </section>
  );
}

function SetupSteps({ business, t, bridge }) {
  const status = business?.status || 'draft';
  const steps = [[t.stepAccount, true, null], [t.stepBusiness, !!business?.organization, 'businessProfile'], [t.stepServices, null, 'careManage'], [t.stepSubmit, ['pending', 'approved'].includes(status), 'businessProfile']];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3" aria-label={t.setupProgress}>
      {steps.map(([label, done, screen], i) => (
        <button key={label} type="button" disabled={!screen} onClick={() => screen && go(bridge, screen)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${done ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-muted hover:bg-muted/70'}`}>
          <span className="text-xs">{done ? '✓' : i + 1}</span>{label}
        </button>
      ))}
      <Badge status={status} label={t.businessStatus[status] || status} />
    </div>
  );
}

/* ---------------- Overview (provider and admin) ---------------- */
export function CareOverview({ snapshot, bridge }) {
  const t = providerText(snapshot.language), role = snapshot.session.role;
  const resource = useResource(async () => {
    const [services, requests, applications, business] = await Promise.all([
      DataService.careServices(true), DataService.careRequests(),
      role === 'admin' ? DataService.applications() : [],
      role === 'provider' ? DataService.businessProfile(snapshot.session.subjectId) : null]);
    return { services, requests, applications, business };
  }, [role, snapshot.session.subjectId]);
  const d = resource.data;
  const metrics = d ? [
    [t.mTotalServices, d.services.length, 'careManage'],
    [t.mAwaitingServices, d.services.filter(s => s.approval === 'pending').length, 'careManage'],
    [t.mPendingRequests, d.requests.filter(r => r.status === 'pending').length, 'careManage', { tab: 'requests', status: 'pending' }],
    [t.mAcceptedRequests, d.requests.filter(r => r.status === 'accepted').length, 'careManage', { tab: 'requests' }],
    ...(role === 'admin' ? [
      [t.mAwaitingVerification, d.applications.filter(a => a.status === 'pending_verification').length, 'adminApplications'],
      [t.mAwaitingApproval, d.applications.filter(a => a.status === 'pending_admin').length, 'adminPendingProviders']] : [])
  ] : [];
  return (
    <Page icon="LayoutDashboard" title={t.overviewTitle} description={`${t.welcome}, ${snapshot.session.name || ''}. ${t.overviewHint}`} t={t} resource={resource}
      actions={role === 'provider' && d && !['pharmacy','laboratory','ambulance'].includes(d.business?.businessType) && <><Button variant="outline" onClick={() => go(bridge, 'schedule')}>{t.scheduleTitle}</Button><Button variant="outline" onClick={() => go(bridge, 'providerProfile')}>{t.profileTitle}</Button></>}>
      {d && <>
        {role === 'provider' && <SetupSteps business={d.business} t={t} bridge={bridge} />}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {metrics.map(([label, count, screen, params]) => (
            <button key={label} type="button" onClick={() => go(bridge, screen, params)}
              className="rounded-lg border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40">
              <span className="block text-3xl font-bold tabular-nums">{count}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </button>
          ))}
        </div>
      </>}
    </Page>
  );
}

/* ---------------- Services and request history (provider and admin) ---------------- */
export function CareServices({ snapshot, bridge }) {
  const t = providerText(snapshot.language), language = snapshot.language, role = snapshot.session.role;
  const tab = snapshot.params?.tab === 'requests' ? 'requests' : 'services';
  return (
    <div className="mx-auto w-full max-w-none space-y-4 p-4 sm:p-6">
      <Tabs label={t.servicesTitle} value={tab} onChange={id => go(bridge, 'careManage', id === 'requests' ? { tab: 'requests' } : {})}
        items={[['services', t.servicesTab], ['requests', t.requestsTab]]} />
      {tab === 'requests'
        ? <RequestHistory key={snapshot.params?.status || 'all'} t={t} language={language} role={role} initialStatus={snapshot.params?.status === 'pending' ? 'pending' : ''} />
        : <ServiceDirectory t={t} language={language} role={role} snapshot={snapshot} bridge={bridge} />}
    </div>
  );
}

function ServiceDirectory({ t, language, role, snapshot, bridge }) {
  const admin = role === 'admin';
  const resource = useResource(async () => {
    const [services, staff, business, organisations] = await Promise.all([
      DataService.careServices(true), DataService.careStaffList(),
      admin ? null : DataService.businessProfile(snapshot.session.subjectId),
      admin ? DataService.careOrganisations() : []]);
    return { services, staff, business, organisations };
  }, [role, snapshot.session.subjectId]);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null); // null = list, {} = new, service = edit
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState('');
  const d = resource.data;
  const rows = (d?.services || []).filter(s => !filter || s.approval === filter);
  const count = s => (d?.services || []).filter(x => !s || x.approval === s).length;

  async function toggleAvailability(s) {
    setBusy(s.id);
    try { await DataService.careAvailability(s.id, { available: !s.available, active: s.active }); toast({ description: t.availabilityUpdated }); await resource.reload(); }
    catch (e) { failed(e); } finally { setBusy(''); }
  }
  if (editing && d) {
    return <ServiceEditor service={editing.id ? editing : null} admin={admin} business={d.business ? { ...d.business, providerId: snapshot.session.subjectId } : null}
      organisations={d.organisations} practitioners={d.staff} t={t} language={language}
      onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await resource.reload(); try { await bridge?.current?.refresh(); } catch { /* list already reloaded */ } }} />;
  }
  return (
    <Page icon="Layers" title={t.servicesTitle} t={t} resource={resource} width="max-w-none p-0 sm:p-0"
      actions={<Button onClick={() => setEditing({})} disabled={!d}><Plus className="mr-2 h-4 w-4" />{t.addService}</Button>}>
      {d && <>
        <Tabs label={t.status} value={filter} onChange={setFilter} items={[['', t.all, count('')], ['pending', t.serviceStatus.pending, count('pending')], ['approved', t.serviceStatus.approved, count('approved')], ['rejected', t.serviceStatus.rejected, count('rejected')], ['draft', t.serviceStatus.draft, count('draft')]]} />
        {!d.services.length ? <EmptyState icon="Layers" title={t.noServices} description={t.noServicesHint} action={<Button onClick={() => setEditing({})}>{t.addService}</Button>} />
          : !rows.length ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t.noMatching}</p>
          : <DataList caption={t.servicesTitle} rows={rows} columns={[
            { key: 'title', label: t.service, render: s => <div><p className="font-medium">{serviceTitle(s, language)}</p><p className="text-xs text-muted-foreground">{s.organization}</p></div> },
            { key: 'kind', label: t.type, render: s => kindLabel(s.kind, language) },
            { key: 'fee', label: t.fee, className: 'tabular-nums', render: s => s.feeOnRequest ? t.onRequest : `₹${s.totalFee ?? s.fee}` },
            { key: 'practitionerName', label: t.practitioner },
            { key: 'approval', label: t.status, render: s => <div className="space-y-1"><Badge status={s.approval} label={t.serviceStatus[s.approval] || s.approval} />
                <Badge status={s.available ? 'active' : 'draft'} label={s.available ? t.accepting : t.paused} />{s.reviewReason && <p className="text-xs text-muted-foreground">{s.reviewReason}</p>}</div> },
            { key: 'actions', label: '', render: s => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>{t.edit}</Button>
                <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => toggleAvailability(s)}>{s.available ? t.pause : t.resume}</Button>
                {admin && s.approval === 'pending' && <>
                  <Button size="sm" onClick={() => setReview({ id: s.id, decision: 'approved', title: s.title })}>{t.approve}</Button>
                  <Button size="sm" variant="destructive" onClick={() => setReview({ id: s.id, decision: 'rejected', title: s.title })}>{t.reject}</Button>
                </>}
              </div>) }
          ]} />}
      </>}
      <ReasonDialog open={!!review} t={t} destructive={review?.decision === 'rejected'} description={review?.title}
        title={review?.decision === 'approved' ? t.approveService : t.rejectService} confirmLabel={review?.decision === 'approved' ? t.approve : t.reject}
        onClose={() => setReview(null)}
        onConfirm={async reason => { await DataService.careReview(review.id, { decision: review.decision, reason }); toast({ description: review.decision === 'approved' ? t.serviceApproved : t.serviceRejected }); await resource.reload(); }} />
    </Page>
  );
}

function RequestHistory({ t, language, role, initialStatus }) {
  const resource = useResource(() => DataService.careRequests(), []);
  const [status, setStatus] = useState(initialStatus);
  const [reasonFor, setReasonFor] = useState(null);
  const [busy, setBusy] = useState('');
  const all = resource.data || [];
  const rows = all.filter(r => !status || r.status === status);
  const count = s => all.filter(r => !s || r.status === s).length;
  async function change(r, next) {
    setBusy(r.id + next);
    try { await DataService.careStatus(r.id, { status: next, note: '' }); toast({ description: t.requestUpdated }); await resource.reload(); } catch (e) { failed(e); } finally { setBusy(''); }
  }
  const provider = role === 'provider';
  return (
    <Page icon="ClipboardList" title={t.requestsTitle} description={t.requestsHint} t={t} resource={resource} width="max-w-none p-0 sm:p-0" empty={t.noRequests}>
      {!!all.length && <>
        <Tabs label={t.status} value={status} onChange={setStatus}
          items={[['', t.all, count('')], ...['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'].map(s => [s, t.requestStatus[s], count(s)])]} />
        <DataList caption={t.requestsTitle} rows={rows} columns={[
          { key: 'title', label: t.service, render: r => <div><p className="font-medium">{serviceTitle(r, language)}</p><p className="text-xs text-muted-foreground">{kindLabel(r.kind, language)} ? {r.organization}</p></div> },
          { key: 'date', label: t.when, render: r => r.date + ' ' + r.time },
          { key: 'status', label: t.status, render: r => <Badge status={r.status} label={t.requestStatus[r.status] || r.status} /> },
          { key: 'patientName', label: t.patient, render: r => <div>{r.patientName}<a className="block text-primary underline" href={'tel:'+r.phone}>{r.phone}</a></div> },
          { key: 'address', label: t.address },
          { key: 'details', label: t.details, render: r => <div><p>{r.details}</p><p>{r.mode === 'callback' ? t.callback : t.serviceRequested}</p><p>{r.feeOnRequest ? t.feeOnRequest : '₹'+r.fee}</p></div> },
          { key: 'id', label: t.reference },
          { key: 'history', label: t.timeline, render: r => <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">{t.timeline}</summary>
                  <ol className="mt-2 space-y-1 border-l pl-3">{r.history.map((h, i) => (
                    <li key={i}><span className="font-medium">{t.requestStatus[h.status] || h.status}</span> · <span className="text-xs text-muted-foreground">{formatWhen(h.at, language)}</span>{h.note && <p className="text-xs">{h.note}</p>}</li>))}</ol>
                </details> },
          { key: 'actions', label: '', render: r => <div className="flex flex-wrap gap-2">
                {provider && r.status === 'pending' && <>
                  <Button size="sm" disabled={!!busy} onClick={() => change(r, 'accepted')}>{t.accept}</Button>
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setReasonFor({ r, next: 'rejected' })}>{t.decline}</Button>
                </>}
                {provider && r.status === 'accepted' && <Button size="sm" disabled={!!busy} onClick={() => change(r, 'in_progress')}>{t.start}</Button>}
                {provider && r.status === 'in_progress' && <Button size="sm" disabled={!!busy} onClick={() => change(r, 'completed')}>{t.complete}</Button>}
                {((provider ? ['accepted', 'in_progress'] : ['pending', 'accepted', 'in_progress']).includes(r.status)) && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setReasonFor({ r, next: 'cancelled' })}>{t.cancelRequest}</Button>}
              </div> }
        ]} />
      </>}
      <ReasonDialog open={!!reasonFor} t={t} destructive title={reasonFor?.next === 'rejected' ? t.declineTitle : t.cancelTitle}
        description={reasonFor && `${serviceTitle(reasonFor.r, language)} · ${reasonFor.r.id}`} confirmLabel={reasonFor?.next === 'rejected' ? t.decline : t.cancelRequest}
        onClose={() => setReasonFor(null)}
        onConfirm={async note => { await DataService.careStatus(reasonFor.r.id, { status: reasonFor.next, note }); toast({ description: t.requestUpdated }); await resource.reload(); }} />
    </Page>
  );
}

/* ---------------- Business profile (provider) ---------------- */
async function readDocuments(files, t) {
  const list = Array.from(files || []);
  if (list.length > 3 || list.some(f => f.size > 1048576)) throw new Error(t.tooManyFiles);
  return Promise.all(list.map(f => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: f.name, type: f.type, content: String(reader.result).split(',')[1] });
    reader.onerror = reject; reader.readAsDataURL(f);
  })));
}

export function BusinessProfile({ snapshot, bridge }) {
  const t = providerText(snapshot.language), language = snapshot.language, id = snapshot.session.subjectId;
  const resource = useResource(() => DataService.businessProfile(id), [id]);
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const b = resource.data;
  const values = form || (b && { businessType: b.businessType || BUSINESS_TYPES[0]?.id || 'practitioner', organization: b.organization || '', address: b.address || '',
    village: b.village || VILLAGES[0]?.id || '', designation: b.designation || 'not_applicable', registrationId: b.registrationId || '', active: b.active ?? true });
  const set = patch => setForm({ ...values, ...patch });
  const locked = b?.status === 'pending';

  async function run(work, message) {
    setBusy(true); setError('');
    try { await work(); toast({ description: message }); setForm(null); setFiles(null); await resource.reload(); try { await bridge?.current?.refresh(); } catch { /* page already reloaded */ } }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const save = event => { event.preventDefault(); run(async () => DataService.businessSave(id, { ...values, documents: await readDocuments(files, t) }), t.businessSaved); };

  return (
    <Page icon="Building2" title={t.businessTitle} description={t.businessHint} t={t} resource={resource}>
      {b && <>
        <SetupSteps business={b} t={t} bridge={bridge} />
        {!['pending', 'approved'].includes(b.status) && <SubmissionChecklist values={values} business={b} pendingFiles={files} t={t} />}
        {b.reviewReason && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><strong>{t.reviewFeedback}: </strong>{b.reviewReason}</div>}
        {locked && <p className="rounded-md bg-muted px-3 py-2 text-sm">{t.lockedPending}</p>}
        <form onSubmit={save} className="rounded-lg border bg-card p-4">
          <fieldset disabled={locked || busy} className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 text-lg font-semibold">{b.organization || t.addBusiness}</legend>
            <Field label={t.businessType}><select className={inputClass} value={values.businessType} onChange={e => set({ businessType: e.target.value })}>{BUSINESS_TYPES.map(x => <option key={x.id} value={x.id}>{named(x, language)}</option>)}</select></Field>
            <Field label={t.businessName}><input className={inputClass} maxLength={100} value={values.organization} onChange={e => set({ organization: e.target.value })} /></Field>
            <Field label={t.address}><input className={inputClass} maxLength={300} value={values.address} onChange={e => set({ address: e.target.value })} /></Field>
            <Field label={t.village}><select className={inputClass} value={values.village} onChange={e => set({ village: e.target.value })}>{VILLAGES.map(v => <option key={v.id} value={v.id}>{named(v, language)}</option>)}</select></Field>
            <Field label={t.qualification}>
              <select className={inputClass} value={values.designation} onChange={e => set({ designation: e.target.value })}>
                <option value="not_applicable">{t.notApplicable}</option><option value="mbbs">MBBS</option><option value="rmp">RMP</option><option value="ayush">AYUSH</option>
              </select>
            </Field>
            <Field label={t.license}><input className={inputClass} maxLength={100} value={values.registrationId} onChange={e => set({ registrationId: e.target.value })} /></Field>
            <Field label={t.documents} hint={t.documentsHint}><input className={`${inputClass} pt-1.5`} type="file" multiple accept="application/pdf,image/png,image/jpeg" onChange={e => setFiles(e.target.files)} /></Field>
            <Field label={t.businessActive}><select className={inputClass} value={String(values.active)} onChange={e => set({ active: e.target.value === 'true' })}><option value="true">{t.yes}</option><option value="false">{t.no}</option></select></Field>
            {!!b.documents?.length && (
              <ul className="flex flex-wrap gap-2 sm:col-span-2">{b.documents.map(doc => (
                <li key={doc.id}><a className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted" target="_blank" rel="noopener"
                  href={`${config.apiBaseUrl}/onboarding/businesses/${encodeURIComponent(id)}/documents/${encodeURIComponent(doc.id)}`}><FileText className="h-4 w-4" />{doc.name}</a></li>))}</ul>
            )}
            {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit"><Upload className="mr-2 h-4 w-4" />{busy ? t.saving : t.saveBusiness}</Button>
              <Button type="button" variant="outline" onClick={() => go(bridge, 'careManage')}>{t.addService}</Button>
              {['draft', 'rejected'].includes(b.status) && <Button type="button" variant="outline" onClick={() => run(() => DataService.businessSubmit(id), t.businessSubmitted)}>{t.submitBusiness}</Button>}
            </div>
          </fieldset>
        </form>
      </>}
    </Page>
  );
}

/* ---------------- Notifications (provider) ---------------- */
export function ProviderNotifications({ snapshot }) {
  const t = providerText(snapshot.language);
  const resource = useResource(() => DataService.providerNotifications(), []);
  const label = n => {
    const [area, ...rest] = n.action.split('.'), action = rest.pop();
    return `${t.nArea[area] || t.nArea.other} · ${t.nAction[action] || t.nAction.other}`;
  };
  return (
    <Page icon="Bell" title={t.notificationsTitle} t={t} resource={resource} empty={t.noNotifications} emptyIcon="Bell">
      {!!resource.data?.length && <DataList caption={t.notificationsTitle} rows={resource.data} getKey={n => n.action + n.at} columns={[
        { key: 'action', label: t.update, render: n => <span className="font-medium">{label(n)}</span> },
        { key: 'reason', label: t.reason },
        { key: 'at', label: t.time, render: n => formatWhen(n.at, snapshot.language) }
      ]} />}
    </Page>
  );
}

/* ---------------- Appointments (hospital providers) ---------------- */
export function ProviderAppointments({ snapshot }) {
  const t = providerText(snapshot.language), language = snapshot.language, me = snapshot.session.subjectId;
  const resource = useResource(async () => (await DataService.load()).bookings.filter(b => b.pid === me), [me]);
  const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [sort, setSort] = useState('date'), [busy, setBusy] = useState('');
  const rows = useMemo(() => (resource.data || [])
    .filter(b => (!status || b.status === status) && (!query || `${b.name} ${b.reason || ''} ${b.date}`.toLowerCase().includes(query.toLowerCase())))
    .sort(sort === 'newest' ? (a, b) => (b.createdAt || 0) - (a.createdAt || 0) : (a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [resource.data, status, query, sort]);
  const past = b => new Date(`${b.date}T${b.time}+05:30`).getTime() <= Date.now();
  async function change(b, next) {
    setBusy(b.id + next);
    try { await DataService.status(b.id, next, { role: 'provider', id: me }); await resource.reload(); } catch (e) { failed(e); } finally { setBusy(''); }
  }
  return (
    <Page icon="CalendarDays" title={t.appointmentsTitle} t={t} resource={resource} empty={t.noAppointments} emptyIcon="CalendarDays">
      {!!resource.data?.length && <>
        <div className="grid gap-2 sm:grid-cols-[1fr_200px_200px]">
          <input type="search" aria-label={t.search} placeholder={t.search} className={inputClass} value={query} onChange={e => setQuery(e.target.value)} />
          <select aria-label={t.status} className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">{t.all}</option>{Object.entries(t.appointmentStatus).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select aria-label={t.sort} className={inputClass} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="date">{t.sortDate}</option><option value="newest">{t.sortNewest}</option>
          </select>
        </div>
        <DataList showSearch={false} caption={t.appointmentsTitle} rows={rows} columns={[
          { key: 'name', label: t.patient, render: b => <div><p className="font-medium">{b.name}</p>{b.phone && <a className="text-xs text-primary" href={`tel:${b.phone}`}>{b.phone}</a>}</div> },
          { key: 'date', label: t.when, render: b => `${b.date} ${b.time}` },
          { key: 'status', label: t.status, render: b => <><Badge status={b.status} label={t.appointmentStatus[b.status] || b.status} /><ExpiryCountdown status={b.status} expiresAt={b.expiresAt} language={language} /></> },
          { key: 'reason', label: t.reason },
          { key: 'actions', label: '', render: b => (
            <div className="flex flex-wrap justify-end gap-2">
              {b.status === 'pending' && <><Button size="sm" disabled={!!busy} onClick={() => change(b, 'confirmed')}>{t.accept}</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={() => change(b, 'declined')}>{t.decline}</Button></>}
              {b.status === 'confirmed' && past(b) && <><Button size="sm" disabled={!!busy} onClick={() => change(b, 'done')}>{t.done}</Button><Button size="sm" variant="outline" disabled={!!busy} onClick={() => change(b, 'no_show')}>{t.noShow}</Button></>}
              {['pending', 'confirmed'].includes(b.status) && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => change(b, 'cancelled')}>{t.cancelRequest}</Button>}
            </div>) },
          { key: 'history', label: t.history, render: b => !!b.history?.length && (
            <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">{t.timeline}</summary>
              {b.history.map((h, i) => <p key={i}>{t.appointmentStatus[h.status] || h.status} · {formatWhen(h.at, language)}</p>)}</details>) }
        ]} />
      </>}
    </Page>
  );
}

/* ---------------- Team (provider) ---------------- */
export function ProviderTeam({ snapshot }) {
  const t = providerText(snapshot.language), me = snapshot.session.subjectId;
  const resource = useResource(() => DataService.careStaffList(), [me]);
  const [form, setForm] = useState({ name: '', username: '', email: '' });
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const staffStatus = s => (s.suspended ? 'suspended' : s.active ? 'active' : 'awaiting');
  async function invite(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await DataService.careStaff({ providerId: me, name: form.name.trim(), username: form.username.trim(), email: form.email.trim() }); setForm({ name: '', username: '', email: '' }); toast({ description: t.invited }); await resource.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Page icon="Users" title={t.teamTitle} description={t.teamHint} t={t} resource={resource} empty={t.noStaff} emptyIcon="Users">
      <form onSubmit={invite} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <Field label={t.name}><input className={inputClass} required maxLength={80} value={form.name} disabled={busy} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t.username} hint={t.usernameHint}><input className={inputClass} required pattern="[a-z0-9_.\-]{3,50}" value={form.username} disabled={busy} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} /></Field>
        <Field label={t.email}><input className={inputClass} type="email" required maxLength={100} value={form.email} disabled={busy} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Button type="submit" disabled={busy}>{busy ? t.saving : t.invite}</Button>
        {error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}
      </form>
      {!!resource.data?.length && <DataList caption={t.teamTitle} rows={resource.data} columns={[
        { key: 'name', label: t.name, render: s => <span className="font-medium">{s.name}</span> },
        { key: 'username', label: t.username, render: s => `@${s.username}` },
        { key: 'email', label: t.email, render: s => <span className="break-all">{s.email}</span> },
        { key: 'status', label: t.status, render: s => <Badge status={staffStatus(s)} label={t.staffStatus[staffStatus(s)]} /> }
      ]} />}
    </Page>
  );
}

/* ---------------- Schedule and profile (single-provider appointment settings) ---------------- */
function useOwnProvider(me) {
  return useResource(async () => (await DataService.load()).providers.find(p => p.id === me) || null, [me]);
}

export function ProviderSchedule({ snapshot }) {
  const t = providerText(snapshot.language), me = snapshot.session.subjectId;
  const resource = useOwnProvider(me);
  const [slots, setSlots] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const p = resource.data;
  const value = slots ?? (p?.slots || []).join(', ');
  async function save(event) {
    event.preventDefault(); setError('');
    const list = value.split(',').map(x => x.trim()).filter(Boolean);
    if (!list.every(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x))) { setError(t.invalidTimes); return; }
    setBusy(true);
    try { await DataService.profile(me, { slots: list, fee: p.fee || 0, services: p.services || '' }); toast({ description: t.scheduleSaved }); setSlots(null); await resource.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Page icon="Clock" title={t.scheduleTitle} description={t.scheduleHint} t={t} resource={resource}>
      {resource.data === null && !resource.loading ? <p className="text-sm text-muted-foreground">{t.noProvider}</p> : p && (
        <form onSubmit={save} className="space-y-3 rounded-lg border bg-card p-4">
          <Field label={t.times} hint={t.scheduleNote}><input className={inputClass} value={value} onChange={e => setSlots(e.target.value)} /></Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={busy}>{busy ? t.saving : t.saveSchedule}</Button>
        </form>
      )}
    </Page>
  );
}

export function ProviderProfile({ snapshot }) {
  const t = providerText(snapshot.language), me = snapshot.session.subjectId;
  const resource = useOwnProvider(me);
  const [form, setForm] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const p = resource.data;
  const values = form || (p && { services: p.services || '', fee: String(p.fee || 0) });
  async function toggleAppointments() {
    setBusy(true); setError('');
    try { await DataService.open(me, !p.open); await resource.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await DataService.profile(me, { slots: p.slots, fee: Number(values.fee), services: values.services.trim() }); toast({ description: t.profileSaved }); setForm(null); await resource.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Page icon="User" title={t.profileTitle} description={t.profileNote} t={t} resource={resource}>
      {resource.data === null && !resource.loading ? <p className="text-sm text-muted-foreground">{t.noProvider}</p> : p && (
        <form onSubmit={save} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">{p.name}</h2>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><Badge status={p.open ? 'active' : 'draft'} label={p.open ? t.appointmentsOpen : t.appointmentsClosed} /><Button type="button" variant="outline" disabled={busy} onClick={toggleAppointments}>{p.open ? t.closeAppointments : t.openAppointments}</Button></div>
          <Field label={t.servicesLabel}><input className={inputClass} maxLength={200} value={values.services} onChange={e => setForm({ ...values, services: e.target.value })} /></Field>
          <Field label={t.feeRupees}><input className={inputClass} type="number" min={0} max={100000} value={values.fee} onChange={e => setForm({ ...values, fee: e.target.value })} /></Field>
          {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? t.saving : t.saveProfile}</Button></div>
        </form>
      )}
    </Page>
  );
}
