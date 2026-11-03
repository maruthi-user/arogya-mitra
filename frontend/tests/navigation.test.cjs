const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {moduleLoader}=require('./helpers/module-loader.cjs');
const {boot}=require('./helpers/api-fixture.cjs');
const loadPolicy=()=>moduleLoader(vm.createContext({URLSearchParams}))('app/access-policy.js');
test('role routes reject cross-role and nonclinical practitioner screens',async()=>{
 const {resolveScreen}=await loadPolicy();
 for(const role of ['patient','provider','admin']){
  assert.equal(resolveScreen('careHistory',{role}).screen,'careHistory');
  assert.equal(resolveScreen('emergency',{role}).screen,'emergency');
 }
 for(const screen of ['adminHome','adminApplications','careOrgs'])assert.equal(resolveScreen(screen,{role:'patient'}).screen,'accessDenied');
 assert.equal(resolveScreen('careRequest',{role:'provider'}).screen,'accessDenied');
 assert.equal(resolveScreen('account',{role:'patient'}).screen,'accessDenied');
 assert.equal(resolveScreen('adminAudit',{role:'anonymous'}).params.role,'admin');
 for(const business of ['pharmacy','laboratory','ambulance'])for(const screen of ['dash','schedule','providerBookings'])assert.equal(resolveScreen(screen,{role:'provider'},business).screen,'careManage');
 assert.equal(resolveScreen('account',{role:'provider'},'pharmacy').screen,'account');
 assert.equal(resolveScreen('unknown',{role:'admin'}).screen,'notFound');
});
test('account and role-specific login deep links round-trip without exposing form details',async()=>{
 const {parseRoute,routePath}=await loadPolicy();
 assert.equal(parseRoute('/app/account').screen,'account');
 assert.equal(parseRoute('/auth/login','?role=admin').params.role,'admin');
 assert.equal(parseRoute('/app/login','?role=admin').params.role,'admin');
 assert.equal(parseRoute('/missing').screen,'notFound');
 assert.equal(routePath('login',{role:'admin',password:'do-not-expose'}),'/auth/login?role=admin');
 const url=routePath('providerDetail',{id:'provider 1',phone:'private',reason:'private'});
 assert.match(url,/id=provider\+1/);assert.doesNotMatch(url,/private|phone|reason/);
 assert.equal(parseRoute(url).params.id,'provider 1');
 assert.equal(routePath('__proto__'),'/app/__proto__');
});
test('access denial keeps the patient session and expiry clears private cached records',async()=>{
 const {app,click,element}=await boot();await click('chooseRole',{role:'patient'});
 await click('go',{s:'adminHome'});assert.equal(element('app').dataset.screen,'accessDenied');assert.equal(app.state.session.role,'patient');
 app.state.bookings=[{id:'private-booking'}];app.state.documentPanel={html:'private'};
 app.expireSession();assert.equal(app.state.session.role,'anonymous');assert.equal(app.state.bookings.length,0);assert.equal(app.state.documentPanel,null);assert.equal(element('app').dataset.screen,'roles');app.destroy();
});
