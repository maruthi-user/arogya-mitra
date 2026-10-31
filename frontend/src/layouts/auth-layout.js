import { Brand } from '../components/ui/brand.js';
import { Icon } from '../components/ui/icon.js';
import { escapeHtml } from '../utils/html.js';
export function AuthLayout({role='provider',title,description,body}){
  return `<section class="auth-shell"><aside class="auth-brand-panel"><button class="text-button auth-back" data-a="switchRole">← Back to home</button>${Brand({large:true})}<div><span class="eyebrow">CARE THAT CONNECTS</span><h2>A healthier community.<br>A simpler way to care.</h2><p>One connected space for patients, healthcare professionals and the people who support them.</p></div><span class="auth-footnote">Telugu & English · Built around people</span></aside>
    <main class="auth-main"><div class="auth-mobile-brand">${Brand()}</div><div class="auth-form-wrap"><span class="auth-role ${role}">${Icon(role)} ${role==='admin'?'Administration':'Healthcare provider'}</span><h1>${escapeHtml(title)}</h1><p class="muted auth-description">${escapeHtml(description)}</p>${body}<p class="auth-bottom">Arogya Mitra · Your health companion</p></div></main></section>`;
}
