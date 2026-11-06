import { legacyText } from '../../i18n/legacy.js';
import { AuthLayout } from '../../layouts/auth-layout.js';
import { Input } from '../../components/forms/field.js';
import { Button } from '../../components/ui/button.js';
import {patientLogin} from './patient.js';
export function createLoginPage(){return (params={})=>{
  if(params.role==='patient')return patientLogin();
  const role=params.role==='admin'?'admin':'provider';
  return {voice:null,html:AuthLayout({role,title:legacyText('welcome_back_993033'),description:role==='admin'?legacyText('sign_in_to_manage_applications_and_platform_operat_e12c04'):legacyText('sign_in_to_your_practice_your_patients_and_schedul_d2561b'),body:`<form data-form-action="login" data-role="${role}" class="auth-form">
    ${Input({id:'loginUsername',label:role==='provider'?legacyText('email_address_a07784'):legacyText('username_or_email_20f020'),attrs:{required:true,autocomplete:'username',maxlength:100}})}
    ${Input({id:'loginPassword',type:'password',label:legacyText('password_635af0'),attrs:{required:true,autocomplete:'current-password',maxlength:72}})}
    ${role==='provider'?`<button class="text-button forgot-link" type="button" data-a="go" data-s="requestSetup">${legacyText('forgot_password_or_need_an_activation_link_2312ad')}</button>`:''}
    ${Button({label:legacyText('sign_in_4328bd'),variant:'accent',attrs:{type:'submit'}})}</form>
    ${role==='provider'?`<div class="auth-divider"><span>New to Arogya Mitra?</span></div><button class="btn ghost" data-a="go" data-s="register">${legacyText('apply_as_a_healthcare_provider_26ef43')}</button>`:'<p class="auth-hint">Administrator accounts are provisioned by the application owner. Public admin registration is disabled.</p>'}`})};
};}
