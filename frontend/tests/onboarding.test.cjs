const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {moduleLoader}=require('./helpers/module-loader.cjs');
const catalog=require('../../backend/src/main/resources/reference-catalog.json');
test('service wizard preserves coverage and fees between steps and escapes patient previews',async()=>{
 const dom=new JSDOM('<main id="app"></main>');
 const load=moduleLoader(vm.createContext({document:dom.window.document,window:dom.window,console}));
 (await load('services/reference-catalog.js')).applyReferenceData(catalog);
 const {applyLang}=await load('i18n/index.js');applyLang('en');
 const {ServiceEditor,serviceInput,updateServicePreview,showServiceStep}=await load('features/care/service-editor.js');
 const document=dom.window.document;
 document.getElementById('app').innerHTML=ServiceEditor({business:{providerId:'our-clinic',businessType:'clinic',organization:'Our clinic'},practitioners:[{id:'doctor-1',providerId:'our-clinic',name:'Dr. Ada',active:true}],s:{kind:'home_visit',title:'Home consultation',titleTe:'Home care',description:'<img src=x onerror=alert(1)>',fee:300,travelFee:50,resource:'doctor',timeWindow:{start:'09:00',end:'10:00'},slots:['09:00','09:30'],coverage:['town'],availableDays:[1,3,5]}});
 updateServicePreview();assert.match(document.getElementById('servicePatientPreview').textContent,/350/);assert.equal(document.querySelector('#servicePatientPreview img'),null);
 showServiceStep(1);assert.equal(document.querySelector('[data-service-step="0"]').hidden,false);assert.equal(document.querySelector('[data-service-step="1"]').hidden,false);
 document.getElementById('careFee').value='425';showServiceStep(2);assert.equal(serviceInput().fee,425);assert.equal(serviceInput().slots.join(','),'09:00,09:30');assert.equal(serviceInput().practitionerId,'doctor-1');assert.equal(serviceInput().coverage.join(','),'town');assert.equal(serviceInput().availableDays.join(','),'1,3,5');assert.match(document.getElementById('serviceReviewSummary').textContent,/475/);
 showServiceStep(0);assert.equal(document.getElementById('careTitle').value,'Home consultation');assert.equal(document.getElementById('careFee').value,'425');
 dom.window.close();
});
test('registration and onboarding routes render both languages without collecting business evidence at signup',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot();
 for(const language of ['en','te']){
  await f.click('go',{s:'lang'});await f.click('setLang',{id:language});await f.click('go',{s:'register'});
  assert.match(f.element('app').innerHTML,/regTerms/);assert.doesNotMatch(f.element('app').innerHTML,/regDocuments|regOrganization|regUsername|\?{3}/);
 }
 await f.click('chooseRole',{role:'provider'});f.element('loginUsername').value='provider';f.element('loginPassword').value='Provider-password-123!';await f.submit('login');
 for(const screen of ['businessProfile','providerNotifications','providerAvailability']){await f.click('go',{s:screen});await new Promise(r=>setTimeout(r,10));assert.equal(f.element('app').dataset.screen,screen);assert.doesNotMatch(f.element('app').innerHTML,/undefined|\?{3}/);}
 f.app.destroy();
});

test('time windows generate full-duration slots and legacy schedules remain unchanged',async()=>{
 const dom=new JSDOM('<main id="app"></main>');
 const load=moduleLoader(vm.createContext({document:dom.window.document,window:dom.window,console}));
 (await load('services/reference-catalog.js')).applyReferenceData(catalog);
 (await load('i18n/index.js')).applyLang('en');
 const {ServiceEditor,serviceInput,windowSlots,updateServicePreview,validateServiceEditor}=await load('features/care/service-editor.js');
 assert.equal(windowSlots('09:00','10:00',30).join(','),'09:00,09:30');
 assert.equal(windowSlots('09:00','10:00',45).join(','),'09:00');
 for(const [start,end,duration] of [['18:00','09:00',30],['09:00','09:15',30],['25:00','26:00',30],['09:00','10:00',0]])assert.equal(windowSlots(start,end,duration).length,0);
 const document=dom.window.document;
 document.getElementById('app').innerHTML=ServiceEditor({business:{providerId:'clinic-1',organization:'Clinic',businessType:'clinic'},practitioners:[{id:'mine',providerId:'clinic-1',name:'Own provider',active:true},{id:'other',providerId:'clinic-2',name:'Other provider',active:true}],s:{id:'existing',kind:'home_visit',title:'Existing visit',description:'Home consultation',slots:['09:10','11:25'],coverage:['town'],availableDays:[1],practitionerId:'mine'}});
 updateServicePreview();assert.equal(serviceInput().timeWindow,null);assert.equal(serviceInput().slots.join(','),'09:10,11:25');assert.equal(document.querySelector('option[value="other"]').disabled,true);assert.equal(validateServiceEditor(),true);
 document.querySelector('input[name="careCoverage"]').checked=false;
 for(const el of document.querySelectorAll('input[name="careCoverage"]'))el.checked=false;
 assert.equal(validateServiceEditor(),false);assert.match(document.getElementById('serviceEditorError').textContent,/1 and 5/);
 dom.window.close();
});

