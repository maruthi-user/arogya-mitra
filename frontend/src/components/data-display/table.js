import { escapeHtml } from '../../utils/html.js';
import { EmptyState } from '../feedback/states.js';
export function Table({columns,rows,caption,emptyMessage='No results'}) {
  if(!rows.length)return EmptyState(emptyMessage);
  return `<div class="table-scroll"><table class="data-table"><caption>${escapeHtml(caption)}</caption><thead><tr>${columns.map(c=>`<th scope="col">${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td>${c.render?c.render(row):escapeHtml(row[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/** Rows are already filtered/paged. This component never fetches data or decides permissions. */
export function DataTable({mobileRenderer,...props}) {
  const table=Table(props);
  if(!mobileRenderer)return table;
  return `<div class="desktop-records">${table}</div><div class="mobile-records stack">${props.rows.map(mobileRenderer).join('')||EmptyState(props.emptyMessage)}</div>`;
}
