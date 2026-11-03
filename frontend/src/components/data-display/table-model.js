/** Shared presentation-only querying. Rows must already be permission-filtered by the API. */
export function plainText(value){
 if(value==null)return '';
 if(typeof value!=='string')return typeof value==='object'?'':String(value);
 return value.replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g,e=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&nbsp;':' '}[e])).replace(/\s+/g,' ').trim();
}
export function columnValue(column,row,search=false){
 const accessor=search?(column.searchValue||column.value||column.sortValue):(column.sortValue||column.value);
 if(accessor)return accessor(row);
 if(column.key)return row[column.key];
 return column.render?plainText(column.render(row)):'';
}
export function queryTable(rows,columns,{query='',sort=-1,direction='asc',page=1,pageSize=10}={}){
 const term=String(query).trim().toLocaleLowerCase();
 const filtered=(Array.isArray(rows)?rows:[]).map((row,index)=>({row,index})).filter(({row})=>!term||columns.some(c=>c.searchable!==false&&(plainText(columnValue(c,row,true))+' '+(c.render?plainText(c.render(row)):'' )).toLocaleLowerCase().includes(term)));
 const column=columns[Number(sort)];
 if(column&&column.sortable!==false){const sign=direction==='desc'?-1:1;filtered.sort((a,b)=>{
  const av=columnValue(column,a.row),bv=columnValue(column,b.row);
  const comparison=typeof av==='number'&&typeof bv==='number'?av-bv:String(av??'').localeCompare(String(bv??''),undefined,{numeric:true,sensitivity:'base'});
  return comparison*sign||a.index-b.index;
 });}
 const size=[10,25,50,100].includes(Number(pageSize))?Number(pageSize):10;
 const pageCount=Math.max(1,Math.ceil(filtered.length/size)),current=Math.max(1,Math.min(pageCount,Math.floor(Number(page))||1));
 return {rows:filtered.slice((current-1)*size,current*size).map(item=>item.row),total:filtered.length,page:current,pageSize:size,pageCount,start:filtered.length?(current-1)*size+1:0,end:Math.min(current*size,filtered.length)};
}
