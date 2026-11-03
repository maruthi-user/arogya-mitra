import { Icon } from '../../components/ui/icon.js';
﻿import { LANG, lbl } from '../../i18n/index.js';
import { SERVICE_KINDS, BUSINESS_KINDS, VILLAGES } from '../../services/reference-catalog.js';
import { Input, Select } from '../../components/forms/field.js';
import { escapeHtml as esc } from '../../utils/html.js';
const l=(te,en)=>LANG==='te'?te:en;
const value=id=>document.getElementById(id)?.value.trim()||'';
const checked=name=>Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(e=>e.value);
export function windowSlots(start,end,duration){
 const minutes=t=>/^([01]\d|2[0-3]):[0-5]\d$/.test(t)?Number(t.slice(0,2))*60+Number(t.slice(3)):NaN;
 const a=minutes(start),b=minutes(end),step=Number(duration),slots=[];
 if(!Number.isFinite(a)||!Number.isFinite(b)||step<15||step>480||!Number.isInteger(step)||a>=b)return slots;
 for(let t=a;t+step<=b&&slots.length<49;t+=step)slots.push(`${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`);
 return slots;
}
export function serviceInput(){
 const duration=Number(value('careDuration')),windowMode=value('careScheduleMode')!=='slots';
 const practitioner=document.getElementById('carePractitioner');
 return {kind:value('careKind'),title:value('careTitle'),titleTe:value('careTitleTe'),description:value('careDescription'),serviceNotes:value('careServiceNotes'),
  fee:value('careFee')===''?null:Number(value('careFee')),travelFee:Number(value('careTravelFee')||0),
  practitionerId:value('carePractitioner'),resource:value('carePractitioner')?'practitioner:'+value('carePractitioner'):value('careResource')||'main',
  practitionerName:practitioner?.selectedOptions?.[0]?.textContent||'',capacity:Number(value('careCapacity')||1),durationMinutes:duration,
  deliveryMode:value('careDeliveryMode'),timeWindow:windowMode?{start:value('careWindowStart'),end:value('careWindowEnd')}:null,
  slots:windowMode?windowSlots(value('careWindowStart'),value('careWindowEnd'),duration):value('careSlots').split(',').map(t=>t.trim()).filter(Boolean),
  coverage:checked('careCoverage'),availableDays:checked('careDays').map(Number),active:value('careActive')==='true',available:value('careAvailable')==='true'};
}
export function ServiceEditor({s={},business={},admin=false,organisations=[],practitioners=[]}){
 const provider=s.providerId||business.providerId||business.id||'';
 const kind=s.kind||(BUSINESS_KINDS[business.businessType||'practitioner']||[])[0]||'home_visit';
 const kinds=admin?SERVICE_KINDS:SERVICE_KINDS.filter(k=>BUSINESS_KINDS[business.businessType||'practitioner']?.includes(k[0]));
 const eligible=practitioners.filter(p=>p.active&&!p.suspended);
 const selected=s.practitionerId||(!s.id?eligible.find(p=>!p.providerId||p.providerId===provider)?.id:'')||'';
 const field=(id,label,v,attrs={},type='text')=>Input({id,label,value:v,attrs,type});
 const duration=s.durationMinutes||30;
 const durations=[15,20,30,45,60,90,120,180,240,480];if(!durations.includes(duration))durations.push(duration);
 const coverage=s.coverage||[];
 return `<section class="service-editor reference-service-editor"><div class="service-editor-heading"><button type="button" class="service-back" data-a="careClose" aria-label="${l('సేవలకు తిరిగి','Back to services')}">←</button><div><h2>${s.id?l('సేవను సవరించండి','Edit service'):l('సేవను జోడించండి','Add service')}</h2><p>${l('సరైన వివరాల కోసం సేవ రకాన్ని ఎంచుకోండి.','Choose a service type to see the right fields.')}</p></div></div>
 <nav class="service-stages" aria-label="${l('సేవ నమోదు దశలు','Service setup steps')}">${[l('సేవ వివరాలు','Service details'),l('ప్రాంతం & సమయాలు','Coverage & schedule'),l('సమీక్ష','Review')].map((name,i)=>`<button type="button" data-a="careEditorStep" data-step="${i}" aria-current="${i===0?'step':'false'}"><span>${i+1}</span>${name}</button>`).join('')}</nav>
 <form data-form-action="careEditorSubmit" id="serviceEditorForm" novalidate><div class="service-editor-layout"><div class="panel service-editor-fields">
 <section data-service-step="0"><div class="form-grid service-core-fields">
 <div class="service-kind-field">${Select({id:'careKind',label:l('సేవ రకం *','Service type *'),value:kind,options:kinds.map(([v,te,en])=>({value:v,label:l(te,en)})),attrs:{required:true}})}</div>
 ${admin?Select({id:'careProvider',label:l('వ్యాపారం *','Business *'),value:provider,options:[...new Map(organisations.map(o=>[o.providerId,{value:o.providerId,label:o.name}])).values()],attrs:{required:true}}):Select({id:'careProvider',label:l('వ్యాపారం *','Business *'),value:provider,options:[{value:provider,label:business.organization||l('మొదట వ్యాపార ప్రొఫైల్ సేవ్ చేయండి','Save your Business Profile first')}],attrs:{required:true}})}
 ${field('careTitle',l('సేవ పేరు *','Service name *'),s.title,{required:true,maxlength:100,placeholder:l('సేవ పేరు నమోదు చేయండి','Enter service name')})}
 <label class="field" for="careDescription">${l('వివరణ *','Description *')}<textarea id="careDescription" name="careDescription" rows="2" maxlength="500" required placeholder="${l('సేవ గురించి వివరించండి','Describe the service')}">${esc(s.description||'')}</textarea></label>
 <label class="field" for="carePractitioner"><span id="practitionerLabel">${l('వైద్యుడు *','Practitioner *')}</span><select id="carePractitioner" name="carePractitioner"><option value="">${l('ఎంచుకోండి','Select practitioner')}</option>${eligible.map(p=>`<option value="${esc(p.id)}" data-provider="${esc(p.providerId||provider)}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}</select><small id="practitionerHint"></small></label>
 ${field('careFee',l('సంప్రదింపు రుసుము ₹','Consultation / service fee ₹'),s.feeOnRequest?'':s.fee??'',{min:0,max:100000,step:1,placeholder:l('ఖాళీగా ఉంటే సంప్రదించండి','Blank = fee on request')},'number')}
 <div data-kind-field="travel">${field('careTravelFee',l('ప్రయాణ రుసుము ₹','Travel charge ₹'),s.travelFee||0,{min:0,max:100000,step:1},'number')}</div>
 </div></section>
 <section data-service-step="1"><div class="form-grid service-schedule-fields">
 <div class="field village-field"><span>${l('సేవా గ్రామాలు *','Service villages *')}</span><details class="village-picker"><summary><span id="careCoverageChips">${l('గ్రామాలను ఎంచుకోండి','Choose villages')}</span><span aria-hidden="true">⌄</span></summary><div class="village-options">${VILLAGES.map(v=>`<label><input type="checkbox" name="careCoverage" value="${esc(v.id)}" ${coverage.includes(v.id)?'checked':''}>${esc(lbl(v))}</label>`).join('')}</div></details><small>${l('గరిష్ఠంగా 5 ప్రాంతాలు','Up to 5 locations')}</small></div>
 ${Select({id:'careDuration',label:l('సందర్శన వ్యవధి *','Visit duration *'),value:duration,options:durations.sort((a,b)=>a-b).map(v=>({value:v,label:v+' '+l('నిమిషాలు','minutes')})),attrs:{required:true}})}
 <fieldset class="service-days"><legend>${l('అందుబాటులో ఉండే రోజులు *','Available days *')}</legend><div class="coverage-options">${[l('సోమ','Mon'),l('మంగళ','Tue'),l('బుధ','Wed'),l('గురు','Thu'),l('శుక్ర','Fri'),l('శని','Sat'),l('ఆది','Sun')].map((day,i)=>`<label class="care-check"><input type="checkbox" name="careDays" value="${i+1}" ${(s.availableDays||[1,2,3,4,5]).includes(i+1)?'checked':''}>${day}</label>`).join('')}</div></fieldset>
 <fieldset class="service-window" id="serviceWindowFields"><legend>${l('సమయ పరిధి *','Time window *')}</legend><div class="time-window-inputs">${field('careWindowStart',l('నుంచి','From'),s.timeWindow?.start||'09:00',{},'time')}<span>${l('వరకు','to')}</span>${field('careWindowEnd',l('వరకు','Until'),s.timeWindow?.end||'18:00',{},'time')}</div></fieldset>
 </div></section>
 <details class="service-extra-options"><summary>${l('అదనపు సేవ ఎంపికలు','Additional service options')}</summary><div class="form-grid">
 ${field('careTitleTe',l('సేవ పేరు (తెలుగు)','Service name (Telugu)'),s.titleTe,{maxlength:100})}
 ${Select({id:'careScheduleMode',label:l('సమయాల పద్ధతి','Schedule mode'),value:s.id&&!s.timeWindow?'slots':'window',options:[{value:'window',label:l('సమయ పరిధి','Time window')},{value:'slots',label:l('నిర్దిష్ట ప్రారంభ సమయాలు','Exact start times')}]})}
 <div id="serviceExactSlots">${field('careSlots',l('ప్రారంభ సమయాలు (HH:mm, కామాలతో)','Start times (HH:mm, comma separated)'),s.slots?.join(', ')||'',{placeholder:'09:00, 10:00'})}</div>
 ${field('careResource',l('బృందం / వాహనం / గది గుర్తింపు','Shared team / vehicle / room identifier'),s.resource||'main',{maxlength:60})}
 ${field('careCapacity',l('ఒక సమయానికి సామర్థ్యం','Capacity per slot'),s.capacity||1,{min:1,max:20,step:1},'number')}
 ${Select({id:'careDeliveryMode',label:l('సేవ అందించే విధానం','Delivery mode'),value:s.deliveryMode||(['home_visit','checkup','delivery'].includes(kind)?'home':kind==='ambulance'?'transport':'onsite'),options:[{value:'onsite',label:l('కేంద్రంలో','At business location')},{value:'home',label:l('ఇంటికి','At patient home / delivery')},{value:'remote',label:l('రిమోట్','Remote')},{value:'transport',label:l('రవాణా','Transport')}]})}
 <div data-kind-field="notes">${field('careServiceNotes',l('పరీక్ష / మందులు / వాహన వివరాలు','Test / medicine / vehicle details'),s.serviceNotes||'',{maxlength:300})}</div>
 ${Select({id:'careAvailable',label:l('అభ్యర్థనలు స్వీకరించండి','Accepting requests'),value:String(s.available??true),options:[{value:'true',label:l('అవును','Yes')},{value:'false',label:l('కాదు','No')}]})}
 ${Select({id:'careActive',label:l('సేవ క్రియాశీలంగా ఉంచండి','Keep service active'),value:String(s.active??true),options:[{value:'true',label:l('అవును','Yes')},{value:'false',label:l('కాదు','No')}]})}
 </div></details>
 <p id="serviceEditorError" class="service-editor-error" role="alert" hidden></p>
 <section data-service-step="2" hidden><h3>${l('మీ సేవను సమీక్షించండి','Review your service')}</h3><div id="serviceReviewSummary"></div><p>${l('ఆమోదం వరకు సేవ ప్రజలకు కనిపించదు.','Your service stays private until approved.')}</p><button type="button" class="btn" data-a="careEditorStep" data-step="0">${l('సవరించండి','Edit details')}</button></section>
 </div><aside class="service-preview panel" aria-live="polite"><h3>${l('రోగికి కనిపించే వివరాలు','Patient preview')}</h3><div id="servicePatientPreview" data-business="${esc(business.organization||'')}" data-has-practitioners="${eligible.length>0}"></div><p class="preview-availability">▦ &nbsp; ${l('సమయం సేవాదారు అంగీకారం తరువాత నిర్ధారణ అవుతుంది.','Availability confirmed by provider')}</p></aside></div>
 <div class="service-editor-bottom"><p class="review-warning">⚠ &nbsp; ${l('ప్రజలకు కనిపించే ముందు మీ సేవ సమీక్షించబడుతుంది.','Your service will be reviewed before it becomes visible.')}</p><button type="button" class="btn" data-a="careSaveDraft">${l('ముసాయిదా సేవ్','Save draft')}</button><button type="submit" class="btn accent">${l('సమీక్షించి పంపండి','Review & submit')}</button></div></form></section>`;
}
export function updateServicePreview(event){
 if(!document.getElementById('serviceEditorForm'))return;
 if(event?.target?.id==='careKind'){const mode=document.getElementById('careDeliveryMode');if(mode)mode.value=['home_visit','checkup','delivery'].includes(value('careKind'))?'home':value('careKind')==='ambulance'?'transport':'onsite';}
 const practitioner=document.getElementById('carePractitioner'),provider=value('careProvider');
 if(practitioner?.options){for(const option of practitioner.options){if(!option.value)continue;option.hidden=Boolean(option.dataset.provider&&option.dataset.provider!==provider);option.disabled=option.hidden;}if(practitioner.selectedOptions[0]?.disabled)practitioner.value='';}
 const s=serviceInput(),clinical=['home_visit','checkup','op'].includes(s.kind);
 const label=document.getElementById('practitionerLabel');if(label)label.textContent=clinical?l('వైద్యుడు *','Practitioner *'):l('కేటాయించిన సేవాదారు','Assigned provider');
 const hint=document.getElementById('practitionerHint');if(hint)hint.textContent=practitioner?.options?.length<=1?l('ఈ వ్యాపారానికి క్రియాశీల సేవాదారు అవసరం.','An active provider in this business is required.') : '';
 const preview=document.getElementById('servicePatientPreview');
 const business=document.getElementById('careProvider')?.selectedOptions?.[0]?.textContent||preview?.dataset.business||'';
 if(preview)preview.innerHTML=`<div class="preview-service-identity"><span aria-hidden="true">${Icon('home')}</span><div><h4>${esc((LANG==='te'?s.titleTe||s.title:s.title)||l('మీ సేవ పేరు','Your service name'))}</h4><p>${esc(business)}</p></div></div><div class="preview-price"><strong class="preview-fee">${s.fee===null?l('రుసుము కోసం సంప్రదించండి','Fee on request'):'₹'+((s.fee||0)+s.travelFee)}</strong><p>${l('ప్రయాణంతో కలిపి మొత్తం','Total including travel')}</p></div><p class="preview-coverage">♧ &nbsp; ${l('సేవా గ్రామాలు','Serves')} ${s.coverage.length} ${l('గ్రామాలు','villages')}</p>`;
 const summary=document.getElementById('serviceReviewSummary');if(summary)summary.innerHTML=`<h3>${esc(s.title)}</h3><p>${esc(s.description)}</p><p>${esc(business)} · ${esc(s.practitionerName)}</p><p>${s.fee===null?l('రుసుము కోసం సంప్రదించండి','Fee on request'):'₹'+(s.fee+s.travelFee)}</p><p>${esc(s.coverage.map(id=>lbl(VILLAGES.find(v=>v.id===id)||{en:id,te:id})).join(', '))}</p><p>${esc(s.slots.join(', '))}</p>`;
 const chips=document.getElementById('careCoverageChips');if(chips)chips.innerHTML=s.coverage.length?s.coverage.map(id=>`<span class="village-chip">${esc(lbl(VILLAGES.find(v=>v.id===id)||{en:id,te:id}))}<button type="button" data-a="careRemoveVillage" data-id="${esc(id)}" aria-label="${esc(l('తొలగించండి','Remove')+' '+id)}">×</button></span>`).join(''):l('గ్రామాలను ఎంచుకోండి','Choose villages');
 const windowMode=value('careScheduleMode')!=='slots';
 const windowFields=document.getElementById('serviceWindowFields');if(windowFields)windowFields.hidden=!windowMode;
 const exact=document.getElementById('serviceExactSlots');if(exact)exact.hidden=windowMode;
 const notes=document.querySelector('[data-kind-field="notes"]');if(notes)notes.hidden=!['lab','medicine','delivery','ambulance'].includes(s.kind);
}
export function showServiceStep(step){
 const review=Number(step)===2;
 for(const el of document.querySelectorAll('[data-service-step]'))el.hidden=Number(el.dataset.serviceStep)===2?!review:review;
 const extras=document.querySelector('.service-extra-options');if(extras)extras.hidden=review;
 for(const el of document.querySelectorAll('.service-stages button'))el.setAttribute('aria-current',el.dataset.step===String(step)?'step':'false');
 updateServicePreview();
 if(Number(step)===1)document.getElementById('careDuration')?.focus?.();
}
export function validateServiceEditor(){
 const s=serviceInput();let error='';
 if(!s.coverage.length||s.coverage.length>5)error=l('1 నుంచి 5 సేవా ప్రాంతాలను ఎంచుకోండి.','Choose between 1 and 5 service locations.');
 else if(!s.availableDays.length)error=l('కనీసం ఒక రోజును ఎంచుకోండి.','Choose at least one available day.');
 else if(s.timeWindow&&(!s.slots.length||s.slots.length>48))error=l('వ్యవధికి సరిపోయే సమయ పరిధిని ఎంచుకోండి (గరిష్ఠంగా 48 సమయాలు).','Choose a time window that fits the duration (at most 48 slots).');
 else if(!s.slots.length)error=l('అందుబాటులో ఉండే సమయాలను నమోదు చేయండి.','Enter available start times.');
 else if(['home_visit','checkup','op'].includes(s.kind)&&!s.practitionerId)error=l('మీ వ్యాపారానికి చెందిన వైద్యుడిని ఎంచుకోండి.','Select a practitioner from your business.');
 const form=document.getElementById('serviceEditorForm');
 const invalid=Array.from(form?.querySelectorAll('input,select,textarea')||[]).find(e=>!e.checkValidity());
 if(invalid){showServiceStep(0);const details=invalid.closest('details');if(details)details.open=true;invalid.reportValidity();return false;}
 const alert=document.getElementById('serviceEditorError');if(alert){alert.textContent=error;alert.hidden=!error;}
 if(error){showServiceStep(0);return false;}return true;
}
