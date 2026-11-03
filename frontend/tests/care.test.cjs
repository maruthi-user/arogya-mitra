const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./helpers/api-fixture.cjs');
const settle=()=>new Promise(resolve=>setTimeout(resolve,5));

test('public service discovery starts without registration and creates a pending guest request',async()=>{
  const {element,click,submit,calls}=await boot();
  await click('go',{s:'careCatalog'});await settle();
  assert.match(element('app').innerHTML,/Home visit/);
  assert.ok(!calls.some(c=>c.path==='/auth/guest'));
  await click('careSelect',{id:'service-1'});
  assert.ok(calls.some(c=>c.path==='/auth/guest'));
  assert.equal(element('app').dataset.screen,'careRequest');
  element('careDate').value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());element('careTime').value='10:00';element('careVillage').value='rama';element('careMode').value='visit';element('careAddress').value='House 5';element('careDetails').value='Home visit requested';
  await submit('careSubmit');
  assert.equal(element('app').dataset.screen,'careHistory');
  assert.match(element('app').innerHTML,/Awaiting acceptance/);
  const request=calls.find(c=>c.path==='/care/requests'&&c.method==='POST');
  assert.equal(request.headers['X-CSRF-TOKEN'],'test-token');assert.equal(request.body.serviceId,'service-1');
});

test('provider workspace is business-specific and admin cannot accept service requests',async()=>{
  const {element,click,submit}=await boot();
  await click('chooseRole',{role:'provider'});element('loginUsername').value='provider';element('loginPassword').value='Provider-password-123!';await submit('login');
  await click('go',{s:'careManage'});await settle();
  assert.doesNotMatch(element('app').innerHTML,/id="careCapacity"/);await click('careAdd');assert.match(element('app').innerHTML,/careCapacity|careResource/);
  assert.doesNotMatch(element('app').innerHTML,/value="delivery"/);
  await click('logout');await click('chooseRole',{role:'admin'});element('loginUsername').value='admin';element('loginPassword').value='Admin-password-123!';await submit('login');
  await click('go',{s:'careManage'});await settle();assert.doesNotMatch(element('app').innerHTML,/data-a="careReview"/);
  await click('go',{s:'careHistory'});assert.doesNotMatch(element('app').innerHTML,/data-status="accepted"/);
});

test('new service screens render both languages and guard organisation management',async()=>{
  const {element,click}=await boot();await click('chooseRole',{role:'patient'});
  for(const language of ['te','en']){
    await click('go',{s:'lang'});await click('setLang',{id:language});
    for(const screen of ['careCatalog','careHistory']){await click('go',{s:screen});await settle();assert.doesNotMatch(element('app').innerHTML,/undefined|\?{3}/);}
  }
  await click('go',{s:'careOrgs'});assert.equal(element('app').dataset.screen,'accessDenied');
});

test('changing provider organisation discards the previous service workspace cache',async()=>{
  const {element,click,submit}=await boot();
  await click('chooseRole',{role:'provider'});element('loginUsername').value='provider';element('loginPassword').value='Provider-password-123!';await submit('login');
  await click('go',{s:'careManage'});await settle();assert.match(element('app').innerHTML,/Home visit/);
  await click('logout');await click('chooseRole',{role:'provider'});element('loginUsername').value='other-provider';element('loginPassword').value='Provider-password-123!';await submit('login');
  await click('go',{s:'careManage'});await settle();assert.match(element('app').innerHTML,/No matching services/);assert.doesNotMatch(element('app').innerHTML,/<h2>Home visit<\/h2>/);
});

test('location and medicine labels come from the backend catalog rather than embedded JavaScript',async()=>{
  const data=structuredClone(require('../../backend/src/main/resources/reference-catalog.json'));
  data.villages.push({id:'server-town',en:'Server-managed Town',te:'Server-managed Town'});
  data.medicines.push({id:'server-medicine',en:'Server-managed Medicine',te:'Server-managed Medicine',icon:'+',kw:['server medicine'],rx:false});
  const {element,click,calls}=await boot({referenceData:data});
  await click('go',{s:'register'});assert.doesNotMatch(element('app').innerHTML,/id="regVillage"/);
  await click('chooseRole',{role:'patient'});await click('go',{s:'meds'});assert.match(element('app').innerHTML,/Server-managed Medicine/);
  assert.ok(calls.some(c=>c.path==='/reference-data'));
});

test('logging out and back into the same organisation reloads its service workspace',async()=>{
 const {element,click,submit,calls,app}=await boot();
 async function login(){await click('chooseRole',{role:'provider'});element('loginUsername').value='provider';element('loginPassword').value='Provider-password-123!';await submit('login');}
 await login();await click('go',{s:'careManage'});await settle();const before=calls.filter(c=>c.path==='/care/services').length;
 await click('logout');await login();await click('go',{s:'careManage'});await settle();assert.ok(calls.filter(c=>c.path==='/care/services').length>before);app.destroy();
});

 test('service workspace opens form on demand, filters approval tabs and isolates dashboard routes',async()=>{
 const {element,click,submit,app}=await boot();await click('chooseRole',{role:'provider'});element('loginUsername').value='provider';element('loginPassword').value='Provider-password-123!';await submit('login');await click('go',{s:'careManage'});await settle();assert.match(element('app').innerHTML,/<table/);assert.doesNotMatch(element('app').innerHTML,/id="careTitle"/);await click('careAdd');assert.match(element('app').innerHTML,/id="careTitle"/);await click('careClose');assert.doesNotMatch(element('app').innerHTML,/id="careTitle"/);await click('careTab',{id:'rejected'});assert.match(element('app').innerHTML,/No matching services/);await click('go',{s:'careDashboard'});await settle();assert.match(element('app').innerHTML,/Only approved, active businesses and services/);app.destroy();
 });
