import React, { useMemo, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@layout/ui/button';
import { toast } from '@layout/hooks/use-toast';
import { DataService } from '../../services/data-service';
import { SERVICE_KINDS, BUSINESS_KINDS, VILLAGES } from '../../services/reference-catalog';
import { Field, inputClass } from '../kit';
import { CLINICAL_KINDS, NOTE_KINDS, DURATIONS, defaultDelivery, initialForm, slotsOf, toPayload, validate } from './serviceForm';

const kindLabel = (kind, language) => { const row = SERVICE_KINDS.find(k => k[0] === kind); return row ? (language === 'te' ? row[1] : row[2]) : kind; };
const villageName = (id, language) => { const v = VILLAGES.find(x => x.id === id); return v ? (language === 'te' ? v.te || v.en : v.en || v.te) : id; };

/**
 * Add or edit a care service in three steps (details, coverage & schedule, review) with a live patient
 * preview. Admins pick any business and any service type; providers are limited to their business type.
 */
export default function ServiceEditor({ service, admin, business, organisations = [], practitioners = [], t, language, onClose, onSaved }) {
  const businesses = useMemo(() => admin
    ? [...new Map(organisations.map(o => [o.providerId, { id: o.providerId, name: o.name }])).values()]
    : [{ id: business?.providerId || business?.id || '', name: business?.organization || t.saveBusinessFirst }], [admin, organisations, business, t]);
  const kinds = admin ? SERVICE_KINDS : SERVICE_KINDS.filter(k => (BUSINESS_KINDS[business?.businessType || 'practitioner'] || []).includes(k[0]));
  const [form, setForm] = useState(() => initialForm(service, {
    providerId: service?.providerId || businesses[0]?.id, defaultKind: kinds[0]?.[0], practitioners }));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = patch => setForm(f => ({ ...f, ...patch }));

  const eligible = practitioners.filter(p => p.active && !p.suspended && (!p.providerId || p.providerId === form.providerId));
  const clinical = CLINICAL_KINDS.includes(form.kind);
  const slots = slotsOf(form);
  const businessName = businesses.find(b => b.id === form.providerId)?.name || '';
  const total = form.fee === '' ? null : Number(form.fee || 0) + Number(form.travelFee || 0);
  const durations = DURATIONS.includes(Number(form.durationMinutes)) ? DURATIONS : [...DURATIONS, Number(form.durationMinutes)].sort((a, b) => a - b);
  const toggle = (key, value, limit) => set({ [key]: form[key].includes(value) ? form[key].filter(v => v !== value) : limit && form[key].length >= limit ? form[key] : [...form[key], value] });

  function goTo(next) {
    setError('');
    if (next === 2) {
      const problem = validate(form);
      if (problem) { setError(t[problem.key]); setStep(problem.step); return; }
    }
    setStep(next);
  }
  async function save(draft) {
    setError('');
    if (!draft) { const problem = validate(form); if (problem) { setError(t[problem.key]); setStep(problem.step); return; } }
    setBusy(true);
    try {
      await DataService.careSave(service?.id, toPayload(form, practitioners, draft));
      toast({ description: draft ? t.draftSaved : t.submitted });
      await onSaved();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const steps = [t.stepDetails, t.stepSchedule, t.stepReview];
  return (
    <section className="space-y-4" aria-labelledby="service-editor-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 id="service-editor-title" className="text-xl font-semibold">{service?.id ? t.editService : t.newService}</h1>
          <p className="text-sm text-muted-foreground">{t.editorHint}</p>
        </div>
        <Button variant="outline" onClick={onClose} disabled={busy}><ArrowLeft className="mr-2 h-4 w-4" />{t.back}</Button>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label={t.stepDetails}>
        {steps.map((label, i) => (
          <li key={label}>
            <button type="button" onClick={() => goTo(i)} aria-current={step === i ? 'step' : undefined}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${step === i ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-muted'}`}>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ${step >= i ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{i + 1}</span>
              <span className="truncate">{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <form className="space-y-4 rounded-lg border bg-card p-4" noValidate onSubmit={e => { e.preventDefault(); step < 2 ? goTo(step + 1) : save(false); }}>
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${t.kind} *`}>
                <select className={inputClass} value={form.kind} onChange={e => set({ kind: e.target.value, deliveryMode: defaultDelivery(e.target.value) })}>
                  {kinds.map(([id, te, en]) => <option key={id} value={id}>{language === 'te' ? te : en}</option>)}
                </select>
              </Field>
              <Field label={`${t.business} *`}>
                <select className={inputClass} value={form.providerId} disabled={!admin} onChange={e => set({ providerId: e.target.value, practitionerId: '' })}>
                  {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label={`${t.title} *`} className="sm:col-span-2"><input className={inputClass} maxLength={100} placeholder={t.titlePlaceholder} value={form.title} onChange={e => set({ title: e.target.value })} /></Field>
              <Field label={`${t.description} *`} className="sm:col-span-2">
                <textarea className={`${inputClass} h-auto py-2`} rows={3} maxLength={500} placeholder={t.descriptionPlaceholder} value={form.description} onChange={e => set({ description: e.target.value })} />
              </Field>
              <Field label={clinical ? `${t.practitionerRequired} *` : t.assignedProvider} hint={eligible.length ? undefined : t.practitionerHint}>
                <select className={inputClass} value={form.practitionerId} onChange={e => set({ practitionerId: e.target.value })}>
                  <option value="">{t.selectPractitioner}</option>
                  {eligible.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label={t.feeLabel} hint={t.feeBlank}><input className={inputClass} type="number" min={0} max={100000} step={1} value={form.fee} onChange={e => set({ fee: e.target.value })} /></Field>
              <Field label={t.travelFee}><input className={inputClass} type="number" min={0} max={100000} step={1} value={form.travelFee} onChange={e => set({ travelFee: e.target.value })} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground">{t.coverage} * <span className="font-normal">({t.coverageHint})</span></legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {VILLAGES.map(v => {
                    const on = form.coverage.includes(v.id);
                    return (
                      <button key={v.id} type="button" aria-pressed={on} onClick={() => toggle('coverage', v.id, 5)}
                        className={`rounded-full border px-3 py-1.5 text-sm ${on ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                        {villageName(v.id, language)}{on && <X className="ml-1 inline h-3 w-3" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${t.visitDuration} *`}>
                  <select className={inputClass} value={form.durationMinutes} onChange={e => set({ durationMinutes: Number(e.target.value) })}>
                    {durations.map(d => <option key={d} value={d}>{d} {t.minutes}</option>)}
                  </select>
                </Field>
                <Field label={t.scheduleMode}>
                  <select className={inputClass} value={form.scheduleMode} onChange={e => set({ scheduleMode: e.target.value })}>
                    <option value="window">{t.modeWindow}</option><option value="slots">{t.modeSlots}</option>
                  </select>
                </Field>
                {form.scheduleMode === 'window' ? <>
                  <Field label={t.from}><input className={inputClass} type="time" value={form.windowStart} onChange={e => set({ windowStart: e.target.value })} /></Field>
                  <Field label={t.until}><input className={inputClass} type="time" value={form.windowEnd} onChange={e => set({ windowEnd: e.target.value })} /></Field>
                </> : (
                  <Field label={t.slotsLabel} className="sm:col-span-2"><input className={inputClass} placeholder="09:00, 10:00" value={form.slotsText} onChange={e => set({ slotsText: e.target.value })} /></Field>
                )}
              </div>
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground">{t.availableDays} *</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.dayNames.map((day, i) => (
                    <label key={day} className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm hover:bg-muted">
                      <input type="checkbox" className="h-4 w-4" checked={form.availableDays.includes(i + 1)} onChange={() => toggle('availableDays', i + 1)} />{day}
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="text-xs text-muted-foreground">{t.slotsPreview}: {slots.length ? slots.join(', ') : '—'}</p>
            </div>
          )}

          {step < 2 && (
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">{t.extraOptions}</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label={t.titleTe}><input className={inputClass} maxLength={100} value={form.titleTe} onChange={e => set({ titleTe: e.target.value })} /></Field>
                <Field label={t.resource}><input className={inputClass} maxLength={60} value={form.resource} onChange={e => set({ resource: e.target.value })} /></Field>
                <Field label={t.capacity}><input className={inputClass} type="number" min={1} max={20} value={form.capacity} onChange={e => set({ capacity: e.target.value })} /></Field>
                <Field label={t.deliveryMode}>
                  <select className={inputClass} value={form.deliveryMode} onChange={e => set({ deliveryMode: e.target.value })}>
                    <option value="onsite">{t.modeOnsite}</option><option value="home">{t.modeHome}</option><option value="remote">{t.modeRemote}</option><option value="transport">{t.modeTransport}</option>
                  </select>
                </Field>
                {NOTE_KINDS.includes(form.kind) && <Field label={t.notes} className="sm:col-span-2"><input className={inputClass} maxLength={300} value={form.serviceNotes} onChange={e => set({ serviceNotes: e.target.value })} /></Field>}
                <Field label={t.availableLabel}>
                  <select className={inputClass} value={String(form.available)} onChange={e => set({ available: e.target.value === 'true' })}><option value="true">{t.yes}</option><option value="false">{t.no}</option></select>
                </Field>
                <Field label={t.activeLabel}>
                  <select className={inputClass} value={String(form.active)} onChange={e => set({ active: e.target.value === 'true' })}><option value="true">{t.yes}</option><option value="false">{t.no}</option></select>
                </Field>
              </div>
            </details>
          )}

          {step === 2 && (
            <div className="space-y-2 text-sm">
              <h2 className="text-base font-semibold">{t.reviewHeading}</h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">{t.title}</dt><dd>{form.title}</dd>
                <dt className="text-muted-foreground">{t.kind}</dt><dd>{kindLabel(form.kind, language)}</dd>
                <dt className="text-muted-foreground">{t.business}</dt><dd>{businessName}{form.practitionerId ? ` · ${eligible.find(p => p.id === form.practitionerId)?.name || ''}` : ''}</dd>
                <dt className="text-muted-foreground">{t.fee}</dt><dd>{total === null ? t.feeOnRequest : `₹${total}`}</dd>
                <dt className="text-muted-foreground">{t.villages}</dt><dd>{form.coverage.map(id => villageName(id, language)).join(', ')}</dd>
                <dt className="text-muted-foreground">{t.days}</dt><dd>{form.availableDays.slice().sort().map(d => t.dayNames[d - 1]).join(', ')}</dd>
                <dt className="text-muted-foreground">{t.times}</dt><dd>{slots.join(', ')}</dd>
              </dl>
              <p className="text-muted-foreground">{t.privateUntilApproved}</p>
            </div>
          )}

          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
            <p className="mr-auto text-xs text-muted-foreground">{t.reviewWarning}</p>
            <Button type="button" variant="outline" disabled={busy} onClick={() => save(true)}>{t.saveDraft}</Button>
            {step === 2 && <Button type="button" variant="outline" disabled={busy} onClick={() => setStep(0)}>{t.editDetails}</Button>}
            <Button type="submit" disabled={busy}>{busy ? t.saving : step < 1 ? t.next : step === 1 ? t.reviewSubmit : t.submit}</Button>
          </div>
        </form>

        <aside className="h-fit space-y-2 rounded-lg border bg-card p-4 lg:sticky lg:top-20" aria-live="polite">
          <h2 className="text-sm font-semibold text-muted-foreground">{t.preview}</h2>
          <p className="text-lg font-semibold">{(language === 'te' ? form.titleTe || form.title : form.title) || t.previewName}</p>
          <p className="text-sm text-muted-foreground">{businessName} · {kindLabel(form.kind, language)}</p>
          <p><span className="text-2xl font-bold">{total === null ? t.feeOnRequest : `₹${total}`}</span><span className="block text-xs text-muted-foreground">{t.previewTotal}</span></p>
          <p className="text-sm">{t.serves} {form.coverage.length} {t.villagesWord}</p>
          <p className="text-xs text-muted-foreground">{t.previewAvailability}</p>
        </aside>
      </div>
    </section>
  );
}
