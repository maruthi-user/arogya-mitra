import {DataTable} from '../../components/data-display/table.js';
import {patientRegistration} from '../../pages/auth/patient.js';
import {registrationReceipt,initialPasswordScreen} from '../../pages/auth/approval-screens.js';
import { DataService } from '../../services/data-service.js';
import { ReviewDialog } from '../../components/feedback/review-dialog.js';
import { createLoginPage } from '../../pages/auth/login.js';
import { createRegistrationPage } from '../../pages/auth/register.js';
import { createActivationPage,createRequestSetupPage } from '../../pages/auth/activation.js';
import { createAdminPages } from '../../pages/admin/workspace.js';
import { LANG, lbl } from '../../i18n/index.js';
import { MEDICINES } from '../../services/reference-catalog.js';
import { AuthLayout } from '../../layouts/auth-layout.js';
import { escapeHtml } from '../../utils/html.js';

export function createAccountWorkflows({S,page,go,resetTo,refresh,render,toast,applySession}){
  const value=id=>document.getElementById(id).value.trim();
  const filter={query:''};
  const screens={login:createLoginPage(),register:createRegistrationPage(),activate:createActivationPage(),requestSetup:createRequestSetupPage(),...createAdminPages({S,page,filter})};
  screens.medicineRequests=()=>({voice:null,html:page(LANG==='te'?'మీ మందుల విచారణలు':'Your medicine inquiries',DataTable({id:'patient-medicine-inquiries',caption:LANG==='te'?'మందుల విచారణలు':'Medicine inquiries',rows:S.medicineRequests,columns:[{key:'pharmacyName',label:LANG==='te'?'ఫార్మసీ':'Pharmacy'},{key:'medicineId',label:LANG==='te'?'మందు':'Medicine',searchValue:r=>lbl(MEDICINES.find(m=>m.id===r.medicineId)||{en:r.medicineId,te:r.medicineId}),render:r=>escapeHtml(lbl(MEDICINES.find(m=>m.id===r.medicineId)||{en:r.medicineId,te:r.medicineId}))},{key:'status',label:LANG==='te'?'స్థితి':'Status'},{key:'message',label:LANG==='te'?'వివరాలు':'Details'},{key:'id',label:LANG==='te'?'సూచన':'Reference'}]}))});
  screens.applicationSubmitted=()=>registrationReceipt(S);
  screens.patientRegister=patientRegistration;
  screens.initialPassword=initialPasswordScreen;
  const actions={
    chooseRole:async d=>{
      if(!['patient','provider','admin'].includes(d.role))return;
      if(S.session.role===d.role){S.settings.role=d.role;await refresh();resetTo(d.role==='patient'?'home':'careDashboard');}
      else go('login',{role:d.role});
    },
    login:async()=>{
      const role=document.querySelector('[data-form-action="login"]').dataset.role;
      applySession(await DataService.login({username:value('loginUsername'),password:document.getElementById('loginPassword').value,role}));
      await refresh();resetTo(role==='patient'?'home':'careDashboard');
    },
    logout:async()=>{await DataService.logout();applySession({role:'anonymous'});await refresh();resetTo('roles');},
    registerPatient:async()=>{await DataService.registerPatient({phone:value('patientPhone'),name:value('patientName'),village:value('patientVillage'),password:document.getElementById('patientPassword').value,confirmPassword:document.getElementById('patientConfirm').value,language:LANG});go('login',{role:'patient'});toast(LANG==='te'?'ఖాతా సృష్టించబడింది. ప్రవేశించండి.':'Account created. Sign in with your mobile number.');},
    reviewRegistration:async()=>{
      if(!document.getElementById('regTerms')?.checked)throw new Error(LANG==='te'?'నిబంధనలు మరియు గోప్యతా విధానం అంగీకరించండి.':'Accept the Terms and Privacy Policy.');
      const input={name:value('regName'),email:value('regEmail'),phone:value('regPhone'),termsAccepted:true};
      const response=await DataService.register(input);S.applicationReceipt={id:response.id,email:input.email,username:response.username};resetTo('applicationSubmitted');
    },
    changeInitialPassword:async()=>{
      const currentPassword=document.getElementById('initialCurrent').value,newPassword=document.getElementById('initialNew').value;
      if(newPassword!==document.getElementById('initialConfirm').value)throw new Error(LANG==='te'?'పాస్‌వర్డ్‌లు సరిపోలలేదు.':'The passwords do not match.');
      await DataService.changeInitialPassword({currentPassword,newPassword});applySession({role:'anonymous'});await refresh();resetTo('login',{role:'provider'});toast(LANG==='te'?'కొత్త పాస్‌వర్డ్‌తో ప్రవేశించండి.':'Password changed. Sign in with your new password.');
    },
    activateAccount:async()=>{
      const password=document.getElementById('activationPassword').value;
      if(password!==document.getElementById('activationConfirm').value)throw new Error('The passwords do not match.');
      if(!S.activationToken)throw new Error('Open the password setup link from your email.');
      await DataService.activate({token:S.activationToken,password});S.activationToken=null;resetTo('roles');go('login',{role:'provider'});toast('Password saved. You can now sign in.');
    },
    requestSetup:async()=>{const result=await DataService.requestSetup(value('setupEmail'));toast(result.message);},
    filterAdmin:()=>{filter.query=value('adminSearch');render(false);},
    reviewApplication:async d=>{
      const app=S.applications.find(a=>a.id===d.id);if(!app)throw new Error('Application not found. Refresh and retry.');
      const approved=d.decision==='approved';
      const review=await ReviewDialog({title:approved?'Approve provider application':'Reject provider application',details:{Name:app.name,Username:app.username,Email:app.email,Phone:app.phone,Organization:app.organization,Designation:app.designation,Location:app.village,'Registration ID':app.registrationId},confirmLabel:approved?'Approve & queue email':'Reject & queue email',cancelLabel:'Cancel',field:approved?undefined:{label:LANG==='te'?'తిరస్కరణ కారణం (తప్పనిసరి)':'Rejection reason (required)',placeholder:LANG==='te'?'కారణాన్ని వివరించండి.':'Explain why the registration is rejected.'}});
      if(!review)return;await DataService.review(d.id,{decision:d.decision,reason:review.reason});await refresh();render(false);toast('Decision saved. Notification queued.');
    },
    retryNotification:async d=>{await DataService.retryNotification(d.id);await refresh();render(false);toast('Email queued for retry.');},
    createPharmacy:async()=>{await DataService.createPharmacy({name:value('pharmacyName'),phone:value('pharmacyPhone'),village:value('pharmacyVillage')});await refresh();render(false);toast('Pharmacy added.');},
    adminStock:async d=>{await DataService.stock(d.id,d.med,d.available==='true');await refresh();render(false);},
    updateMedicineRequest:async d=>{await DataService.updateMedicineRequest(d.id,d.status);await refresh();render(false);},
    requestMedicine:async d=>{await DataService.requestMedicine({pharmacyId:d.id,medicineId:d.med,message:''});await refresh();toast('Inquiry saved and assigned to the selected pharmacy.');},
    savePatientProfile:async()=>{
      const profile=await DataService.patientProfile(S.settings.patientId,{name:value('nameInput')||'Guest',phone:value('patientPhone'),village:document.getElementById('patientVillage').value,language:LANG});
      S.settings.name=profile.name==='Guest'?'':profile.name;S.settings.village=profile.village;S.settings.phone=profile.phone;toast('Profile saved.');
    }
  };
  return {screens,actions};
}
