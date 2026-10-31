import { attributes, escapeHtml } from '../../utils/html.js';
export function Input({id,label,value='',type='text',attrs={},error=''}) {
  return `<label class="field" for="${escapeHtml(id)}">${escapeHtml(label)}<input ${attributes({id,name:id,type,value,...attrs,'aria-invalid':error?'true':undefined,'aria-describedby':error?id+'-error':undefined})}></label>${error?`<p id="${escapeHtml(id)}-error" role="alert">${escapeHtml(error)}</p>`:''}`;
}
export function Select({id,label,value='',options=[],attrs={}}) {
  return `<label class="field" for="${escapeHtml(id)}">${escapeHtml(label)}<select ${attributes({id,name:id,...attrs})}>${options.map(o=>`<option ${attributes({value:o.value,selected:String(value)===String(o.value)})}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;
}
