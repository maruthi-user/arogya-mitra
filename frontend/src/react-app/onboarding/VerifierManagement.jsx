import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import PageHeader from '@layout/blocks/PageHeader';
import EmptyState from '@layout/blocks/EmptyState';
import Skeleton from '@layout/blocks/Skeleton';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { onboardingText } from '../../i18n/onboarding';
import { StatusBadge, formatWhen } from './status';

/** Admin page: invite verifiers (step-1 reviewers) and suspend or reinstate them. */
export default function VerifierManagement({ language }) {
  const t = onboardingText(language);
  const [verifiers, setVerifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(''), [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setVerifiers(await DataService.verifiers()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await DataService.createVerifier({ name: name.trim(), email: email.trim() });
      setName(''); setEmail(''); toast({ description: t.invited }); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function toggle(verifier) {
    const suspend = verifier.status !== 'suspended';
    if (suspend && !window.confirm(t.suspendConfirm)) return;
    setBusyId(verifier.id);
    try { await DataService.updateVerifier(verifier.id, { suspended: suspend }); toast({ description: suspend ? t.suspended : t.reinstated }); await load(); }
    catch (e) { toast({ variant: 'destructive', description: e.message }); }
    finally { setBusyId(null); }
  }

  const field = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <PageHeader icon="UserCheck" title={t.verifiersTitle} description={t.verifiersDescription} />
      <form onSubmit={invite} className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm"><span className="text-xs text-muted-foreground">{t.fullName}</span>
          <input className={field} value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} disabled={saving} /></label>
        <label className="text-sm"><span className="text-xs text-muted-foreground">{t.email}</span>
          <input className={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={100} disabled={saving} /></label>
        <Button type="submit" disabled={saving}><UserPlus className="mr-2 h-4 w-4" />{saving ? t.saving : t.sendInvitation}</Button>
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      </form>

      {loading && !verifiers.length ? <div className="space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        : !verifiers.length ? <EmptyState icon="Users" title={t.noVerifiers} description={t.noVerifiersHint} />
        : (
          <ul className="divide-y rounded-lg border bg-card">
            {verifiers.map(v => (
              <li key={v.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{v.name} <span className="text-xs font-normal text-muted-foreground">@{v.username}</span></p>
                  <p className="truncate text-sm text-muted-foreground">{v.email} · {t.colAdded} {formatWhen(v.createdAt, language)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={v.status} t={t} />
                  <Button size="sm" variant={v.status === 'suspended' ? 'outline' : 'destructive'} disabled={busyId === v.id} onClick={() => toggle(v)}>
                    {busyId === v.id ? t.saving : v.status === 'suspended' ? t.reinstate : t.suspend}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
