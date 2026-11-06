import { legacyText } from '../../i18n/legacy.js';
import {tableToolbar} from './table-toolbar.js';
import {iconifyTableActions,tableCellContent} from './table-presentation.js';
﻿import {escapeHtml as esc} from '../../utils/html.js';
import {EmptyState} from '../feedback/states.js';
import {queryTable} from './table-model.js';
import {columnWidth,tableMinimumWidth} from './column-layout.js';
let scope='default';const states=new Map();
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(36);};
export const tableSearchInputId=id=>'table-search-'+hash(scope+':'+id);
export function setTableScope(value){scope=String(value);}
export function resetDataTables(){states.clear();scope='default';}
const stateFor=id=>{const key=scope+':'+id;if(!states.has(key))states.set(key,{query:'',sort:-1,direction:'asc',page:1,pageSize:10});return states.get(key);};
const attrs=id=>`data-table="${esc(id)}"`;
export function Table({columns=[],rows=[],caption,emptyMessage='No results',id,sort=-1,direction='asc'}){
 if(!rows.length)return EmptyState(emptyMessage);
 if(!columns.some(c=>/^(Details|పూర్తి వివరాలు)$/i.test(c.label)))columns=[...columns,{label:legacyText('details_bb9102'),sortable:false,searchable:false,render:()=>iconifyTableActions(`<button type="button" data-record-view aria-label="${legacyText('view_details_bbe43a')}">${legacyText('view_details_bbe43a')}</button>`)}];
 return `<div class="table-scroll w-full overflow-x-auto" role="region" tabindex="0" aria-label="${esc(caption||legacyText('table_5631f4'))}"><table style="--am-table-min-width:${tableMinimumWidth(columns)}px" class="data-table w-full table-fixed border-collapse text-left text-sm"><colgroup>${columns.map(c=>`<col style="width:${columnWidth(c)}px">`).join('')}</colgroup><caption>${esc(caption)}</caption><thead><tr>${columns.map((c,index)=>{
  const sortable=Boolean(id)&&c.sortable!==false;
  return `<th scope="col" ${sortable?`aria-sort="${Number(sort)===index?(direction==='asc'?'ascending':'descending'):'none'}"`:''}>${sortable?`<button type="button" data-a="tableSort" ${attrs(id)} data-column="${index}">${esc(c.label)} <span aria-hidden="true">${Number(sort)===index?(direction==='asc'?'↑':'↓'):'↕'}</span></button>`:esc(c.label)}</th>`;
 }).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td data-label="${esc(c.label)}">${tableCellContent(c,row)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/** Shared controls for all fetched record lists. Render callbacks supply role-specific actions. */
export function DataTable({id,columns=[],rows=[],caption,emptyMessage='No results',showSearch=true,simpleToolbar=true}){
 const tableId=id||caption||'records';const state=stateFor(tableId);
 const safeColumns=columns.map(c=>({...c,...(simpleToolbar?{sortable:false}:{}),...(/^(actions?|review|\u0c1a\u0c30\u0c4d\u0c2f\u0c32\u0c41|\u0c38\u0c2e\u0c40\u0c15\u0c4d\u0c37)$/i.test(c.label)?{sortable:false,searchable:false}:{})}));
 const result=queryTable(rows,safeColumns,simpleToolbar?{...state,sort:-1}:state);state.page=result.page;
 const searchId=tableSearchInputId(tableId),toolbar=tableToolbar({tableId,searchId,state,result,columns:safeColumns,showSearch,simpleToolbar});
 return iconifyTableActions(`<section class="am-data-table ${simpleToolbar?'am-table-simple':''}" aria-label="${esc(caption||legacyText('records_4d4617'))}">${toolbar.header}${Table({columns:safeColumns,rows:result.rows,caption,emptyMessage:state.query&&rows.length?legacyText('no_matching_records_886ed3'):emptyMessage,id:tableId,sort:state.sort,direction:state.direction})}${toolbar.footer}</section>`);
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
