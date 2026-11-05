import {escapeHtml as esc} from '../../utils/html.js';
import {Input,Select} from '../../components/forms/field.js';
import {LANG,lbl} from '../../i18n/index.js';
import {VILLAGES} from '../../services/reference-catalog.js';
const l=(te,en)=>LANG==='te'?te:en;
const button=(label,action)=>`<button class="btn" type="button" data-a="${action}">${label}</button>`;
export function bookingDialog(service,{form=false,draft={},date,slots=[],name='',phone=''}={}){
 const fee=service.feeOnRequest?l('సంప్రదించండి','On request'):'₹'+esc(service.totalFee??Number(service.fee||0)+Number(service.travelFee||0));
 const fields=[[l('సేవ','Service'),LANG==='te'?service.titleTe||service.title:service.title],[l('సంస్థ','Provider'),service.organization],[l('వివరణ','Description'),service.description],[l('రకం','Type'),service.kind],[l('మొత్తం రుసుము','Total fee'),fee],[l('వ్యవధి','Duration'),service.durationMinutes?service.durationMinutes+' minutes':'—'],[l('సేవా ప్రాంతాలు','Coverage'),(service.coverage||[]).map(id=>lbl(VILLAGES.find(v=>v.id===id)||{en:id,te:id})).join(', ')],[l('సమయాలు','Times'),(service.slots||[]).join(', ')]];
 fields.push([l('ఫోన్','Phone'),service.phone],[l('వైద్యుడు','Practitioner'),service.practitionerName],[l('ప్రయాణ రుసుము','Travel charge'),service.travelFee??0],[l('సేవ విధానం','Delivery mode'),service.deliveryMode],[l('అందుబాటు రోజులు (1=సోమవారం)','Available weekdays (1=Monday)'),(service.availableDays||[]).join(', ')]);
 const details=`<dl class="am-record-modal-fields">${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('')}</dl>`;
 const body=!form?details:`<form id="patientBookingForm" class="form-grid" data-form-action="careSubmit">
 ${Input({id:'carePatientName',label:l('పేరు','Name'),value:draft.carePatientName??name,attrs:{required:true,maxlength:40,autocomplete:'name'}})}
 ${Input({id:'carePatientPhone',label:l('మొబైల్ నంబర్','Mobile number'),type:'tel',value:draft.carePatientPhone??phone,attrs:{required:true,pattern:'(\\+91)?[6-9][0-9]{9}',autocomplete:'tel'}})}
 ${Input({id:'careVillage',label:l('గ్రామం / పట్టణం','Village / town'),value:draft.careVillage||'',attrs:{required:true,maxlength:40,autocomplete:'address-level3'}})}
 <div class="booking-location"><div class="booking-location-label"><label for="careAddress">${l('చిరునామా / స్థానం','Address / location')}</label><label><input id="careUseLocation" type="checkbox" data-a="careLocation" ${draft.latitude!=null?'checked':''}> ${l('ప్రస్తుత స్థానం','Use current location')}</label></div><textarea id="careAddress" name="careAddress" required maxlength="300" rows="3">${esc(draft.careAddress||'')}</textarea><p id="careLocationStatus" role="status">${l('చిరునామాను నమోదు చేయండి లేదా స్థాన అనుమతి ఇవ్వండి. గ్రామాన్ని విడిగా ఎంచుకోండి.','Enter your address manually or allow current location. Enter your service village separately.')}</p></div>
 ${Input({id:'careDate',label:l('తేదీ','Date'),type:'date',value:date,attrs:{required:true,min:new Date().toLocaleDateString('en-CA')}})}
 <button type="button" class="btn" data-a="careDate">${l('సమయాలు చూడండి','Check available times')}</button>
 ${Select({id:'careTime',label:l('అందుబాటు సమయం','Available time'),value:draft.careTime||'',options:[{value:'',label:l('సమయం ఎంచుకోండి','Choose time')},...slots.filter(s=>s.remaining>0).map(s=>({value:s.time,label:s.time}))],attrs:{required:true}})}
 ${Select({id:'careMode',label:l('అభ్యర్థన రకం','Request type'),value:draft.careMode||'visit',options:[{value:'visit',label:l('సేవ బుకింగ్','Service booking')},{value:'callback',label:l('తిరిగి కాల్','Callback')}]})}
 ${Input({id:'careDetails',label:l('వివరాలు (మందులు / పరీక్ష / గమ్యం)','Details (medicine / test / destination)'),value:draft.careDetails||'',attrs:{maxlength:500,required:['medicine','delivery','lab','ambulance'].includes(service.kind)}})}
 ${Select({id:'carePayment',label:l('చెల్లింపు ప్రాధాన్యత (ఐచ్ఛికం)','Payment preference (optional)'),value:draft.carePayment||'',options:[{value:'',label:l('తరువాత నిర్ణయిస్తాను','Decide later')},{value:'cash',label:l('సేవాదారుకు నగదు','Cash to provider')},{value:'online',label:l('ఆన్‌లైన్ ప్రాధాన్యత','Online preferred')}]})}
 <p class="inline-note">${l('ఇప్పుడు చెల్లింపు వసూలు చేయబడదు. సేవాదారు అంగీకారం తర్వాత మాత్రమే నిర్ధారణ.','No payment is collected now. This sends a request to the provider; confirmation requires acceptance.')}</p>
 <button class="btn accent" type="submit">${l('సేవ బుక్ చేయండి','Book service')}</button></form>`;
 return `<dialog open id="patientBookingDialog" class="am-record-modal patient-booking-dialog" aria-labelledby="patientBookingTitle"><header><h2 id="patientBookingTitle">${form?l('బుకింగ్ వివరాలు','Booking details'):l('సేవ నిర్ధారణ','Review service')}</h2><div class="actions">${!form?button(l('సేవ బుక్ చేయండి','Book service'),'careBeginBooking'):''}${button(l('రద్దు','Cancel booking'),'careCancelBooking')}</div></header>${body}</dialog>`;
}
export function showBookingDialog(onCancel){
 const dialog=document.getElementById('patientBookingDialog');if(!dialog?.showModal)return;
 dialog.removeAttribute('open');dialog.showModal();
 dialog.addEventListener('cancel',event=>{event.preventDefault();onCancel();},{once:true});
}
