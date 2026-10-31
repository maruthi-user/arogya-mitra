import { escapeHtml } from '../../utils/html.js';
export function Avatar(name) {
  const initials=String(name).trim().split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]||'').join('');
  return `<span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span>`;
}
