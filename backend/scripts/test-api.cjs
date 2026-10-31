const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
function client(base){
  let cookie='';
  async function call(method,path,body,expected=200){
    let csrf;
    if(method!=='GET')csrf=await call('GET','/auth/csrf');
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
    const cookies=response.headers.getSetCookie?response.headers.getSetCookie():[response.headers.get('set-cookie')].filter(Boolean);
    for(const value of cookies){const session=value.match(/JSESSIONID=([^;]*)/);if(session)cookie='JSESSIONID='+session[1];}
    const result=await response.json();assert.equal(response.status,expected,method+' '+path+': '+JSON.stringify(result));
    console.log('PASS '+response.status+' '+method+' '+path);return result;
  }
  return call;
}
async function smoke(base='http://127.0.0.1:9090/api',workflow=false){
  if(!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname))throw new Error('Use a local test backend.');
  const visitor=client(base);await visitor('GET','/auth/session');await visitor('GET','/providers');
  if(!workflow){console.log('Connection checks passed. Add --workflow and API_TEST_ADMIN_USERNAME / API_TEST_ADMIN_PASSWORD for the isolated write test.');return;}
  const username=process.env.API_TEST_ADMIN_USERNAME,password=process.env.API_TEST_ADMIN_PASSWORD;
  if(!username||!password)throw new Error('Configure API_TEST_ADMIN_USERNAME and API_TEST_ADMIN_PASSWORD for an isolated local database.');
  const mailpit=process.env.MAILPIT_URL||'http://127.0.0.1:8025';
  if(!['localhost','127.0.0.1','[::1]'].includes(new URL(mailpit).hostname))throw new Error('Use a local Mailpit inbox.');
  const suffix=randomUUID().slice(0,8),email='workflow-'+suffix+'@example.test',providerUsername='provider-'+suffix;
  const app=await visitor('POST','/auth/register',{name:'Integration test provider',username:providerUsername,email,phone:'9876543210',organization:'Integration test clinic',designation:'mbbs',village:'rama',registrationId:''},201);
  const admin=client(base);await admin('POST','/auth/login',{username,password,role:'admin'});
  const approved=await admin('POST','/admin/applications/'+app.id+'/review',{decision:'approved',reason:'Integration test approval. Set a password and configure your hours.'});
  let activation;
  for(let attempt=0;attempt<30;attempt++){
    const list=await (await fetch(mailpit+'/api/v1/search?query='+encodeURIComponent('to:'+email))).json();
    for(const message of list.messages||[]){const detail=await (await fetch(mailpit+'/api/v1/message/'+message.ID)).json();const match=(detail.Text||'').match(/#activate=([A-Za-z0-9_-]+)/);if(match){activation=match[1];break;}}
    if(activation)break;await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert.ok(activation,'Activation email was not delivered to Mailpit. Check SMTP configuration and the notification queue.');
  const providerPassword=randomUUID()+'-Provider!';await visitor('POST','/auth/activate',{token:activation,password:providerPassword});await visitor('POST','/auth/activate',{token:activation,password:providerPassword},400);
  const doctor=client(base);await doctor('POST','/auth/login',{username:providerUsername,password:providerPassword,role:'provider'});
  await doctor('PATCH','/providers/'+approved.providerId+'/profile',{slots:['10:00','11:00'],fee:200,services:'Integration consultation'});
  const patient=client(base),other=client(base);const identity=await patient('POST','/auth/guest',{language:'en'});await other('POST','/auth/guest',{language:'en'});
  await patient('PATCH','/patients/'+identity.subjectId,{name:'Integration patient',phone:'9876543210',village:'rama'});
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  const date=new Date(Date.UTC(+parts.year,+parts.month-1,+parts.day+1)).toISOString().slice(0,10);
  const input={pid:approved.providerId,date,time:'10:00',reason:'Integration workflow'};
  await patient('GET','/providers/'+approved.providerId+'/slots?date='+date);
  const booking=await patient('POST','/bookings',input,201);await patient('POST','/bookings',input,409);await other('GET','/bookings/'+booking.id,undefined,403);
  assert.equal((await doctor('POST','/bookings/'+booking.id+'/accept',{})).status,'confirmed');
  await patient('POST','/bookings/'+booking.id+'/cancel',{});
  const repeat=await patient('POST','/bookings',input,201);await doctor('POST','/bookings/'+repeat.id+'/reject',{});
  const rejected=await visitor('POST','/auth/register',{name:'Rejected applicant',username:'rejected-'+suffix,email:'rejected-'+suffix+'@example.test',phone:'9876543210',organization:'Integration test',designation:'rmp',village:'rama',registrationId:''},201);
  await admin('POST','/admin/applications/'+rejected.id+'/review',{decision:'rejected',reason:'Integration rejection to verify the notification flow.'});
  let rejectionDelivered=false;
  for(let attempt=0;attempt<60;attempt++){
    const list=await (await fetch(mailpit+'/api/v1/search?query='+encodeURIComponent('to:rejected-'+suffix+'@example.test'))).json();
    for(const message of list.messages||[]){const detail=await (await fetch(mailpit+'/api/v1/message/'+message.ID)).json();if((detail.Text||'').includes('Integration rejection'))rejectionDelivered=true;}
    if(rejectionDelivered)break;await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(rejectionDelivered,'Rejection notification was not delivered to Mailpit.');
  await doctor('POST','/auth/logout',{});await doctor('GET','/providers/'+approved.providerId+'/bookings',undefined,401);
  console.log('Live workflow passed, including real SMTP delivery to local Mailpit. Test records remain in this isolated database.');
}
module.exports={smoke};
if(require.main===module)smoke(process.argv.find(a=>a.startsWith('http'))||undefined,process.argv.includes('--workflow')).catch(error=>{console.error(error.message);process.exitCode=1;});
