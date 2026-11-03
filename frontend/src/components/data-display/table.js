import {escapeHtml as esc} from '../../utils/html.js';
import {LANG} from '../../i18n/index.js';
import {EmptyState} from '../feedback/states.js';
import {queryTable,columnValue} from './table-model.js';
const l=(te,en)=>LANG==='te'?te:en;
let scope='default';const states=new Map();
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36);};
export const tableSearchInputId=id=>'table-search-'+hash(scope+':'+id);
export function setTableScope(value){scope=String(value);}
export function resetDataTables(){states.clear();scope='default';}
const stateFor=id=>{const key=scope+':'+id;if(!states.has(key))states.set(key,{query:'',sort:-1,direction:'asc',page:1,pageSize:10});return states.get(key);};
const attrs=id=>`data-table="${esc(id)}"`;
export function Table({columns=[],rows=[],caption,emptyMessage='No results',id,sort=-1,direction='asc'}){
 if(!rows.length)return EmptyState(emptyMessage);
 return `<div class="table-scroll" role="region" tabindex="0" aria-label="${esc(caption||l('పట్టిక','Table'))}"><table class="data-table"><caption>${esc(caption)}</caption><thead><tr>${columns.map((c,index)=>{
  const sortable=Boolean(id)&&c.sortable!==false;
  return `<th scope="col" ${sortable?`aria-sort="${Number(sort)===index?(direction==='asc'?'ascending':'descending'):'none'}"`:''}>${sortable?`<button type="button" data-a="tableSort" ${attrs(id)} data-column="${index}">${esc(c.label)} <span aria-hidden="true">${Number(sort)===index?(direction==='asc'?'↑':'↓'):'↕'}</span></button>`:esc(c.label)}</th>`;
 }).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td data-label="${esc(c.label)}">${c.render?c.render(row):esc(columnValue(c,row))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/** Shared controls for all fetched record lists. Render callbacks supply role-specific actions. */
export function DataTable({id,columns=[],rows=[],caption,emptyMessage='No results',mobileRenderer,showSearch=true,...options}){
 const tableId=id||caption||'records';const state=stateFor(tableId);
 const safeColumns=columns.map(c=>({...c,...(/^(actions?|review|చర్యలు|సమీక్ష)$/i.test(c.label)?{sortable:false,searchable:false}:{})}));
 const result=queryTable(rows,safeColumns,state);state.page=result.page;
 const searchId=tableSearchInputId(tableId);
 return `<section class="am-data-table" aria-label="${esc(caption||l('వివరాలు','Records'))}"><div class="am-table-toolbar">${showSearch?`<form data-form-action="tableSearch" ${attrs(tableId)}><label for="${searchId}">${l('శోధించండి','Search records')}</label><div><input id="${searchId}" type="search" value="${esc(state.query)}" placeholder="${l('పట్టికలో వెతకండి','Search this table')}" maxlength="200"><button class="btn" type="submit">${l('వెతకండి','Search')}</button></div></form>`: ''}<label>${l('ఒక పేజీకి','Rows per page')}<select data-table-size ${attrs(tableId)}>${[10,25,50,100].map(n=>`<option value="${n}" ${n===state.pageSize?'selected':''}>${n}</option>`).join('')}</select></label><label class="am-table-mobile-sort">${l('క్రమం','Sort by')}<select data-table-sort ${attrs(tableId)}><option value="-1">${l('మూల క్రమం','Default order')}</option>${safeColumns.map((c,i)=>c.sortable===false?'':`<option value="${i}" ${state.sort===i?'selected':''}>${esc(c.label)}</option>`).join('')}</select></label><button class="btn am-table-mobile-direction" type="button" data-a="tableDirection" ${attrs(tableId)} ${state.sort<0?'disabled':''}>${state.direction==='asc'?l('ఆరోహణ','Ascending'):l('అవరోహణ','Descending')}</button><button class="btn" type="button" data-a="tableReset" ${attrs(tableId)}>${l('రీసెట్','Reset')}</button></div>${Table({columns:safeColumns,rows:result.rows,caption,emptyMessage:state.query&&rows.length?l('సరిపోయే వివరాలు లేవు','No matching records'):emptyMessage,id:tableId,sort:state.sort,direction:state.direction})}<div class="am-table-footer"><span role="status">${result.start}–${result.end} / ${result.total} ${l('వివరాలు','records')}</span><nav aria-label="${l('పట్టిక పేజీలు','Table pages')}"><button class="btn" type="button" data-a="tablePage" ${attrs(tableId)} data-page="${result.page-1}" ${result.page===1?'disabled':''}>${l('మునుపటి','Previous')}</button><span>${result.page} / ${result.pageCount}</span><button class="btn" type="button" data-a="tablePage" ${attrs(tableId)} data-page="${result.page+1}" ${result.page===result.pageCount?'disabled':''}>${l('తరువాత','Next')}</button></nav></div></section>`;
}
export function createTableActions(render){return {
 tableSearch:d=>{const s=stateFor(d.table);s.query=document.getElementById(tableSearchInputId(d.table))?.value.slice(0,200)||'';s.page=1;render(false);},
 tableSort:d=>{const s=stateFor(d.table),column=Number(d.column);if(!Number.isInteger(column)||column<0)return;s.direction=s.sort===column&&s.direction==='asc'?'desc':'asc';s.sort=column;s.page=1;render(false);},
 tableSortSelect:d=>{const column=Number(d.value);if(!Number.isInteger(column)||column< -1)return;Object.assign(stateFor(d.table),{sort:column,page:1});render(false);},
 tableDirection:d=>{const s=stateFor(d.table);s.direction=s.direction==='asc'?'desc':'asc';render(false);},
 tablePage:d=>{stateFor(d.table).page=Math.max(1,Math.floor(Number(d.page))||1);render(false);},
 tableSize:d=>{const size=Number(d.value);if(![10,25,50,100].includes(size))return;Object.assign(stateFor(d.table),{pageSize:size,page:1});render(false);},
 tableReset:d=>{Object.assign(stateFor(d.table),{query:'',sort:-1,direction:'asc',page:1});render(false);}
};}
