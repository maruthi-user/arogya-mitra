import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, FileText, Check, X, Plus } from 'lucide-react';
import PageHeader from '@layout/blocks/PageHeader';
import EmptyState from '@layout/blocks/EmptyState';
import Skeleton from '@layout/blocks/Skeleton';
import { Button } from '@layout/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@layout/ui/dialog';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { config } from '../../config/runtime-config';
import { onboardingText } from '../../i18n/onboarding';
import { StatusBadge, formatWhen } from './status';

const CHECKS = ['identity', 'qualification', 'documents', 'contact'];
const CHECK_LABEL = { identity: 'checkIdentity', qualification: 'checkQualification', documents: 'checkDocuments', contact: 'checkContact' };

/** Tabs per role, like the HRMS TL / HR queues. '' means every status. */
const tabsFor = mode => mode === 'admin'
  ? [['pending_verification', 'tabVerification'], ['pending_admin', 'tabApproval'], ['approved', 'tabActivation'], ['', 'tabAll']]
  : [['pending_verification', 'tabVerification'], ['', 'tabAll']];

const matches = (app, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return [app.name, app.email, app.phone, app.organization, app.username].some(v => (v || '').toLowerCase().includes(q));
};

/**
 * Provider onboarding review. mode="verifier" is step 1 (verify or reject); mode="admin" sees every step and
 * takes the final decision. Business rules live on the server; this screen only guides the reviewer.
 */
export default function OnboardingReview({ mode, initialTab, language, bridge }) {
  const t = onboardingText(language);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(initialTab ?? 'pending_verification');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setApplications(await (mode === 'admin' ? DataService.applications() : DataService.verificationQueue()));
    } catch (e) { setError(e.message || t.loadFailed); }
    finally { setLoading(false); }
  }, [mode, t.loadFailed]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (initialTab !== undefined) setTab(initialTab); }, [initialTab]);

  const counts = useMemo(() => Object.fromEntries(tabsFor(mode).map(([id]) => [id, id ? applications.filter(a => a.status === id).length : applications.length])), [applications, mode]);
  const rows = useMemo(() => applications.filter(a => (!tab || a.status === tab) && matches(a, query)), [applications, tab, query]);
  const open = applications.find(a => a.id === openId) || null;

  /** After any decision: reload this list and the legacy app state (dashboard counters). */
  const changed = useCallback(async () => { await load(); try { await bridge?.current?.refresh(); } catch { /* list already reloaded */ } }, [load, bridge]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      <PageHeader icon={mode === 'admin' ? 'FileCheck' : 'ClipboardList'}
        title={mode === 'admin' ? t.applicationsTitle : t.queueTitle}
        description={mode === 'admin' ? t.applicationsDescription : t.queueDescription}
        actions={<>
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{t.refresh}</Button>
          {mode === 'admin' && <Button onClick={() => bridge?.current?.go('register')}><Plus className="mr-2 h-4 w-4" />{t.addProvider}</Button>}
        </>} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label={t.colStatus} className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 lg:w-auto">
          {tabsFor(mode).map(([id, label]) => (
            <button key={id || 'all'} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t[label]} <span className="ml-1 rounded-full bg-muted-foreground/10 px-1.5 text-xs tabular-nums">{counts[id] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">{t.search}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t.search}
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </label>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <p>{error}</p><Button variant="outline" className="mt-2" onClick={load}>{t.retry}</Button>
        </div>
      ) : loading && !applications.length ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : !rows.length ? (
        <EmptyState icon="Inbox" title={t.emptyTitle} description={t.emptyDescription} />
      ) : (
        <ApplicationList rows={rows} t={t} language={language} onOpen={setOpenId} />
      )}

      <ApplicationDrawer key={open?.id} application={open} mode={mode} t={t} language={language}
        onClose={() => setOpenId(null)} onChanged={changed} />
    </div>
  );
}

