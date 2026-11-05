/** One sizing contract for workflow tables and the React account adapter. */
export function columnWidth(column) {
 const explicit=Number(column.width);
 if(Number.isFinite(explicit)&&explicit>=64)return Math.min(explicit,600);
 const key=column.key||'';
 if(/description|address|details|reason|message/i.test(key))return 240;
 if(/email|organization|title|name/i.test(key))return 200;
 if(/date|time|At$|phone|status|approval/i.test(key))return 150;
 if(/fee|charge|duration|attempts|active|open|available/i.test(key))return 120;
 if(column.sortable===false&&column.searchable===false)return 120;
 return 160;
}
export const tableMinimumWidth=columns=>Math.max(640,columns.reduce((sum,column)=>sum+columnWidth(column),0));
