import React from 'react';

/** Colour per status; text comes from the onboarding dictionary in sentence case. */
const TONE = {
  pending_verification: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
  invited: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900',
  pending_admin: 'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900',
  activated: 'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:ring-emerald-800',
  active: 'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:ring-emerald-800',
  verification_rejected: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900',
  rejected: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900',
  suspended: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900'
};

export function StatusBadge({ status, t }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[status] || 'bg-muted text-muted-foreground ring-border'}`}>
      {t.status[status] || String(status).replaceAll('_', ' ')}
    </span>
  );
}

export function formatWhen(value, language) {
  if (!value) return '';
  return new Date(value).toLocaleString(language === 'te' ? 'te-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}
