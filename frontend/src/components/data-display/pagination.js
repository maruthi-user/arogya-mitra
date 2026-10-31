import { Button } from '../ui/button.js';
import { escapeHtml } from '../../utils/html.js';
export function Pagination({page,pageCount,action,label='Page',previous='Previous',next='Next'}) {
  if(pageCount<=1)return '';
  return `<nav class="pagination" aria-label="${escapeHtml(label)}">${Button({label:previous,action,disabled:page<=1,attrs:{'data-page':page-1}})}<span aria-live="polite">${escapeHtml(label)} ${page} / ${pageCount}</span>${Button({label:next,action,disabled:page>=pageCount,attrs:{'data-page':page+1}})}</nav>`;
}
