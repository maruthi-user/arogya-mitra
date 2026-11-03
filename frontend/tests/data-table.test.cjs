const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {moduleLoader}=require('./helpers/module-loader.cjs');
async function tables(){const dom=new JSDOM('<main id="app"></main>');const load=moduleLoader(vm.createContext({document:dom.window.document,window:dom.window,console}));(await load('i18n/index.js')).applyLang('en');return {dom,load,table:await load('components/data-display/table.js'),model:await load('components/data-display/table-model.js')};}

test('shared table filters before paging and sorts numbers stably without changing fetched data',async()=>{
 const {dom,model}=await tables();const rows=Object.freeze([{id:'a',fee:100,name:'Alpha'},{id:'b',fee:2,name:'Beta'},{id:'c',fee:2,name:'Gamma'}]);const columns=[{key:'name'},{key:'fee'}];
 assert.equal(model.queryTable(rows,columns,{sort:1}).rows.map(r=>r.id).join(','),'b,c,a');
 assert.equal(model.queryTable(rows,columns,{sort:1,direction:'desc'}).rows.map(r=>r.id).join(','),'a,b,c');
 const many=Array.from({length:27},(_,i)=>({id:i,name:i===26?'Needle':'Other '+i}));const result=model.queryTable(many,columns,{query:'Needle',page:5,pageSize:10});assert.equal(result.page,1);assert.equal(result.total,1);assert.equal(result.rows[0].id,26);assert.equal(rows.map(r=>r.id).join(','),'a,b,c');
 dom.window.close();
});
test('table actions handle search, paging, page size, sort, reset and mobile sort controls',async()=>{
 const {dom,table}=await tables();const root=dom.window.document.getElementById('app');const rows=Array.from({length:27},(_,i)=>({id:i,name:'Record '+i,fee:i}));const columns=[{key:'name',label:'Name'},{key:'fee',label:'Fee'}];
 table.setTableScope('provider:one:services');const render=()=>{root.innerHTML=table.DataTable({id:'services',caption:'Services',rows,columns});};const actions=table.createTableActions(render);render();
 assert.equal(root.querySelectorAll('tbody tr').length,10);assert.equal(root.querySelector('button[data-a="tablePage"]').disabled,true);assert.ok(root.querySelector('select[data-table-sort]'));
 actions.tablePage({table:'services',page:3});assert.equal(root.querySelectorAll('tbody tr').length,7);assert.match(root.textContent,/21–27 \/ 27/);
 actions.tableSize({table:'services',value:25});assert.equal(root.querySelectorAll('tbody tr').length,25);
 actions.tableSort({table:'services',column:1});assert.equal(root.querySelector('th[aria-sort="ascending"]').textContent.trim(),'Fee ↑');actions.tableSort({table:'services',column:1});assert.equal(root.querySelector('tbody td').textContent,'Record 26');
 dom.window.document.getElementById(table.tableSearchInputId('services')).value='Record 26';actions.tableSearch({table:'services'});assert.equal(root.querySelectorAll('tbody tr').length,1);
 actions.tableReset({table:'services'});assert.equal(root.querySelectorAll('tbody tr').length,25);actions.tableSortSelect({table:'services',value:1});actions.tableDirection({table:'services'});assert.equal(root.querySelector('tbody td').textContent,'Record 26');
 assert.equal(root.querySelector('tbody td').getAttribute('data-label'),'Name');dom.window.close();
});
test('table state is isolated by role, account, module and table id and clears on reset',async()=>{
 const {dom,table}=await tables();const root=dom.window.document.getElementById('app');const props={id:'records',caption:'Records',rows:[{name:'Alpha'},{name:'Beta'}],columns:[{key:'name',label:'Name'}]};const render=()=>root.innerHTML=table.DataTable(props);const actions=table.createTableActions(render);
 table.setTableScope('patient:one:history');render();dom.window.document.getElementById(table.tableSearchInputId('records')).value='Alpha';actions.tableSearch({table:'records'});assert.equal(root.querySelectorAll('tbody tr').length,1);
 table.setTableScope('provider:two:history');render();assert.equal(root.querySelectorAll('tbody tr').length,2);
 table.setTableScope('patient:one:history');render();assert.equal(root.querySelectorAll('tbody tr').length,1);assert.match(table.DataTable({...props,id:'another-table'}),/0?1–2 \/ 2/);
 table.resetDataTables();table.setTableScope('patient:one:history');render();assert.equal(root.querySelectorAll('tbody tr').length,2);dom.window.close();
});
test('table escapes values and queries and can search formatted labels without searching action text',async()=>{
 const {dom,table,model}=await tables();const root=dom.window.document.getElementById('app');const props={id:'unsafe',caption:'<Records>',rows:[{name:'<img src=x onerror=alert(1)>',open:true}],columns:[{key:'name',label:'Name'},{key:'open',label:'Availability',render:r=>r.open?'Available':'Closed'},{label:'Actions',searchable:false,render:()=>'<button>Delete</button>'}]};
 root.innerHTML=table.DataTable(props);assert.equal(root.querySelector('img'),null);assert.match(root.textContent,/<img src=x/);assert.equal(model.queryTable(props.rows,props.columns,{query:'Available'}).total,1);assert.equal(model.queryTable(props.rows,props.columns,{query:'Delete'}).total,0);
 const actions=table.createTableActions(()=>{root.innerHTML=table.DataTable(props);});dom.window.document.getElementById(table.tableSearchInputId('unsafe')).value='" autofocus onfocus=alert(1)';actions.tableSearch({table:'unsafe'});assert.equal(root.querySelector('input').hasAttribute('onfocus'),false);assert.match(root.textContent,/No matching records/);dom.window.close();
});
test('patient provider and admin record screens use shared tables while retaining role-specific actions',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot();const settle=()=>new Promise(r=>setTimeout(r,10));
 await f.click('chooseRole',{role:'patient'});for(const screen of ['home','providers','bookings','meds','medicineRequests','careCatalog']){await f.click('go',{s:screen});await settle();assert.match(f.element('app').innerHTML,/am-data-table/,screen);assert.doesNotMatch(f.element('app').innerHTML,/data-a="careReview"/);}
 await f.click('chooseRole',{role:'provider'});f.element('loginUsername').value='provider';f.element('loginPassword').value='Provider-password-123!';await f.submit('login');for(const screen of ['careManage','careHistory','providerBookings','providerAvailability','providerNotifications']){await f.click('go',{s:screen});await settle();assert.match(f.element('app').innerHTML,/am-data-table/,screen);assert.doesNotMatch(f.element('app').innerHTML,/data-a="careReview"/);}
 await f.click('chooseRole',{role:'admin'});f.element('loginUsername').value='admin';f.element('loginPassword').value='Admin-password-123!';await f.submit('login');for(const screen of ['adminPendingProviders','adminApplications','adminNotifications','adminAudit','adminPharmacies','adminRequests','businessReviews','careOrgs']){await f.click('go',{s:screen});await settle();assert.match(f.element('app').innerHTML,/am-data-table/,screen);}
 f.app.destroy();
});

