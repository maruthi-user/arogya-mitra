import { T } from '../../i18n/index.js';
import { DataService } from '../../services/data-service.js';
import { Appointments } from './workflow.js';

export function createBookingAction({state,navigation,refresh,render,toast}) {
  return async () => {
    const params=navigation.params;
    params.reason=document.getElementById('bookingReason').value.trim();
    if(!params.time){toast(T.chooseTime);return;}
    const nameField=document.getElementById('bookingPatientName'),phoneField=document.getElementById('bookingPatientPhone');
    if(!nameField.reportValidity()||!phoneField.reportValidity())return;
    const name=nameField.value.trim(),phone=phoneField.value.trim();if(!name)throw new Error('Please enter your name.');
    await DataService.patientProfile(state.settings.patientId,{name,phone,village:state.settings.village});state.settings.name=name;state.settings.phone=phone;
    const date=Appointments.date(params.day??0);
    if(state.bookings.some(b=>b.pid===params.pid&&b.date===date&&b.time===params.time&&Appointments.active(b))){toast(T.slotTaken);return;}
    const saved=await DataService.book({pid:params.pid,date,time:params.time,name:state.settings.name||T.guest,
      village:state.settings.village,patientId:state.settings.patientId,reason:params.reason});
    await refresh();navigation.screen='confirmed';navigation.params={bid:saved.id};render();
  };
}
