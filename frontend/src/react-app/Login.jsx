import ProviderSignIn from './ProviderSignIn';
import PatientAccess from './PatientAccess';
import React,{useState} from 'react';
import {DataService} from '../services/data-service';
import {apiSlice} from '@layout/store/apiSlice';
import {store} from '@layout/store/store';
import {homeScreen} from '../app/access-policy.js';
export default function HealthcareLogin({bridge,role,language,connectionError,onRetry,retrying,register=false}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit({identifier,password}){setBusy(true);setError('');try{await DataService.login({username:identifier.trim(),password,role});store.dispatch(apiSlice.util.resetApiState());await bridge.current.refresh();bridge.current.resetTo(homeScreen(role));}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function registerPatient(input){setBusy(true);setError('');try{if(input.password!==input.confirmPassword)throw new Error(language==='te'?'పాస్‌వర్డ్‌లు సరిపోలలేదు.':'The passwords do not match.');await DataService.registerPatient({...input,language});bridge.current.go('login',{role:'patient'});}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(role==='patient')return <PatientAccess register={register} language={language} busy={busy} error={error||connectionError} onSubmit={submit} onRegister={registerPatient}/>;
 return <ProviderSignIn role={role} language={language} busy={busy} error={error} connectionError={connectionError} retrying={retrying} onRetry={onRetry} onSubmit={submit}/>;
}
