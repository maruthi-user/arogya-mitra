const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {moduleLoader}=require('./helpers/module-loader.cjs');
const {boot}=require('./helpers/api-fixture.cjs');
const settle=()=>new Promise(resolve=>setTimeout(resolve,10));
test('discovery combines backend coverage, query, accepting status and stable fee sorting without mutating records',async()=>{
 const {filterServices}=await moduleLoader(vm.createContext({}))('features/care/patient-model.js');
 const rows=[{id:'b',title:'Clinic',fee:90,coverage:['town'],available:true},{id:'a',title:'Clinic',fee:20,coverage:['town'],available:true},{id:'c',title:'Clinic',fee:10,coverage:['town'],available:false}];
 assert.equal(filterServices(rows,{query:' CLINIC ',village:'town',accepting:'yes',sort:'feeAsc'}).map(r=>r.id).join(','),'a,b');
 assert.equal(filterServices(rows,{sort:'feeDesc'}).map(r=>r.id).join(','),'b,a,c');
 assert.equal(filterServices(rows,{village:'missing'}).length,0);assert.equal(rows[0].id,'b');
});
test('callback acceptance and ambulance acceptance explain their actual limits in both languages',async()=>{
 const {requestGuidance}=await moduleLoader(vm.createContext({}))('features/care/patient-model.js');
 assert.match(requestGuidance({status:'accepted',mode:'callback'}),/callback/);
 assert.match(requestGuidance({status:'accepted',kind:'ambulance'}),/does not track dispatch/);
 assert.match(requestGuidance({status:'pending'}),/not confirmed/);
 assert.notEqual(requestGuidance({status:'expired'},'te'),requestGuidance({status:'expired'},'en'));
});
test('changing request date preserves private form fields in memory and requires a new slot selection',async()=>{
 const {element,click,submit,app}=await boot();await click('go',{s:'careCatalog'});await settle();await click('careSelect',{id:'service-1'});
 element('careAddress').value='House 42 <gate>';element('careDetails').value='Please call at gate';element('careVillage').value='town';element('careMode').value='callback';element('careDate').value='2030-01-02';
 await submit('careDate');const html=element('app').innerHTML;
 assert.match(html,/House 42 &lt;gate&gt;/);assert.match(html,/Please call at gate/);assert.match(html,/value="callback" selected/);assert.match(html,/Choose a time/);
 app.destroy();
});
test('patient discovery filters have a recoverable empty state and clear action',async()=>{
 const {element,click,submit,app}=await boot();await click('go',{s:'careCatalog'});await settle();element('careSearch').value='does-not-exist';await submit('careFilter');assert.match(element('app').innerHTML,/0 matching services/);assert.match(element('app').innerHTML,/No matching approved/);await click('careClearFilters');assert.match(element('app').innerHTML,/<h2>Home visit<\/h2>/);app.destroy();
});
