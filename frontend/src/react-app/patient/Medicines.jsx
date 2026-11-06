import React, { useState } from 'react';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { MEDICINES, VILLAGES } from '../../services/reference-catalog';
import { patientText, named } from '../../i18n/patient';
import { Page, useResource, DataList, Badge, Field, inputClass } from '../kit';

export default function Medicines({ snapshot, bridge }) {
  const { language, params, session, screen } = snapshot, t = patientText(language), med = MEDICINES.find(m => m.id === params.med);
  const resource = useResource(() => screen === 'medicineRequests' ? DataService.medicineRequests() : DataService.load(), [screen, session.subjectId]);
  const [village, setVillage] = useState(''), [busy, setBusy] = useState(false);
  const go = (screen, params) => bridge.current.go(screen, params);
  async function inquire(shop) {
    setBusy(true);
    try { await DataService.requestMedicine({ pharmacyId: shop.id, medicineId: med.id, message: '' }); toast({ description: t.inquirySaved }); go('medicineRequests'); }
    catch (e) { toast({ variant: 'destructive', description: e.message }); }
    finally { setBusy(false); }
  }
  const profileVillage = session.profile?.village;
  const list = (resource.data?.pharmacies || []).filter(p => !village || [p.village, ...VILLAGES.filter(v => v.id === p.village).flatMap(v => [v.en, v.te])].some(n => String(n || '').toLocaleLowerCase().includes(village.trim().toLocaleLowerCase()))).sort((a, b) => Number(!!b.stock?.[med?.id]) - Number(!!a.stock?.[med?.id]) || Number(b.village === profileVillage) - Number(a.village === profileVillage));
  return <Page title={screen === 'medicineRequests' ? t.inquiries : med ? named(med, language) : t.medicines} t={t} resource={resource} width="max-w-none">
    {screen === 'medicineRequests' ? <>
      {!session.accountId && <p className="rounded border p-3 text-sm">{t.guestWarning}</p>}
      {!!resource.data?.length ? <DataList caption={t.inquiries} rows={resource.data} columns={[
        { key: 'pharmacyName', label: t.pharmacy }, { key: 'medicineId', label: t.medicine, render: r => named(MEDICINES.find(m => m.id === r.medicineId), language) || r.medicineId },
        { key: 'status', label: t.status, render: r => <Badge status={r.status} label={t.statuses[r.status] || r.status} /> }, { key: 'message', label: t.message }, { key: 'id', label: t.reference }
      ]} /> : <p>{t.noInquiries}</p>}
    </> : !med ? <>
      <Button variant="outline" onClick={() => go('medicineRequests')}>{t.inquiries}</Button>
      <DataList caption={t.medicines} rows={MEDICINES} columns={[
        { key: 'name', label: t.medicine, render: m => named(m, language) }, { key: 'rx', label: t.rxNote, render: m => m.rx ? t.rxNote : '—' },
        { key: 'action', label: t.pharmacies, render: m => <Button aria-label={`${t.pharmacies}: ${named(m, language)}`} onClick={() => go('meds', { med: m.id })}>{t.pharmacies}</Button> }
      ]} />
    </> : <>
      {med.rx && <p className="rounded border p-3">{t.rxNote}</p>}
      <Field label={t.village}><input className={inputClass} maxLength={40} value={village} onChange={e => setVillage(e.target.value)} /></Field>
      {list.length ? <DataList caption={t.pharmacies} rows={list} columns={[
        { key: 'name', label: t.pharmacy, render: s => s.organization || s.name }, { key: 'village', label: t.village, render: s => named(VILLAGES.find(v => v.id === s.village), language) || s.village },
        { key: 'stock', label: t.availability, render: s => s.stock?.[med.id] && s.open ? t.available : t.notAvailable },
        { key: 'delivery', label: t.homeDelivery, render: s => s.delivery ? t.homeDelivery : '—' },
        { key: 'call', label: t.call, render: s => <a className="text-primary underline" href={`tel:${s.phone}`}>{t.call}: {s.phone}</a> },
        { key: 'inquiry', label: t.inquiry, render: s => <Button disabled={busy} aria-label={`${t.inquiry}: ${s.organization || s.name}`} onClick={() => inquire(s)}>{t.inquiry}</Button> }
      ]} /> : <p>{t.noPharmacies}</p>}
      <p className="text-sm">{t.stockNote}</p><Button variant="outline" onClick={() => go('meds')}>{t.medicines}</Button>
    </>}
  </Page>;
}
