import { Button } from '../ui/button.js';
import { escapeHtml } from '../../utils/html.js';
export function ConfirmDialog({title,message,confirmLabel='Confirm',cancelLabel='Cancel',onConfirm}) {
  const dialog=document.createElement('dialog');dialog.className='confirm-dialog';
  dialog.innerHTML=`<h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><div class="actions">${Button({label:cancelLabel,attrs:{'data-dialog':'cancel'}})}${Button({label:confirmLabel,variant:'danger',attrs:{'data-dialog':'confirm'}})}</div>`;
  dialog.addEventListener('click',event=>{
    const action=event.target.closest('[data-dialog]')?.dataset.dialog;
    if(action==='cancel')dialog.close();
    if(action==='confirm'){dialog.close();onConfirm();}
  });
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  document.body.append(dialog);dialog.showModal();
  return dialog;
}