test('table review actions are limited to admins and pending service records',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot({serviceApproval:'pending'});
 await f.click('chooseRole',{role:'admin'});f.element('loginUsername').value='admin';f.element('loginPassword').value='Admin-password-123!';await f.submit('login');await f.click('go',{s:'careManage'});await new Promise(r=>setTimeout(r,10));
 assert.match(f.element('app').innerHTML,/data-a="careReview"[^>]*data-decision="approved"/);assert.match(f.element('app').innerHTML,/data-a="careReview"[^>]*data-decision="rejected"/);f.app.destroy();
});
test('workflow table search is cleared when a user logs out and signs in again',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot();const settle=()=>new Promise(r=>setTimeout(r,10));
 async function login(){await f.click('chooseRole',{role:'provider'});f.element('loginUsername').value='provider';f.element('loginPassword').value='Provider-password-123!';await f.submit('login');await f.click('go',{s:'careManage'});await settle();}
 await login();const searchId=f.element('app').innerHTML.match(/id="(table-search-[^"]+)"/)[1];f.element(searchId).value='No matching service';await f.click('tableSearch',{table:'managed-services'});assert.match(f.element('app').innerHTML,/No matching records/);
 await f.click('logout');await login();assert.match(f.element('app').innerHTML,/Home visit/);assert.doesNotMatch(f.element('app').innerHTML,/value="No matching service"/);f.app.destroy();
});
