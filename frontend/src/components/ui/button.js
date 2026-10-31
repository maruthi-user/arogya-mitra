import { attributes, escapeHtml } from '../../utils/html.js';
export function Button({label, action, variant='ghost', attrs={}, disabled=false}) {
  return `<button ${attributes({type:'button',class:`btn ${variant}`,'data-a':action,disabled,...attrs})}>${escapeHtml(label)}</button>`;
}
export function IconButton({label, icon, action, attrs={}}) {
  return `<button ${attributes({type:'button',class:'iconbtn','aria-label':label,'data-a':action,...attrs})}>${escapeHtml(icon)}</button>`;
}
