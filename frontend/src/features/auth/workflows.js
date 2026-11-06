import { legacyText } from '../../i18n/legacy.js';
import { LANG } from '../../i18n/index.js';
import {patientRegistration} from '../../pages/auth/patient.js';
import {registrationReceipt,initialPasswordScreen} from '../../pages/auth/approval-screens.js';
import { DataService } from '../../services/data-service.js';
import { createLoginPage } from '../../pages/auth/login.js';
import { createRegistrationPage } from '../../pages/auth/register.js';
import { createActivationPage,createRequestSetupPage } from '../../pages/auth/activation.js';
import { createAdminPages } from '../../pages/admin/workspace.js';
import { homeScreen } from '../../app/access-policy.js';

export function createAccountWorkflows({S,page,go,resetTo,refresh,render,toast,applySession}){
  const value=id=>document.getElementById(id).value.trim();
  const screens={login:createLoginPage(),register:createRegistrationPage(),activate:createActivationPage(),requestSetup:createRequestSetupPage(),...createAdminPages()};
  screens.applicationSubmitted=()=>registrationReceipt(S);
  screens.patientRegister=patientRegistration;
  screens.initialPassword=initialPasswordScreen;
  const actions={
    chooseRole:async d=>{
      if(!['patient','provider','admin','verifier'].includes(d.role))return;
      if(S.session.role===d.role){S.settings.role=d.role;await refresh();resetTo(homeScreen(d.role));}
      else go('login',{role:d.role});
    },
    login:async()=>{
      const role=document.querySelector('[data-form-action="login"]').dataset.role;
      applySession(await DataService.login({username:value('loginUsername'),password:document.getElementById('loginPassword').value,role}));
      await refresh();resetTo(homeScreen(role));
    },
    logout:async()=>{await DataService.logout();applySession({role:'anonymous'});await refresh();resetTo('roles');},
    registerPatient:async()=>{await DataService.registerPatient({phone:value('patientPhone'),name:value('patientName'),village:value('patientVillage'),password:document.getElementById('patientPassword').value,confirmPassword:document.getElementById('patientConfirm').value,language:LANG});go('login',{role:'patient'});toast(legacyText('account_created_sign_in_with_your_mobile_number_87aecb'));},
    reviewRegistration:async()=>{
      if(!document.getElementById('regTerms')?.checked)throw new Error(legacyText('accept_the_terms_and_privacy_policy_858559'));
      const input={name:value('regName'),email:value('regEmail'),phone:value('regPhone'),termsAccepted:true};
      const response=await DataService.register(input);S.applicationReceipt={id:response.id,email:input.email,username:response.username};resetTo('applicationSubmitted');
    },
    changeInitialPassword:async()=>{
      const currentPassword=document.getElementById('initialCurrent').value,newPassword=document.getElementById('initialNew').value;
      if(newPassword!==document.getElementById('initialConfirm').value)throw new Error(legacyText('the_passwords_do_not_match_466cf0'));
      await DataService.changeInitialPassword({currentPassword,newPassword});applySession({role:'anonymous'});await refresh();resetTo('login',{role:'provider'});toast(legacyText('password_changed_sign_in_with_your_new_password_952461'));
    },
    activateAccount:async()=>{
      const password=document.getElementById('activationPassword').value;
      if(password!==document.getElementById('activationConfirm').value)throw new Error('The passwords do not match.');
      if(!S.activationToken)throw new Error('Open the password setup link from your email.');
      await DataService.activate({token:S.activationToken,password});S.activationToken=null;resetTo('roles');go('login',{role:'provider'});toast('Password saved. You can now sign in.');
    },
    requestSetup:async()=>{const result=await DataService.requestSetup(value('setupEmail'));toast(result.message);},

  };
  return {screens,actions};
}
