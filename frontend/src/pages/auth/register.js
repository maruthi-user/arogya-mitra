import { AuthLayout } from '../../layouts/auth-layout.js';
import { Input, Select } from '../../components/forms/field.js';
import { Button } from '../../components/ui/button.js';
import { VILLAGES } from '../../data/reference-data.js';
import { LANG,lbl } from '../../i18n/index.js';
export function createRegistrationPage(){return ()=>{
  const l=(te,en)=>LANG==='te'?te:en;
  return {voice:null,html:AuthLayout({title:l('సేవలు అందించడానికి చేరండి','Care starts with you'),description:l('మీ వివరాలు నమోదు చేయండి. సమీక్ష తర్వాత ఖాతాను ప్రారంభించవచ్చు.','Apply to join Arogya Mitra. We’ll review your details before activating your provider account.'),body:`<form data-form-action="reviewRegistration" class="auth-form registration-form"><div class="form-grid">
    ${Input({id:'regName',label:l('పూర్తి పేరు','Full name'),attrs:{required:true,maxlength:80,autocomplete:'name'}})}
    ${Input({id:'regUsername',label:l('యూజర్‌నేమ్','Username'),attrs:{required:true,minlength:3,maxlength:50,pattern:'[A-Za-z0-9_.-]{3,50}',autocomplete:'username'}})}
    ${Input({id:'regEmail',label:l('ఇమెయిల్','Email address'),type:'email',attrs:{required:true,maxlength:100,autocomplete:'email'}})}
    ${Input({id:'regPhone',label:l('ఫోన్ నంబర్','Phone number'),type:'tel',attrs:{required:true,pattern:'(\\+91)?[6-9][0-9]{9}',placeholder:'9876543210',autocomplete:'tel'}})}
    ${Input({id:'regOrganization',label:l('ఆసుపత్రి / క్లినిక్ పేరు','Hospital / clinic / organization'),attrs:{required:true,maxlength:100,autocomplete:'organization'}})}
    ${Select({id:'regDesignation',label:l('వృత్తి','Designation'),options:[{value:'mbbs',label:'Doctor (MBBS)'},{value:'rmp',label:'RMP'},{value:'ayush',label:'AYUSH'}]})}
    ${Select({id:'regVillage',label:l('ప్రాంతం','Practice location'),options:VILLAGES.map(v=>({value:v.id,label:lbl(v)}))})}
    ${Input({id:'regRegistrationId',label:l('రిజిస్ట్రేషన్ ID (ఐచ్ఛికం)','Professional registration ID (optional)'),attrs:{maxlength:100}})}
    </div><div class="inline-note">${l('దరఖాస్తు ఆమోదం వృత్తిపరమైన ధృవీకరణ కాదు.','Account approval does not imply professional credential verification. Registration verification is not yet connected to an official registry.')}</div>
    ${Button({label:l('సమీక్షించి పంపండి','Review application'),variant:'accent',attrs:{type:'submit'}})}<button class="text-button" type="button" data-a="chooseRole" data-role="provider">${l('రద్దు','Cancel and return to login')}</button></form>`})};
};}
