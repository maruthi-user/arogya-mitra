import {escapeHtml as esc} from '../../utils/html.js';
import {plainText} from './table-model.js';
export const tableIcons={
 eye:['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12','M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
 edit:['m16 3 5 5-12 12-6 1 1-6L16 3','m14 5 5 5'],
 check:['m5 12 4 4L19 6'],reject:['m6 6 12 12M6 18 18 6'],
 pause:['M8 5v14M16 5v14'],play:['m8 4 12 8-12 8V4'],
 calendar:['M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2','M7 2v5m10-5v5M3 10h18m-9 3v5m-3-2h6'],
 search:['M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0','m15 15 6 6'],
 refresh:['M20 7A9 9 0 1 0 21 14M20 2v6h-6'],
 download:['M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5'],
 phone:['M4 3h4l2 5-3 2a16 16 0 0 0 7 7l2-3 5 2v4c-9 3-20-8-17-17'],
 send:['m3 3 19 9-19 9 4-9-4-9','M7 12h15'],plus:['M12 4v16M4 12h16'],
 logout:['M9 3H3v18h6m6-15 6 6-6 6m-8-6h14'],
 history:['M3 12a9 9 0 1 0 3-7M3 3v6h6m3-2v5l3 2'],
 reset:['M3 5h18M7 12h10m-7 7h4','m17 15 5 7m-5 0 5-7'],
 left:['m15 5-7 7 7 7'],right:['m9 5 7 7-7 7'],
 sort:['M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4'],
 more:['M5 12h.01M12 12h.01M19 12h.01']
};
export function actionIconName(action='',attributes='',label=''){
 const decision=attributes.match(/data-(?:decision|status)="([^"]+)"/)?.[1]||'';
 if(/approved|accepted|confirmed|completed|^done$/.test(decision))return 'check';
 if(/rejected|declined|cancelled|no_show/.test(decision))return 'reject';
 if(decision==='in_progress')return 'play';
 const key=(action+' '+label).toLowerCase();
 if(/edit|సవరించ/.test(key))return 'edit';
 if(/download|document|పత్రా/.test(key)||/\/documents\/|\/download/.test(attributes))return 'download';
 if(/tel:/.test(attributes)||/call|కాల్/.test(key))return 'phone';
 if(/logout|sign out|నిష్క్రమ/.test(key))return 'logout';
 if(/history|timeline|చరిత్ర/.test(key))return 'history';
 if(/previous|మునుపటి/.test(key))return 'left';
 if(/next|తరువాత/.test(key))return 'right';
 if(/reset|రీసెట్/.test(key))return 'reset';
 if(/search|^med |searchmedicine|వెతక/.test(key))return 'search';
 if(/availability/.test(key))return /pause|విరామం/.test(key)?'pause':'play';
 if(/stock/.test(key))return /data-available="true"/.test(attributes)?'check':'pause';
 if(/retry|reload|loadstaff|refresh|మళ్లీ/.test(key))return 'refresh';
 if(/requestmedicine|send|inquiry|పంప/.test(key))return 'send';
 if(/select|book/.test(key))return 'calendar';
 if(/add|new|invite|జోడించ/.test(key))return 'plus';
 if(/sort|ascending|descending|ఆరోహణ|అవరోహణ/.test(key))return 'sort';
 if(/detail|view|review|వివరా|సమీక్ష/.test(key))return 'eye';
 return 'more';
}
export function tableIcon(name){return `<svg class="size-4 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(tableIcons[name]||tableIcons.more).map(d=>`<path d="${d}"/>`).join('')}</svg>`;}
/** Only trusted, app-rendered table markup is decorated; action attributes are preserved. */
export function iconifyTableActions(html){
 const decorate=(whole,tag,attributes,content)=>{
  if(/\bdata-table-text-action\b/.test(attributes))return whole;
  if(/\bam-icon-action\b/.test(attributes)||/data-a="tableSort"/.test(attributes))return whole;
  const label=plainText(attributes.match(/aria-label="([^"]*)"/)?.[1]||content)||'View details';
  const action=attributes.match(/data-a="([^"]*)"/)?.[1]||'';
  const icon=tag==='summary'?(/history|timeline|చరిత్ర/.test(label)?'history':'eye'):actionIconName(action,attributes,label);
  let attr=attributes.replace(/\s(?:aria-label|title|data-table-tooltip)="[^"]*"/g,'');
  const classes='am-icon-action inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500';
  attr=/\bclass="/.test(attr)?attr.replace(/class="([^"]*)"/,(_,current)=>`class="${current} ${classes}"`):attr+` class="${classes}"`;
  return `<${tag}${attr} aria-label="${esc(label)}" data-table-tooltip="${esc(label)}">${tableIcon(icon)}</${tag}>`;
 };
 return html.replace(/<(button|a|summary)\b([^>]*)>([\s\S]*?)<\/\1>/g,decorate);
}
export function tableCellContent(column,row){
 const content=column.render?column.render(row):esc(column.value?column.value(row):row[column.key]);
 const markup=String(content??'');
 if(/<(?:button|a|details|input|select|textarea)\b/.test(markup))return `<div class="am-cell-controls flex min-w-0 flex-wrap items-start gap-1.5">${iconifyTableActions(markup)}</div>`;
 const text=column.tooltip?String(column.tooltip(row)??''):plainText(markup);
 return `<span class="am-cell-value block max-w-[16rem] truncate text-sm" ${text.length>24?'tabindex="0"':''} data-table-tooltip="${esc(text)}">${markup}</span>`;
}
