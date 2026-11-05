import {escapeHtml as esc} from '../../utils/html.js';
/** Overview contains counts and destinations; record lists have one owning module. */
export function careOverview({role,services,requests,applications,language,name,setup=''}){
 const l=(te,en)=>language==='te'?te:en;
 const metrics=[
  [l('మొత్తం సేవలు','Total services'),services.length,'careManage'],
  [l('ఆమోదం కోసం సేవలు','Services awaiting approval'),services.filter(s=>s.approval==='pending').length,'careManage'],
  [l('పెండింగ్ అభ్యర్థనలు','Pending requests'),requests.filter(r=>r.status==='pending').length,'carePending'],
  [l('అంగీకరించిన అభ్యర్థనలు','Accepted requests'),requests.filter(r=>r.status==='accepted').length,'careHistory'],
 ];
 if(role==='admin')metrics.push([l('పెండింగ్ దరఖాస్తులు','Pending applications'),applications.filter(a=>a.status==='pending').length,'adminPendingProviders']);
 return `<section class="workspace-summary"><h2>${l('స్వాగతం','Welcome')}, ${esc(name||'')}</h2><p>${l('వివరాలను చూడడానికి సంబంధిత విభాగాన్ని ఎంచుకోండి.','Choose a module to view and manage its records.')}</p></section>${setup}<div class="care-metrics">${metrics.map(([label,count,screen])=>`<button type="button" class="care-metric" data-a="go" data-s="${screen}"><strong>${count}</strong><span>${label}</span></button>`).join('')}</div>`;
}