function ApplicationList({ rows, t, language, onOpen }) {
  return (
    <>
      {/* Phones: one card per application. */}
      <ul className="space-y-2 md:hidden">
        {rows.map(app => (
          <li key={app.id}>
            <button onClick={() => onOpen(app.id)} className="w-full rounded-lg border bg-card p-4 text-left shadow-sm hover:border-primary/40">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="truncate font-medium">{app.name}</p><p className="truncate text-xs text-muted-foreground">{app.email}</p></div>
                <StatusBadge status={app.status} t={t} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{app.phone} · {formatWhen(app.submittedAt, language)}</p>
            </button>
          </li>
        ))}
      </ul>
      {/* Tablets and up: a compact table; the full record opens in the drawer. */}
      <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3">{t.colApplicant}</th>
              <th scope="col" className="hidden px-4 py-3 lg:table-cell">{t.colMobile}</th>
              <th scope="col" className="hidden px-4 py-3 xl:table-cell">{t.colBusiness}</th>
              <th scope="col" className="px-4 py-3">{t.colStatus}</th>
              <th scope="col" className="hidden px-4 py-3 lg:table-cell">{t.colSubmitted}</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">{t.open}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(app => (
              <tr key={app.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpen(app.id)}>
                <td className="px-4 py-3"><p className="font-medium">{app.name}</p><p className="text-xs text-muted-foreground">{app.email}</p></td>
                <td className="hidden px-4 py-3 tabular-nums lg:table-cell">{app.phone}</td>
                <td className="hidden px-4 py-3 xl:table-cell"><p className="capitalize">{app.businessType || 'practitioner'}</p><p className="text-xs text-muted-foreground">{app.organization}</p></td>
                <td className="px-4 py-3"><StatusBadge status={app.status} t={t} /></td>
                <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{formatWhen(app.submittedAt, language)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant={['pending_verification', 'pending_admin'].includes(app.status) ? 'default' : 'outline'}
                    onClick={e => { e.stopPropagation(); onOpen(app.id); }}>
                    {['pending_verification', 'pending_admin'].includes(app.status) ? t.open : t.view}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Progress({ status, t }) {
  const steps = [['stepSubmitted', true], ['stepVerified', ['pending_admin', 'approved', 'activated', 'rejected'].includes(status)],
    ['stepApproved', ['approved', 'activated'].includes(status)], ['stepActivated', status === 'activated']];
  const failedAt = status === 'verification_rejected' ? 1 : status === 'rejected' ? 2 : -1;
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progress">
      {steps.map(([label, done], i) => {
        const failed = i === failedAt;
        return (
          <li key={label} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${failed ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200' : done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-muted text-muted-foreground'}`}>
            <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] text-white ${failed ? 'bg-red-600' : done ? 'bg-emerald-600' : 'bg-muted-foreground/40'}`}>
              {failed ? <X className="h-3 w-3" /> : done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {t[label]}
          </li>
        );
      })}
    </ol>
  );
}

function ApplicationDrawer({ application, mode, t, language, onClose, onChanged }) {
  const verifier = mode === 'verifier';
  const [documents, setDocuments] = useState(null);
  const [history, setHistory] = useState(null);
  const id = application?.id;
  useEffect(() => {
    if (!id) return;
    let live = true;
    (verifier ? DataService.verificationDocuments(id) : DataService.applicationDocuments(id)).then(d => live && setDocuments(d)).catch(() => live && setDocuments([]));
    DataService.applicationHistory(id, verifier).then(h => live && setHistory(h)).catch(() => live && setHistory([]));
    return () => { live = false; };
  }, [id, verifier, application?.status]);

  if (!application) return null;
  const fields = [['fullName', application.name], ['username', application.username], ['email', application.email], ['mobile', application.phone],
    ['organisation', application.organization], ['businessType', application.businessType], ['qualification', application.designation],
    ['location', application.village], ['address', application.address], ['licenseId', application.registrationId],
    ['submitted', formatWhen(application.submittedAt, language)], ['verifierRemarks', application.verificationRemarks]]
    .filter(([, value]) => value != null && value !== '');

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="!left-auto !right-0 !top-0 flex h-full max-h-screen w-full max-w-xl !translate-x-0 !translate-y-0 flex-col gap-0 overflow-y-auto rounded-none p-0 sm:rounded-none">
        <div className="sticky top-0 z-10 border-b bg-background px-6 py-4">
          <DialogTitle className="pr-8 text-lg">{application.name}</DialogTitle>
          <DialogDescription className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge status={application.status} t={t} /><span>{application.email}</span></DialogDescription>
          <div className="mt-3"><Progress status={application.status} t={t} /></div>
        </div>

        <div className="space-y-6 px-6 py-5">
          <section aria-labelledby="ob-details">
            <h3 id="ob-details" className="mb-2 text-sm font-semibold">{t.details}</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
              {fields.map(([key, value]) => (
                <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{t[key]}</dt><dd className="break-words">{String(value)}</dd></div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="ob-docs">
            <h3 id="ob-docs" className="mb-2 text-sm font-semibold">{t.documents}</h3>
            {documents === null ? <p className="text-sm text-muted-foreground">{t.loadingDocuments}</p>
              : !documents.length ? <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
              : <ul className="space-y-2">{documents.map(doc => (
                <li key={doc.id}><a className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" target="_blank" rel="noopener"
                  href={`${config.apiBaseUrl}${verifier ? '/verification/documents/' : '/admin/documents/'}${encodeURIComponent(doc.id)}`}>
                  <FileText className="h-4 w-4" />{doc.name}</a></li>))}</ul>}
          </section>

          <Actions application={application} mode={mode} t={t} onChanged={onChanged} />

          <section aria-labelledby="ob-history">
            <h3 id="ob-history" className="mb-2 text-sm font-semibold">{t.history}</h3>
            {history === null ? <p className="text-sm text-muted-foreground">{t.loadingHistory}</p> : (
              <ol className="relative space-y-4 border-l pl-4">
                {history.map((event, i) => (
                  <li key={i} className="text-sm">
                    <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
                    <p className="font-medium">{event.from === event.to && event.to === 'approved' ? t.doneResent : (t.events[event.to] || event.to)}</p>
                    <p className="text-xs text-muted-foreground">{formatWhen(event.at, language)}{event.actorName ? ` · ${t.by} ${event.actorName}` : ''}</p>
                    {event.note && <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">{event.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The decision panel for the application's current step. */
function Actions({ application, mode, t, onChanged }) {
  const [checks, setChecks] = useState({});
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const step = application.status === 'pending_verification' ? 'verify'
    : mode === 'admin' && application.status === 'pending_admin' ? 'decide'
    : mode === 'admin' && application.status === 'approved' ? 'activation' : null;
  if (!step) return <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{t.noActions}</p>;

  async function run(work, message) {
    setBusy(true); setError('');
    try { await work(); toast({ description: message }); setNote(''); setRejecting(false); await onChanged(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const submit = decision => {
    if (decision === 'rejected' && note.trim().length < 5) { setError(t.reasonTooShort); return; }
    if (step === 'verify' && decision === 'approved' && !CHECKS.every(c => checks[c])) { setError(t.checksMissing); return; }
    const done = decision === 'rejected' ? t.doneRejected : step === 'verify' ? t.doneVerified : t.doneApproved;
    run(() => step === 'verify'
      ? DataService.verify(application.id, { decision, reason: note.trim(), checks: decision === 'approved' ? checks : {} })
      : DataService.review(application.id, { decision, reason: note.trim() }), done);
  };

  if (step === 'activation') return (
    <section className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold">{t.activationHeading}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t.activationHint}</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <Button className="mt-3" variant="outline" disabled={busy} onClick={() => run(() => DataService.resendActivation(application.id), t.doneResent)}>{busy ? t.saving : t.resend}</Button>
    </section>
  );

  return (
    <section className="rounded-lg border p-4" aria-labelledby="ob-action">
      <h3 id="ob-action" className="text-sm font-semibold">{step === 'verify' ? t.verifyHeading : t.decisionHeading}</h3>
      {step === 'verify' && !rejecting && (
        <fieldset className="mt-3 space-y-2">
          <legend className="text-xs text-muted-foreground">{t.confirmChecks}</legend>
          {CHECKS.map(check => (
            <label key={check} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 text-sm hover:bg-muted">
              <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={!!checks[check]} disabled={busy}
                onChange={e => setChecks(c => ({ ...c, [check]: e.target.checked }))} />
              {t[CHECK_LABEL[check]]}
            </label>
          ))}
        </fieldset>
      )}
      <label className="mt-3 block text-sm">
        <span className="text-xs text-muted-foreground">{rejecting ? t.rejectReason : step === 'verify' ? t.remarksForAdmin : t.approvalNote}</span>
        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} disabled={busy}
          placeholder={rejecting ? t.rejectReasonPlaceholder : step === 'verify' ? t.remarksPlaceholder : t.approvalNotePlaceholder}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {rejecting ? <>
          <Button variant="destructive" disabled={busy} onClick={() => submit('rejected')}>{busy ? t.saving : t.confirmReject}</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setRejecting(false); setError(''); }}>{t.cancel}</Button>
        </> : <>
          <Button disabled={busy} onClick={() => submit('approved')}>{busy ? t.saving : step === 'verify' ? t.verify : t.approve}</Button>
          <Button variant="outline" disabled={busy} onClick={() => { setRejecting(true); setError(''); }}>{t.reject}</Button>
        </>}
      </div>
    </section>
  );
}
