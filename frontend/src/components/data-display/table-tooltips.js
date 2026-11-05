let nextTooltipId=0;const dismissers=new Set();
export function dismissTableTooltips(){for(const dismiss of dismissers)dismiss();}
/** A text-only portal keeps tooltips outside the horizontally scrolling table. */
export function installTableTooltips(doc){
 let element=null,target=null;const win=doc.defaultView;
 const hide=()=>{if(target){const ids=(target.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==element?.id);if(ids.length)target.setAttribute('aria-describedby',ids.join(' '));else target.removeAttribute('aria-describedby');}element?.remove();element=null;target=null;};
 const show=node=>{
  if(node===target)return;
  hide();const text=node.getAttribute('data-table-tooltip');if(!text)return;
  target=node;element=doc.createElement('div');element.id='am-table-tooltip-'+(++nextTooltipId);element.className='am-table-tooltip rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg';element.setAttribute('role','tooltip');element.textContent=text;doc.body.append(element);
  node.setAttribute('aria-describedby',[(node.getAttribute('aria-describedby')||''),element.id].filter(Boolean).join(' '));
  const rect=node.getBoundingClientRect(),width=win?.innerWidth||1024,height=win?.innerHeight||768;
  element.style.left=Math.max(8,Math.min(rect.left,width-element.getBoundingClientRect().width-8))+'px';
  const tipHeight=element.getBoundingClientRect().height;element.style.top=Math.max(8,rect.bottom+tipHeight+12>height?rect.top-tipHeight-8:rect.bottom+8)+'px';
 };
 const enter=e=>{const node=e.target.closest?.('[data-table-tooltip]');if(node)show(node);};
 const leave=e=>{if(!target)return;if(target.contains(e.relatedTarget)||element?.contains(e.relatedTarget))return;if(e.type==='pointerout'&&doc.activeElement===target)return;hide();};
 const key=e=>{if(e.key==='Escape')hide();};
 const scroll=e=>{if(element?.contains(e.target))return;hide();};
 const events=[['pointerover',enter],['focusin',enter],['pointerout',leave],['focusout',leave],['keydown',key],['scroll',scroll]];
 for(const [name,handler] of events)doc.addEventListener(name,handler,true);win?.addEventListener('resize',hide);dismissers.add(hide);
 return ()=>{hide();for(const [name,handler] of events)doc.removeEventListener(name,handler,true);win?.removeEventListener('resize',hide);dismissers.delete(hide);};
}
