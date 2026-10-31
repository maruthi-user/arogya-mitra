const {test}=require('node:test');
const assert=require('node:assert/strict');
const {boot}=require('./helpers/api-fixture.cjs');
test('landing exposes patient/provider/admin and uses the supplied logo',async()=>{
  const {element}=await boot();const html=element('app').innerHTML;
  for(const role of ['patient','provider','admin'])assert.match(html,new RegExp('data-role="'+role+'"'));
  assert.match(html,/arogya-mitra-logo.png/);assert.doesNotMatch(html,/demo-patient|sample provider/i);
});
test('patient continues without login and books through APIs with a CSRF token',async()=>{
  const {element,click,calls,app}=await boot();await click('chooseRole',{role:'patient'});
  assert.equal(element('app').dataset.screen,'home');assert.equal(app.state.settings.patientId,'patient-1');
  await click('book',{id:'provider-1'});await click('day',{d:'1'});await click('slot',{t:'10:00'});
  element('bookingPatientName').value='Patient name';element('bookingPatientPhone').value='9876543210';element('bookingReason').value='Consultation';
  await click('confirm');assert.equal(element('app').dataset.screen,'confirmed');
  const bookingCall=calls.find(c=>c.path==='/bookings'&&c.method==='POST');assert.ok(bookingCall);assert.equal(bookingCall.headers['X-CSRF-TOKEN'],'test-token');assert.equal(bookingCall.credentials,'include');
  await click('go',{s:'bookings'});assert.match(element('app').innerHTML,/Awaiting confirmation/);
});
test('provider and admin get separate login pages and API-backed workspaces',async()=>{
  const {element,click,submit,calls}=await boot();await click('chooseRole',{role:'provider'});
  assert.match(element('app').innerHTML,/auth-brand-panel/);assert.equal(element('app').dataset.screen,'login');
  element('loginUsername').value='provider';element('loginPassword').value='Provider-password-123!';await submit('login');assert.equal(element('app').dataset.screen,'dash');
  for(const screen of ['providerBookings','schedule','providerProfile']){await click('go',{s:screen});assert.equal(element('app').dataset.screen,screen);}
  await click('logout');await click('chooseRole',{role:'admin'});element('loginUsername').value='admin';element('loginPassword').value='Admin-password-123!';await submit('login');
  assert.equal(element('app').dataset.screen,'adminHome');assert.ok(calls.some(c=>c.path==='/admin/applications'));
  for(const screen of ['adminApplications','adminNotifications','adminPharmacies','adminRequests','adminAudit']){await click('go',{s:screen});assert.equal(element('app').dataset.screen,screen);}
});
test('unauthenticated navigation cannot open a provider dashboard',async()=>{
  const {element,click}=await boot();await click('go',{s:'dash'});assert.equal(element('app').dataset.screen,'login');
  await click('go',{s:'adminHome'});assert.equal(element('app').dataset.screen,'login');
});
test('offline landing remains usable and supports retry without demo fallback',async()=>{
  const {element,click,setOnline}=await boot({offline:true});assert.equal(element('app').dataset.screen,'roles');assert.match(element('app').innerHTML,/Retry connection/);
  setOnline();await click('retry');assert.doesNotMatch(element('app').innerHTML,/Retry connection/);
});
test('patient pages render in Telugu and English and retain voice text fallback',async()=>{
  const {element,click}=await boot();await click('chooseRole',{role:'patient'});
  for(const language of ['te','en']){
    await click('go',{s:'lang'});await click('setLang',{id:language});
    for(const screen of ['home','providers','meds','settings','bookings','command','emergency']){
      await click('go',{s:screen});assert.equal(element('app').dataset.screen,screen);assert.doesNotMatch(element('app').innerHTML,/undefined|\?{3}/);
    }
  }
  await click('mic');element('commandInput').value='fever';await click('submitCommand');assert.equal(element('app').dataset.screen,'providers');
});
test('registration and activation use real form actions without a profile picker',async()=>{
  const {element,click}=await boot();await click('go',{s:'register'});assert.match(element('app').innerHTML,/data-form-action="reviewRegistration"/);
  for(const field of ['regEmail','regPhone','regUsername','regOrganization','regDesignation','regRegistrationId'])assert.match(element('app').innerHTML,new RegExp('id="'+field+'"'));
  await click('go',{s:'activate'});assert.match(element('app').innerHTML,/activationPassword/);
});
