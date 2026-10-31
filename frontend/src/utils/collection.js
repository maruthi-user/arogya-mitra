/** Presentation-only querying for fetched catalogs. API pagination can supply the same view model. */
export function queryCollection(rows,{query='',searchText=()=>'',predicate=()=>true,compare,page=1,pageSize=10}={}) {
  const term=query.trim().toLocaleLowerCase();
  const filtered=rows.filter(row=>predicate(row)&&(!term||String(searchText(row)).toLocaleLowerCase().includes(term)));
  if(compare)filtered.sort(compare);
  const size=Math.max(1,pageSize),pageCount=Math.max(1,Math.ceil(filtered.length/size));
  const current=Math.max(1,Math.min(pageCount,Number(page)||1));
  return {rows:filtered.slice((current-1)*size,current*size),total:filtered.length,page:current,pageCount,pageSize:size};
}
