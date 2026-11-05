import {openRecordDetails,dismissRecordDetails} from './record-details.js';
﻿import React,{useState,useEffect} from 'react';
import {tableIcons,actionIconName} from './table-presentation.js';
const textOf=node=>typeof node==='string'||typeof node==='number'?String(node):Array.isArray(node)?node.map(textOf).join(' '):React.isValidElement(node)?textOf(node.props.children):'';
function icon(name){return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{(tableIcons[name]||tableIcons.more).map((d,i)=><path key={i} d={d}/>)}</svg>;}
function decorate(node){
 if(!React.isValidElement(node))return Array.isArray(node)?node.map((child,i)=><React.Fragment key={i}>{decorate(child)}</React.Fragment>):node;
 if(node.type==='button'||node.type==='a'||node.type==='summary'||node.props.onClick){const label=node.props['aria-label']||textOf(node);return React.cloneElement(node,{'aria-label':label,'data-table-tooltip':label,className:(node.props.className||'')+' am-icon-action inline-flex size-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50'},icon(actionIconName('', '',label)));}
 return node.props.children?React.cloneElement(node,{},decorate(node.props.children)):node;
}
function cell(column,row){const node=column.render?column.render(row):String(columnValue(column,row)??'');if(column.sortable===false&&column.searchable===false)return <div className="flex flex-wrap gap-1.5">{decorate(node)}</div>;const text=column.tooltip?column.tooltip(row):textOf(node);return <span className="am-cell-value block max-w-[16rem] truncate text-sm" data-table-tooltip={text} tabIndex={text.length>24?0:undefined}>{node}</span>;}
function Action({label,name,...props}){return <button {...props} type="button" className="btn am-icon-action inline-flex size-9 items-center justify-center rounded-lg border border-emerald-200 text-emerald-700" aria-label={label} data-table-tooltip={label}>{icon(name)}</button>;}

import {queryTable,columnValue} from './table-model.js';
import {columnWidth,tableMinimumWidth} from './column-layout.js';
/** React adapter for the same table model used by healthcare workflow pages. */
export default function RecordDataTable({id='records',caption,rows=[],columns=[],language='en',emptyMessage}){
 useEffect(()=>()=>dismissRecordDetails(),[]);
 const [state,setState]=useState({query:'',sort:-1,direction:'asc',page:1,pageSize:10});
 const result=queryTable(rows,columns,{...state,sort:-1}),te=language==='te',l=(telugu,english)=>te?telugu:english;
 const update=patch=>setState(s=>({...s,...patch}));
 return <div className="am-table-root"><section className="am-data-table am-table-simple" aria-label={caption}>
  <div className="am-table-toolbar">
   <form onSubmit={e=>e.preventDefault()}><label className="sr-only" htmlFor={id+'-search'}>{l('శోధించండి','Search records')}</label><div><input id={id+'-search'} type="search" maxLength={200} value={state.query} onChange={e=>update({query:e.target.value,page:1})} placeholder={l('వెతకండి','Search records...')}/><Action name="search" label={l('వెతకండి','Search')}/></div></form>
   <div className="am-table-controls"><label className="am-table-page-size">{l('వరుసలు','Rows')}<select value={state.pageSize} onChange={e=>update({pageSize:Number(e.target.value),page:1})}>{[10,25,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label><nav className="am-table-pagination" aria-label={l('పట్టిక పేజీలు','Table pages')}><Action name="left" label={l('మునుపటి','Previous')} disabled={result.page===1} onClick={()=>update({page:result.page-1})}/><span role="status">{result.start}–{result.end} / {result.total}</span><Action name="right" label={l('తరువాత','Next')} disabled={result.page===result.pageCount} onClick={()=>update({page:result.page+1})}/></nav></div>
  </div>
  {result.rows.length?<div className="table-scroll w-full overflow-x-auto" role="region" aria-label={caption} tabIndex={0}><table style={{"--am-table-min-width":tableMinimumWidth([...columns,{width:96}])+"px"}} className="data-table w-full table-fixed border-collapse text-left text-sm"><colgroup>{columns.map((c,i)=><col key={c.key||i} style={{width:columnWidth(c)}}/>)}<col style={{width:96}}/></colgroup><caption>{caption}</caption><thead><tr>{columns.map((c,index)=><th key={c.key||index} scope="col">{c.label}</th>)}<th scope="col">{l('పూర్తి వివరాలు','Details')}</th></tr></thead><tbody>{result.rows.map((row,index)=><tr key={row.id??index}>{columns.map((c,i)=><td key={c.key||i} data-label={c.label}>{cell(c,row)}</td>)}<td data-label={l('పూర్తి వివరాలు','Details')}><Action name="eye" label={l('పూర్తి వివరాలు','View details')} onClick={event=>openRecordDetails(event.currentTarget,{title:l('పూర్తి వివరాలు','Details'),closeLabel:l('మూసివేయండి','Close')})}/></td></tr>)}</tbody></table></div>:<p className="empty-state">{emptyMessage||l('సరిపోయే వివరాలు లేవు','No matching records')}</p>}
 </section></div>;
}
