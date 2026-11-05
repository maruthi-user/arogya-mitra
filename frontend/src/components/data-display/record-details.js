import {dismissTableTooltips} from './table-tooltips.js';
let activeClose=null,sequence=0;
export function dismissRecordDetails(){activeClose?.();}
/** Show only fields already rendered for this role, never raw API/private properties. */
export function openRecordDetails(trigger,{title='Details',closeLabel='Close'}={}){
 const doc=trigger.ownerDocument,row=trigger.closest('tr');if(!row)return;
 dismissRecordDetails();dismissTableTooltips();
 const dialog=doc.createElement('dialog');dialog.className='am-record-modal rounded-2xl border border-emerald-100 bg-white shadow-2xl';
 const heading=doc.createElement('h2');heading.id='record-details-'+(++sequence);heading.textContent=title;dialog.setAttribute('aria-labelledby',heading.id);
 const close=doc.createElement('button');close.type='button';close.className='am-record-modal-close';close.setAttribute('aria-label',closeLabel);close.textContent='×';
 const header=doc.createElement('header');header.append(heading,close);dialog.append(header);
 const fields=doc.createElement('dl');fields.className='am-record-modal-fields';
 for(const cell of row.cells){
  const content=cell.cloneNode(true);content.querySelectorAll('button,summary,[data-record-view],[data-a],input,select,textarea').forEach(node=>node.remove());
  content.querySelectorAll('details').forEach(node=>node.setAttribute('open',''));
  const value=(content.textContent||'').trim();if(!value)continue;
  const item=doc.createElement('div'),label=doc.createElement('dt'),detail=doc.createElement('dd');label.textContent=cell.dataset.label||'';
  // Keep the application's formatted detail card, but strip interactive controls.
  if(content.querySelector('.am-record-details')){content.querySelectorAll('input,select,textarea').forEach(node=>node.remove());detail.append(...content.childNodes);}else detail.textContent=value;
  item.append(label,detail);fields.append(item);
 }
 dialog.append(fields);let closed=false;
 const finish=()=>{if(closed)return;closed=true;dialog.remove();if(activeClose===finish)activeClose=null;if(trigger.isConnected)trigger.focus();};
 close.addEventListener('click',finish);dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});dialog.addEventListener('close',finish);
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)finish();});
 doc.body.append(dialog);activeClose=finish;dialog.showModal();close.focus();return dialog;
}
export function installRecordDetails(doc){
 const click=event=>{const trigger=event.target.closest?.('[data-record-view],.am-record-details>summary');if(!trigger)return;event.preventDefault();const te=doc.documentElement.lang==='te';openRecordDetails(trigger,{title:te?'పూర్తి వివరాలు':'Details',closeLabel:te?'మూసివేయండి':'Close'});};
 doc.addEventListener('click',click);return ()=>{doc.removeEventListener('click',click);dismissRecordDetails();};
}
