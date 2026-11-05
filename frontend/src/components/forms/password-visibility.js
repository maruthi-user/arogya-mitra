export function togglePasswordVisibility(id,button,doc=document){
 const input=doc.getElementById(id);if(!input||input.disabled)return;
 input.type=input.type==='password'?'text':'password';
 const shown=input.type==='text';button.setAttribute('aria-pressed',String(shown));
 button.setAttribute('aria-label',shown?'Hide password':'Show password');
}
