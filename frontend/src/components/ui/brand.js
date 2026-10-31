export function Brand({large=false}={}){
  return `<div class="brand-lockup ${large?'brand-large':''}"><img src="/assets/images/arogya-mitra-logo.png" alt="Arogya Mitra — Your Health Companion" width="${large?360:64}" height="${large?360:64}">${large?'':'<span>Arogya<span class="brand-accent">Mitra</span><small>Your health companion</small></span>'}</div>`;
}
