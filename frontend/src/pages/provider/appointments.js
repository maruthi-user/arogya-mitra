import { T, LANG } from '../../i18n/index.js';

import { Appointments } from '../../features/appointments/workflow.js';

import { SearchInput, FilterBar } from '../../components/forms/search-input.js';
import { DataTable } from '../../components/data-display/table.js';
import { Pagination } from '../../components/data-display/pagination.js';
import { queryCollection } from '../../utils/collection.js';
import { renderAppointmentActions, renderAppointmentHistory } from '../../features/appointments/components/appointment-card.js';
export function createProviderAppointmentsPage(ctx) {
const { page, esc, dateLabel, fmtTime, appointment, mine, listView } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>{
  const result=queryCollection(mine(),{query:listView.query,page:listView.page,pageSize:8,searchText:b=>`${b.name} ${b.reason||''} ${b.date}`,
    predicate:b=>!listView.status||b.status===listView.status,
    compare:listView.sort==='newest'?(a,b)=>b.createdAt-a.createdAt:(a,b)=>(a.date+a.time).localeCompare(b.date+b.time)});
  const controls=SearchInput({id:'appointmentSearch',value:listView.query,label:l('శోధించండి','Search'),action:'filterAppointments'})+
    FilterBar({action:'filterAppointments',label:l('వర్తింపజేయండి','Apply'),controls:[
      {id:'appointmentStatus',label:l('స్థితి','Status'),value:listView.status,options:[{value:'',label:l('అన్నీ','All')},...['pending','confirmed','declined','cancelled','expired','done','no_show'].map(s=>({value:s,label:Appointments.label(s)}))]},
      {id:'appointmentSort',label:l('క్రమం','Sort'),value:listView.sort,options:[{value:'date',label:l('అపాయింట్‌మెంట్ తేదీ','Appointment date')},{value:'newest',label:l('కొత్త అభ్యర్థనలు','Newest request')}]}
    ]});
  const records=DataTable({rows:result.rows,caption:T.requests,emptyMessage:T.noRequests,mobileRenderer:b=>appointment(b,true),columns:[
    {key:'name',label:l('రోగి','Patient')},{key:'phone',label:l('ఫోన్','Contact')},{label:l('సమయం','Time'),render:b=>`${esc(dateLabel(b.date))}<br>${esc(fmtTime(b.time))}`},
    {label:l('స్థితి','Status'),render:b=>esc(Appointments.label(b.status))},{key:'reason',label:l('కారణం','Reason')},
    {label:l('చర్యలు','Actions'),render:b=>`<div class="actions">${renderAppointmentActions(b,true)}</div>`},
    {label:l('చరిత్ర','History'),render:renderAppointmentHistory}
  ]});
  return {voice:null,html:page(T.requests,controls+records+Pagination({...result,action:'appointmentPage',label:l('పేజీ','Page'),previous:l('మునుపటి','Previous'),next:l('తరువాత','Next')}))};
};
}
