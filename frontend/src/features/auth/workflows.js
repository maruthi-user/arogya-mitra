import { DataService } from '../../services/data-service.js';
import { ReviewDialog } from '../../components/feedback/review-dialog.js';
import { createLoginPage } from '../../pages/auth/login.js';
import { createRegistrationPage } from '../../pages/auth/register.js';
import { createActivationPage,createRequestSetupPage } from '../../pages/auth/activation.js';
import { createAdminPages } from '../../pages/admin/workspace.js';
import { LANG, lbl } from '../../i18n/index.js';
import { MEDICINES } from '../../data/reference-data.js';
import { AuthLayout } from '../../layouts/auth-layout.js';
import { escapeHtml } from '../../utils/html.js';

export function createAccountWorkflows({S,page,go,resetTo,refresh,render,toast,applySession}){
  const value=id=>document.getElementById(id).value.trim();
  const filter={query:''};
  const screens={login:createLoginPage(),register:createRegistrationPage(),activate:createActivationPage(),requestSetup:createRequestSetupPage(),...createAdminPages({S,page,filter})};
  screens.medicineRequests=()=>({voice:null,html:page(LANG==='te'?'మీ మందుల విచారణలు':'Your medicine inquiries',S.medicineRequests.length?`<div class="record-grid">${S.medicineRequests.map(request=>`<article class="card"><div class="card-head"><strong>${escapeHtml(request.pharmacyName)}</strong><span class="status-badge">${escapeHtml(request.status)}</span></div><p>${escapeHtml(lbl(MEDICINES.find(m=>m.id===request.medicineId)||{en:request.medicineId,te:request.medicineId}))}</p><p class="fine">${escapeHtml(request.id)}</p></article>`).join('')}</div>`:`<p class="empty-state">${LANG==='te'?'ఇంకా విచారణలు లేవు.':'You have not sent any medicine inquiries yet.'}</p>`)});
  screens.applicationSubmitted=()=>({voice:null,html:AuthLayout({title:'Application received',description:'Your provider application is under review. An acknowledgment email has been queued.',body:`<div class="panel"><span class="status-badge pending">Awaiting review</span><h3 style="margin-top:18px">Keep your reference number</h3><p class="reference-number">${escapeHtml(S.applicationReceipt?.id||'Check your acknowledgment email')}</p><p class="muted">We’ll notify ${escapeHtml(S.applicationReceipt?.email||'your registered email')} when a decision is made. Approved applicants receive a one-use password setup link.</p></div><button class="btn accent" style="margin-top:22px" data-a="chooseRole" data-role="provider">Return to provider login</button>`})});
  const actions={
    chooseRole:async d=>{
      if(d.role==='patient'){applySession(await DataService.guest(LANG));await refresh();resetTo('home');return;}
      if(!['provider','admin'].includes(d.role))return;
      if(S.session.role===d.role){S.settings.role=d.role;await refresh();resetTo(d.role==='admin'?'adminHome':'dash');}
      else go('login',{role:d.role});
    },
    login:async()=>{
      const role=document.querySelector('[data-form-action="login"]').dataset.role;
      applySession(await DataService.login({username:value('loginUsername'),password:document.getElementById('loginPassword').value,role}));
      await refresh();resetTo(role==='admin'?'adminHome':'dash');
    },
    logout:async()=>{await DataService.logout();applySession({role:'anonymous'});await refresh();resetTo('roles');},
    reviewRegistration:async()=>{
      const input={name:value('regName'),username:value('regUsername'),email:value('regEmail'),phone:value('regPhone'),organization:value('regOrganization'),designation:value('regDesignation'),village:value('regVillage'),registrationId:value('regRegistrationId')};
      const confirmed=await ReviewDialog({title:'Review your application',details:{Name:input.name,Username:input.username,Email:input.email,Phone:input.phone,Organization:input.organization,Designation:input.designation,Location:input.village,'Registration ID':input.registrationId},confirmLabel:'Submit application',cancelLabel:'Edit details'});
      if(!confirmed)return;
      const response=await DataService.register(input);S.applicationReceipt={id:response.id,email:input.email};resetTo('applicationSubmitted');
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
      const review=await ReviewDialog({title:approved?'Approve provider application':'Reject provider application',details:{Name:app.name,Username:app.username,Email:app.email,Phone:app.phone,Organization:app.organization,Designation:app.designation,Location:app.village,'Registration ID':app.registrationId},confirmLabel:approved?'Approve & queue email':'Reject & queue email',cancelLabel:'Cancel',field:{label:approved?'Activation instructions (required)':'Rejection reason (required)',placeholder:approved?'Welcome instructions for setting a password and completing the profile.':'Explain what needs to be corrected.'}});
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
