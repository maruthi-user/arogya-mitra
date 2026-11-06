import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { LANG } from '../i18n/index';
import { tableText } from '../i18n/table';
import PageHeader from '@layout/blocks/PageHeader';
import EmptyState from '@layout/blocks/EmptyState';
import Skeleton from '@layout/blocks/Skeleton';
import { Button } from '@layout/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@layout/ui/dialog';

/** Shared building blocks for the React workspace pages (loading, errors, badges, reason dialog). */

/** Loads data with a reload function; ignores responses that arrive after a newer request. */
export function useResource(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true); setError('');
    try { const value = await loader(); if (mine === seq.current) setData(value); }
    catch (e) { if (mine === seq.current) setError(e.message || 'Request failed'); }
    finally { if (mine === seq.current) setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); return () => { seq.current++; }; }, [reload]);
  return { data, error, loading, reload, setData };
}

/** Page frame with loading, error recovery and empty states. */
export function Page({ icon, title, description, actions, t, resource, empty, emptyIcon = 'Inbox', children, width = 'max-w-none' }) {
  const { data, error, loading, reload } = resource || {};
  const isEmpty = resource && data && Array.isArray(data) && data.length === 0;
  return (
    <div className={`mx-auto w-full ${width} space-y-4 p-4 sm:p-6`}>
      <PageHeader icon={icon} title={title} description={description}
        actions={actions} />
      {resource && error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
          <p>{error}</p><Button variant="outline" className="mt-2" onClick={reload}>{t.retry}</Button>
        </div>
      ) : resource && data === null && loading ? (
        <div className="space-y-2" aria-busy="true" aria-label={t.loading}>{[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <>{children}{isEmpty && empty && <EmptyState icon={emptyIcon} title={empty} />}</>
      )}
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
  blue: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900',
  red: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900',
  gray: 'bg-muted text-muted-foreground ring-border'
};
const STATUS_TONE = {
  queued: 'amber', processing: 'blue', sent: 'green', failed: 'red',
  requested: 'amber', contacted: 'blue', resolved: 'green',
  draft: 'gray', pending: 'amber', approved: 'green', rejected: 'red',
  active: 'green', suspended: 'red', awaiting: 'amber',
  accepted: 'blue', in_progress: 'blue', completed: 'green', cancelled: 'gray', expired: 'gray',
  confirmed: 'green', declined: 'red', done: 'green', no_show: 'gray'
};

export function Badge({ status, label, tone }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone || STATUS_TONE[status] || 'gray']}`}>
      {label ?? String(status).replaceAll('_', ' ')}
    </span>
  );
}

/**
 * "Expires in 12 min" for a pending request with an expiresAt timestamp (ms); requests that nobody
 * answers in time expire on the server. Re-renders every 30 seconds and renders nothing otherwise.
 */
export function ExpiryCountdown({ status, expiresAt, language }) {
  const [now, setNow] = useState(() => Date.now());
  const active = status === 'pending' && Number(expiresAt) > 0;
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [active]);
  if (!active) return null;
  const minutes = Math.ceil((Number(expiresAt) - now) / 60000), te = language === 'te';
  const text = minutes <= 0
    ? (te ? 'గడువు ముగిసింది' : 'Expired')
    : te ? `${minutes} నిమిషాల్లో గడువు ముగుస్తుంది` : `Expires in ${minutes} min`;
  return <span className={`mt-1 block text-xs ${minutes <= 5 ? 'font-medium text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}>{text}</span>;
}

export function formatWhen(value, language) {
  if (!value) return '';
  return new Date(value).toLocaleString(language === 'te' ? 'te-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

export const inputClass = 'mt-1 h-10 pointer-coarse:h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

/** Form field with a label above its single control, linked by id so assistive tech reads the label. */
export function Field({ label, hint, children, className = '' }) {
  const id = React.useId(), hintId = hint ? id + '-hint' : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children, { id: children.props.id || id, 'aria-describedby': hintId })
    : children;
  return (
    <div className={`block text-sm ${className}`}>
      <label htmlFor={children?.props?.id || id} className="text-xs font-medium text-muted-foreground">{label}</label>
      {control}
      {hint && <span id={hintId} className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/**
 * Confirmation dialog that collects a reason (5-1000 characters) before running onConfirm(reason).
 * Keeps itself open and shows the server's message if onConfirm throws.
 */
export function ReasonDialog({ open, title, description, confirmLabel, destructive, t, onConfirm, onClose, optional = false }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setReason(''); setError(''); } }, [open]);
  async function submit(event) {
    event.preventDefault();
    if (!optional && reason.trim().length < 5) { setError(t.reasonTooShort); return; }
    setBusy(true); setError('');
    try { await onConfirm(reason.trim()); onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !busy) onClose(); }}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <div><DialogTitle>{title}</DialogTitle>{description && <DialogDescription className="mt-1">{description}</DialogDescription>}</div>
          <Field label={t.reasonLabel}>
            <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={4} disabled={busy} autoFocus
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t.cancel}</Button>
            <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={busy}>{busy ? t.saving : confirmLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Simple responsive table: full table from md up, stacked cards below. */
export function DataList({ rows, columns, getKey = r => r.id, caption, showSearch = true }) {
  const t = tableText(LANG), [query, setQuery] = useState(''), [page, setPage] = useState(1), [size, setSize] = useState(10);
  const searchId = React.useId();
  const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join(' ') : React.isValidElement(value) ? text(value.props.children ?? value.props.label ?? value.props.status) : '';
  const filtered = rows.filter(row => columns.some(col => text(col.searchValue ? col.searchValue(row) : col.render ? col.render(row) : row[col.key]).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())));
  const pages = Math.max(1, Math.ceil(filtered.length / size)), current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * size, current * size);
  return (
    <section className="min-w-0 rounded-lg border bg-card" aria-label={caption}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3">
        {showSearch && <div className="relative w-full sm:w-60"><label className="sr-only" htmlFor={searchId}>{t.search}</label><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input id={searchId} type="search" maxLength={200} placeholder={t.search} className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>}
        <div className="ml-auto flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs">{t.rows}<select className="h-10 rounded-md border bg-background px-2" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}</select></label><nav className="flex items-center gap-2" aria-label={t.pages}><Button variant="outline" size="icon" aria-label={t.previous} disabled={current === 1} onClick={() => setPage(current - 1)}><ChevronLeft className="h-4 w-4" /></Button><span role="status" className="whitespace-nowrap text-xs tabular-nums">{filtered.length ? (current - 1) * size + 1 : 0}–{Math.min(current * size, filtered.length)} / {filtered.length}</span><Button variant="outline" size="icon" aria-label={t.next} disabled={current === pages} onClick={() => setPage(current + 1)}><ChevronRight className="h-4 w-4" /></Button></nav></div>
      </div>
      {!filtered.length && <p className="p-6 text-sm text-muted-foreground">{t.noMatches}</p>}
      <ul className="space-y-2 md:hidden" aria-label={caption}>
        {visible.map(row => (
          <li key={getKey(row)} className="rounded-lg border bg-card p-4 shadow-sm">
            <dl className="space-y-1.5 text-sm">
              {columns.map(col => (
                <div key={col.key} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-xs text-muted-foreground">{col.label}</dt>
                  <dd className="min-w-0 break-words text-right [overflow-wrap:anywhere]">{col.render ? col.render(row) : row[col.key]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>{columns.map(col => <th key={col.key} scope="col" className={`px-4 py-3 ${col.className || ''}`}>{col.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {visible.map(row => (
              <tr key={getKey(row)} className="hover:bg-muted/30">
                {columns.map(col => <td key={col.key} className={`px-4 py-3 align-top ${col.className || ''}`}>{col.render ? col.render(row) : row[col.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
