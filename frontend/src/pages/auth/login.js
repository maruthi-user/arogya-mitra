import { AuthLayout } from '../../layouts/auth-layout.js';
import { Input } from '../../components/forms/field.js';
import { Button } from '../../components/ui/button.js';
import { LANG } from '../../i18n/index.js';
export function createLoginPage(){return (params={})=>{
  const role=params.role==='admin'?'admin':'provider',l=(te,en)=>LANG==='te'?te:en;
  return {voice:null,html:AuthLayout({role,title:l('తిరిగి స్వాగతం','Welcome back'),description:role==='admin'?l('నిర్వహణ కోసం సురక్షితంగా లాగిన్ అవ్వండి.','Sign in to manage applications and platform operations.'):l('మీ ప్రాక్టీస్‌ను నిర్వహించడానికి లాగిన్ అవ్వండి.','Sign in to your practice. Your patients and schedule, together.'),body:`<form data-form-action="login" data-role="${role}" class="auth-form">
    ${Input({id:'loginUsername',label:l('యూజర్‌నేమ్ లేదా ఇమెయిల్','Username or email'),attrs:{required:true,autocomplete:'username',maxlength:100}})}
    ${Input({id:'loginPassword',type:'password',label:l('పాస్‌వర్డ్','Password'),attrs:{required:true,autocomplete:'current-password',maxlength:72}})}
    ${role==='provider'?`<button class="text-button forgot-link" type="button" data-a="go" data-s="requestSetup">${l('పాస్‌వర్డ్ మర్చిపోయారా?','Forgot password or need an activation link?')}</button>`:''}
    ${Button({label:l('లాగిన్','Sign in'),variant:'accent',attrs:{type:'submit'}})}</form>
    ${role==='provider'?`<div class="auth-divider"><span>New to Arogya Mitra?</span></div><button class="btn ghost" data-a="go" data-s="register">${l('ప్రొవైడర్‌గా నమోదు చేసుకోండి','Apply as a healthcare provider')}</button>`:'<p class="auth-hint">Administrator accounts are provisioned by the application owner. Public admin registration is disabled.</p>'}`})};
};}
