import { escapeHtml } from '../../utils/html.js';
export function ReviewDialog({title,details,confirmLabel='Submit',cancelLabel='Edit',field}){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='review-dialog';
    dialog.innerHTML=`<form method="dialog"><div class="dialog-heading"><span class="eyebrow">PLEASE REVIEW</span><h2>${escapeHtml(title)}</h2></div><dl class="review-details">${Object.entries(details).map(([key,value])=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value||'—')}</dd></div>`).join('')}</dl>
      ${field?`<label class="field">${escapeHtml(field.label)}<textarea name="reason" required minlength="5" maxlength="1000" rows="4" placeholder="${escapeHtml(field.placeholder||'')}"></textarea></label>`:''}
      <div class="dialog-actions"><button class="btn ghost" type="button" data-review-cancel>${escapeHtml(cancelLabel)}</button><button class="btn accent" type="submit">${escapeHtml(confirmLabel)}</button></div></form>`;
    let result=null;
    dialog.querySelector('[data-review-cancel]').addEventListener('click',()=>dialog.close());
    dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();result={reason:dialog.querySelector('textarea')?.value.trim()||''};dialog.close();});
    dialog.addEventListener('close',()=>{dialog.remove();resolve(result);},{once:true});document.body.append(dialog);dialog.showModal();
  });
}
