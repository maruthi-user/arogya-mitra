import React, { useMemo, useState } from 'react';
import { FileText, Plus, Mail } from 'lucide-react';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { MEDICINES, VILLAGES, BUSINESS_TYPES } from '../../services/reference-catalog';
import { config } from '../../config/runtime-config';
import { adminText } from '../../i18n/admin';
import { Page, useResource, Badge, formatWhen, DataList, ReasonDialog, Field, inputClass } from '../kit';

const named = (item, language) => (item ? (language === 'te' ? item.te || item.en : item.en || item.te) : '');
const statusLabel = (t, s) => t.statusLabels[s] || String(s || '').replaceAll('_', ' ');
const failed = e => toast({ variant: 'destructive', description: e.message });

/* ---------------- Email notifications ---------------- */
export function AdminNotifications({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.notifications());
  const [busy, setBusy] = useState(null);
  async function retry(id) {
    setBusy(id);
    try { await DataService.retryNotification(id); toast({ description: t.retried }); await resource.reload(); } catch (e) { failed(e); } finally { setBusy(null); }
  }
  return (
    <Page icon="Mail" title={t.notificationsTitle} description={t.notificationsHint} t={t} resource={resource} empty={t.noNotifications} emptyIcon="Mail">
      {!!resource.data?.length && (
        <DataList caption={t.notificationsTitle} rows={resource.data} columns={[
          { key: 'recipient', label: t.recipient, render: n => <span className="break-all">{n.recipient}</span> },
          { key: 'subject', label: t.subject },
          { key: 'status', label: t.status, render: n => <Badge status={n.status} label={statusLabel(t, n.status)} /> },
          { key: 'attempts', label: t.attempts, className: 'tabular-nums' },
          { key: 'updatedAt', label: t.updated, render: n => formatWhen(n.updatedAt, language) },
          { key: 'action', label: '', render: n => n.status === 'failed'
            ? <Button size="sm" variant="outline" disabled={busy === n.id} onClick={() => retry(n.id)}>{busy === n.id ? t.saving : t.retrySend}</Button> : null }
        ]} />
      )}
    </Page>
  );
}

/* ---------------- Audit history ---------------- */
export function AdminAudit({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.audit());
  const [query, setQuery] = useState('');
  const rows = useMemo(() => (resource.data || []).filter(a => !query || JSON.stringify(a).toLowerCase().includes(query.toLowerCase())), [resource.data, query]);
  return (
    <Page icon="History" title={t.auditTitle} description={t.auditHint} t={t} resource={resource} empty={t.noAudit} emptyIcon="History">
      {!!resource.data?.length && <>
        <input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={e => setQuery(e.target.value)} className={`${inputClass} max-w-sm`} />
        <DataList caption={t.auditTitle} rows={rows} getKey={(a, i) => a.createdAt + a.action + a.resourceId} columns={[
          { key: 'action', label: t.action, render: a => <code className="text-xs">{a.action}</code> },
          { key: 'actorId', label: t.actor, render: a => <span className="break-all text-xs">{a.actorId}</span> },
          { key: 'resourceId', label: t.resource, render: a => <span className="break-all text-xs text-muted-foreground">{a.resourceId}</span> },
          { key: 'detail', label: t.detail },
          { key: 'createdAt', label: t.time, render: a => formatWhen(a.createdAt, language) }
        ]} />
      </>}
    </Page>
  );
}

