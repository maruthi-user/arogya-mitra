import { attributes, escapeHtml } from '../../utils/html.js';
export function Input({id,label,value='',type='text',attrs={},error=''}) {
  const input=`<input ${attributes({id,name:id,type,value,...attrs,'aria-invalid':error?'true':undefined,'aria-describedby':error?id+'-error':undefined})}>`;
  const control=type==='password'?`<span class="am-password-control">${input}<button type="button" data-a="togglePassword" data-target="${escapeHtml(id)}" aria-label="Show password" aria-controls="${escapeHtml(id)}" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="am-password-slash" d="m3 3 18 18"/></svg></button></span>`:input;
  return `<div class="field"><label for="${escapeHtml(id)}">${escapeHtml(label)}</label>${control}</div>${error?`<p id="${escapeHtml(id)}-error" role="alert">${escapeHtml(error)}</p>`:''}`;
}
export function Select({id,label,value='',options=[],attrs={}}) {
  return `<label class="field" for="${escapeHtml(id)}">${escapeHtml(label)}<select ${attributes({id,name:id,...attrs})}>${options.map(o=>`<option ${attributes({value:o.value,selected:String(value)===String(o.value)})}>${escapeHtml(o.label)}</option>`).join('')}</select></label>`;
}