test('temporary-password login is restricted to password change until completion',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot({mustChangePassword:true});
 await f.click('chooseRole',{role:'provider'});f.element('loginUsername').value='provider';f.element('loginPassword').value='Temporary-password-123!';await f.submit('login');
 assert.equal(f.element('app').dataset.screen,'initialPassword');assert.match(f.element('app').innerHTML,/initialCurrent/);
 for(const screen of ['careDashboard','careManage','businessProfile','account','roles']){await f.click('go',{s:screen});assert.equal(f.element('app').dataset.screen,'initialPassword');}
 assert.equal(f.calls.filter(c=>c.path==='/care/services').length,0);
 f.element('initialCurrent').value='Temporary-password-123!';f.element('initialNew').value='My-new-password-123!';f.element('initialConfirm').value='Mismatch';await f.submit('changeInitialPassword');assert.equal(f.calls.filter(c=>c.path==='/auth/change-initial-password').length,0);
 f.element('initialConfirm').value='My-new-password-123!';await f.submit('changeInitialPassword');assert.equal(f.element('app').dataset.screen,'login');
 f.element('loginUsername').value='provider';f.element('loginPassword').value='My-new-password-123!';await f.submit('login');assert.equal(f.element('app').dataset.screen,'careDashboard');f.app.destroy();
});
test('registration shows pending approval and submitted username in both languages',async()=>{
 const {boot}=require('./helpers/api-fixture.cjs');const f=await boot();
 await f.click('go',{s:'register'});f.element('regName').value='New Provider';f.element('regEmail').value='new@example.test';f.element('regPhone').value='9876543210';f.element('regTerms').checked=true;await f.submit('reviewRegistration');
 assert.equal(f.element('app').dataset.screen,'applicationSubmitted');assert.match(f.element('app').innerHTML,/Pending Approval/);assert.match(f.element('app').innerHTML,/new-provider/);assert.doesNotMatch(f.element('app').innerHTML,/verify your email/i);
 await f.click('toggleLanguage');assert.doesNotMatch(f.element('app').innerHTML,/undefined|\?{3}/);f.app.destroy();
});

test('pending provider approvals show contact details and review actions only for pending applicants',async()=>{
 const vm=require('node:vm');const {moduleLoader}=require('./helpers/module-loader.cjs');
 const load=moduleLoader(vm.createContext({document:{documentElement:{}}}));(await load('i18n/index.js')).applyLang('en');
 const {createAdminPages}=await load('pages/admin/workspace.js');
 const pages=createAdminPages({S:{providerTab:'pending',applications:[{id:'pending-1',name:'Pending Provider',username:'pending-provider',email:'pending@example.test',phone:'9876543210',submittedAt:1,status:'pending'},{id:'approved-1',name:'Approved Provider',username:'approved-provider',email:'approved@example.test',status:'approved'}]},page:(title,body)=>title+body,filter:{query:''}});
 const html=pages.adminApplications().html;assert.match(html,/Pending Provider Approvals/);assert.match(html,/pending@example.test/);assert.match(html,/9876543210/);assert.match(html,/data-decision="approved"/);assert.match(html,/data-decision="rejected"/);assert.doesNotMatch(html,/approved@example.test/);
});
