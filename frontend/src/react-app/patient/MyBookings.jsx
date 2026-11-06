import React, { useState } from 'react';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { patientText, serviceTitle } from '../../i18n/patient';
import { Page, useResource, DataList, Badge, ReasonDialog, ExpiryCountdown, formatWhen } from '../kit';

export default function MyBookings({ snapshot, bridge }) {
  const { session, language, screen } = snapshot, t = patientText(language);
  const resource = useResource(async () => {
    const [requests, state] = await Promise.all([DataService.careRequests(), DataService.load()]);
    const appointments = (state.bookings || []).filter(b => b.patientId === session.subjectId).map(b => ({ ...b, source: 'appointment', title: t.appointment, titleTe: t.appointment, organization: state.providers.find(p => p.id === b.pid)?.organization || state.providers.find(p => p.id === b.pid)?.name || b.pid }));
    return [...(screen === 'bookings' ? [] : requests.map(r => ({ ...r, source: 'service' }))), ...(screen === 'careHistory' ? [] : appointments)].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  }, [session.subjectId, screen, language]);
  const [cancel, setCancel] = useState(null);
  function guidance(r) { return r.source === 'appointment' ? t.awaiting : t.guidance[r.status === 'accepted' && r.mode === 'callback' ? 'callback' : r.status === 'accepted' && r.kind === 'ambulance' ? 'ambulance' : r.status] || ''; }
  async function cancelRequest(note) {
    if (cancel.source === 'appointment') await DataService.status(cancel.id, 'cancelled', { role: 'patient', id: session.subjectId });
    else await DataService.careStatus(cancel.id, { status: 'cancelled', note });
    toast({ description: t.cancelled }); await resource.reload(); try { await bridge.current.refresh(); } catch { /* current list has reloaded */ }
  }
  return <Page title={screen === 'careHistory' ? t.history : t.home} t={t} resource={resource} empty={t.noBookings} width="max-w-none">
    {!session.accountId && <aside role="note" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{t.guestWarning}</aside>}
    {!!resource.data?.length && <DataList caption={t.home} rows={resource.data} getKey={r => `${r.source}:${r.id}`} columns={[
      { key: 'title', label: t.service, render: r => serviceTitle(r, language) }, { key: 'organization', label: t.provider },
      { key: 'date', label: t.date }, { key: 'time', label: t.time }, { key: 'status', label: t.status, render: r => <><Badge status={r.status} label={t.statuses[r.status] || r.status} /><ExpiryCountdown status={r.status} expiresAt={r.expiresAt} language={language} /></> },
      { key: 'fee', label: t.fee, render: r => r.feeOnRequest ? t.onRequest : r.fee == null ? '—' : `₹${r.fee}` },
      { key: 'paymentPreference', label: t.payment, render: r => r.paymentPreference === 'cash' ? t.cash : r.paymentPreference === 'online' ? t.online : t.later },
      { key: 'address', label: t.address }, { key: 'id', label: t.reference },
      { key: 'details', label: t.timeline, render: r => <details><summary className="cursor-pointer text-primary">{t.timeline}</summary><p className="my-2">{r.details || r.reason}</p><p>{guidance(r)}</p><ol>{(r.history || []).map((h, i) => <li key={i} className="mt-2">{t.statuses[h.status] || h.status} · {formatWhen(h.at, language)}<p className="break-words">{h.note}</p></li>)}</ol></details> },
      { key: 'actions', label: t.cancel, render: r => (r.source === 'appointment' ? ['pending', 'confirmed'] : ['pending', 'accepted']).includes(r.status) && <Button variant="outline" aria-label={`${t.cancel}: ${serviceTitle(r, language)}, ${r.date || ''} ${r.time || ''}`.trim()} onClick={() => setCancel(r)}>{t.cancel}</Button> }
    ]} />}
    <ReasonDialog open={!!cancel} title={t.cancelTitle} description={cancel?.id} confirmLabel={t.cancel} destructive t={t} onConfirm={cancelRequest} onClose={() => setCancel(null)} />
  </Page>;
}