/* ---------------- Pharmacy stock ---------------- */
export function AdminPharmacies({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.adminPharmacies());
  const [form, setForm] = useState({ name: '', phone: '', village: VILLAGES[0]?.id || '' });
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [toggling, setToggling] = useState('');
  async function add(event) {
    event.preventDefault(); setError('');
    if (!/^(\+91)?[6-9][0-9]{9}$/.test(form.phone.replace(/[\s-]/g, ''))) { setError(t.phoneInvalid); return; }
    setSaving(true);
    try { await DataService.createPharmacy({ ...form, name: form.name.trim(), phone: form.phone.replace(/[\s-]/g, '') }); setForm(f => ({ ...f, name: '', phone: '' })); toast({ description: t.pharmacyAdded }); await resource.reload(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function toggle(pharmacy, medicine) {
    const key = pharmacy.id + medicine;
    setToggling(key);
    // Optimistic: flip locally, roll back if the server refuses.
    const flip = available => resource.setData(list => list.map(p => p.id === pharmacy.id ? { ...p, stock: { ...p.stock, [medicine]: available } } : p));
    const next = !pharmacy.stock?.[medicine];
    flip(next);
    try { await DataService.stock(pharmacy.id, medicine, next); } catch (e) { flip(!next); failed(e); } finally { setToggling(''); }
  }
  return (
    <Page icon="Pill" title={t.pharmaciesTitle} t={t} resource={resource} empty={t.noPharmacies} emptyIcon="Pill">
      <form onSubmit={add} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
        <div className="md:col-span-4"><h2 className="font-semibold">{t.addPharmacy}</h2><p className="text-sm text-muted-foreground">{t.addPharmacyHint}</p></div>
        <Field label={t.pharmacyName}><input className={inputClass} required maxLength={100} value={form.name} disabled={saving} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t.phone}><input className={inputClass} type="tel" required inputMode="tel" value={form.phone} disabled={saving} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={t.village}>
          <select className={inputClass} value={form.village} disabled={saving} onChange={e => setForm({ ...form, village: e.target.value })}>
            {VILLAGES.map(v => <option key={v.id} value={v.id}>{named(v, language)}</option>)}
          </select>
        </Field>
        <Button type="submit" disabled={saving}><Plus className="mr-2 h-4 w-4" />{saving ? t.saving : t.add}</Button>
        {error && <p role="alert" className="text-sm text-red-600 md:col-span-4">{error}</p>}
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {(resource.data || []).map(p => (
          <section key={p.id} className="rounded-lg border bg-card p-4" aria-label={p.name}>
            <h2 className="font-semibold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.phone} · {named(VILLAGES.find(v => v.id === p.village), language) || p.village}</p>
            <ul className="mt-3 divide-y">
              {MEDICINES.map(m => {
                const available = !!p.stock?.[m.id];
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>{named(m, language)}</span>
                    <button type="button" role="switch" aria-checked={available} aria-label={`${named(m, language)}: ${available ? t.inStock : t.notInStock}`}
                      disabled={toggling === p.id + m.id} onClick={() => toggle(p, m.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${available ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-muted text-muted-foreground ring-border'}`}>
                      {available ? t.inStock : t.notInStock}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}

/* ---------------- Medicine inquiries ---------------- */
export function AdminMedicineRequests({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.medicineRequests());
  const [busy, setBusy] = useState(null);
  async function update(id, status) {
    setBusy(id + status);
    try { await DataService.updateMedicineRequest(id, status); await resource.reload(); } catch (e) { failed(e); } finally { setBusy(null); }
  }
  return (
    <Page icon="MessageSquare" title={t.requestsTitle} t={t} resource={resource} empty={t.noRequests} emptyIcon="MessageSquare">
      {!!resource.data?.length && (
        <DataList caption={t.requestsTitle} rows={resource.data} columns={[
          { key: 'patientName', label: t.patient },
          { key: 'pharmacyName', label: t.pharmacy },
          { key: 'medicine', label: t.medicine, render: r => named(MEDICINES.find(m => m.id === r.medicineId), language) || r.medicineId },
          { key: 'message', label: t.message },
          { key: 'status', label: t.status, render: r => <Badge status={r.status} label={statusLabel(t, r.status)} /> },
          { key: 'action', label: '', render: r => r.status === 'resolved' ? null : (
            <div className="flex flex-wrap justify-end gap-2">
              {r.status === 'requested' && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => update(r.id, 'contacted')}>{t.contacted}</Button>}
              <Button size="sm" disabled={!!busy} onClick={() => update(r.id, 'resolved')}>{t.resolved}</Button>
            </div>) }
        ]} />
      )}
    </Page>
  );
}

/* ---------------- Business reviews ---------------- */
export function AdminBusinessReviews({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.businessQueue());
  const [filter, setFilter] = useState('pending');
  const [decision, setDecision] = useState(null);
  const rows = (resource.data || []).filter(b => !filter || b.status === filter);
  const counts = s => (resource.data || []).filter(b => !s || b.status === s).length;
  return (
    <Page icon="FileCheck" title={t.businessTitle} description={t.businessHint} t={t} resource={resource} empty={t.noBusinesses} emptyIcon="Building2">
      {!!resource.data?.length && <>
        <div role="tablist" className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-fit">
          {[['pending', t.statusLabels.pending], ['approved', t.statusLabels.approved], ['rejected', t.statusLabels.rejected], ['', t.all]].map(([id, label]) => (
            <button key={id || 'all'} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${filter === id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {label} <span className="ml-1 text-xs tabular-nums">{counts(id)}</span>
            </button>
          ))}
        </div>
        {!rows.length && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{t.noBusinesses}</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map(b => (
            <article key={b.providerId} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{b.organization || b.name}</h2>
                <Badge status={b.status} label={statusLabel(t, b.status)} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t.type}</dt><dd>{named(BUSINESS_TYPES.find(x => x.id === b.businessType), language) || b.businessType}</dd>
                <dt className="text-muted-foreground">{t.address}</dt><dd>{[b.address, named(VILLAGES.find(v => v.id === b.village), language) || b.village].filter(Boolean).join(' · ')}</dd>
                <dt className="text-muted-foreground">{t.license}</dt><dd>{[b.registrationId, b.designation].filter(Boolean).join(' · ')}</dd>
              </dl>
              {b.reviewReason && <p className="rounded-md bg-muted px-3 py-2 text-sm"><span className="text-xs text-muted-foreground">{t.feedback}: </span>{b.reviewReason}</p>}
              {!!b.documents?.length && (
                <ul className="flex flex-wrap gap-2">{b.documents.map(d => (
                  <li key={d.id}><a className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted" target="_blank" rel="noopener"
                    href={`${config.apiBaseUrl}/onboarding/businesses/${encodeURIComponent(b.providerId)}/documents/${encodeURIComponent(d.id)}`}><FileText className="h-4 w-4" />{d.name}</a></li>))}</ul>
              )}
              {b.status === 'pending' && (
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button onClick={() => setDecision({ id: b.providerId, decision: 'approved', name: b.organization || b.name })}>{t.approve}</Button>
                  <Button variant="outline" onClick={() => setDecision({ id: b.providerId, decision: 'rejected', name: b.organization || b.name })}>{t.requestChanges}</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </>}
      <ReasonDialog open={!!decision} t={t} destructive={decision?.decision === 'rejected'}
        title={decision?.decision === 'approved' ? t.approveBusiness : t.requestBusinessChanges} description={decision?.name}
        confirmLabel={decision?.decision === 'approved' ? t.approve : t.requestChanges}
        onClose={() => setDecision(null)}
        onConfirm={async reason => { await DataService.businessReview(decision.id, { decision: decision.decision, reason }); toast({ description: t.decisionSaved }); await resource.reload(); }} />
    </Page>
  );
}

/* ---------------- Organisations & staff ---------------- */
export function AdminOrganisations({ language }) {
  const t = adminText(language);
  const resource = useResource(() => DataService.careOrganisations());
  const [change, setChange] = useState(null);
  const [form, setForm] = useState({ providerId: '', name: '', username: '', email: '' });
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  // One row per organisation account; the invite list offers each active organisation once.
  const organisations = useMemo(() => [...new Map((resource.data || []).filter(o => o.active && !o.suspended).map(o => [o.providerId, o])).values()], [resource.data]);
  const orgStatus = o => (o.suspended ? 'suspended' : o.active ? 'active' : 'awaiting');
  async function invite(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await DataService.careStaff({ ...form, providerId: form.providerId || organisations[0]?.providerId, name: form.name.trim(), email: form.email.trim() });
      setForm(f => ({ ...f, name: '', username: '', email: '' })); toast({ description: t.invited }); await resource.reload();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return (
    <Page icon="Building2" title={t.orgsTitle} description={t.orgsHint} t={t} resource={resource} empty={t.noOrgs} emptyIcon="Building2">
      {!!resource.data?.length && (
        <DataList caption={t.orgsTitle} rows={resource.data} columns={[
          { key: 'name', label: t.name, render: o => <span className="font-medium">{o.name}</span> },
          { key: 'username', label: t.username, render: o => <span className="text-muted-foreground">@{o.username}</span> },
          { key: 'email', label: t.email, render: o => <span className="break-all">{o.email}</span> },
          { key: 'status', label: t.status, render: o => <Badge status={orgStatus(o)} label={statusLabel(t, orgStatus(o))} /> },
          { key: 'action', label: '', render: o => (
            <Button size="sm" variant={o.suspended ? 'outline' : 'destructive'} onClick={() => setChange({ id: o.providerId, suspend: !o.suspended, name: o.name })}>
              {o.suspended ? t.reactivate : t.suspend}
            </Button>) }
        ]} />
      )}
      {organisations.length > 0 && (
        <form onSubmit={invite} className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
          <div className="md:col-span-2"><h2 className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" />{t.inviteStaff}</h2><p className="text-sm text-muted-foreground">{t.inviteHint}</p></div>
          <Field label={t.organisation}>
            <select className={inputClass} value={form.providerId || organisations[0]?.providerId} disabled={saving} onChange={e => setForm({ ...form, providerId: e.target.value })}>
              {organisations.map(o => <option key={o.providerId} value={o.providerId}>{o.name}</option>)}
            </select>
          </Field>
          <Field label={t.name}><input className={inputClass} required maxLength={80} value={form.name} disabled={saving} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label={t.username} hint={t.usernameHint}><input className={inputClass} required pattern="[a-z0-9_.\-]{3,50}" value={form.username} disabled={saving} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} /></Field>
          <Field label={t.email}><input className={inputClass} type="email" required maxLength={100} value={form.email} disabled={saving} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
          {error && <p role="alert" className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <div className="md:col-span-2"><Button type="submit" disabled={saving}>{saving ? t.saving : t.sendInvite}</Button></div>
        </form>
      )}
      <ReasonDialog open={!!change} t={t} destructive={change?.suspend}
        title={change?.suspend ? t.suspendTitle : t.reactivateTitle} description={change?.name}
        confirmLabel={change?.suspend ? t.suspend : t.reactivate}
        onClose={() => setChange(null)}
        onConfirm={async reason => { await DataService.careSuspend(change.id, { suspended: change.suspend, reason }); toast({ description: change.suspend ? t.suspendedDone : t.reactivatedDone }); await resource.reload(); }} />
    </Page>
  );
}
