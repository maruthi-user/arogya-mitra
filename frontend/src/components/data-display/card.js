import { escapeHtml } from '../../utils/html.js';
export function Card({title, body='', actions=''}) {
  return `<article class="card">${title?`<h2>${escapeHtml(title)}</h2>`:''}${body}${actions?`<div class="actions wrap">${actions}</div>`:''}</article>`;
}
export function StatCard(label, value) {return Card({body:`<span>${escapeHtml(label)}</span><strong class="stat-value">${escapeHtml(value)}</strong>`});}
