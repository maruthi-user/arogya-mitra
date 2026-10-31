import { escapeHtml } from '../../utils/html.js';
export const EmptyState = message => `<p class="empty-state" role="status">${escapeHtml(message)}</p>`;
export const LoadingState = message => `<p role="status" aria-live="polite">${escapeHtml(message)}</p>`;
export const ErrorState = message => `<p class="notice" role="alert">${escapeHtml(message)}</p>`;
