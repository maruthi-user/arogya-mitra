import ProviderSignIn from './ProviderSignIn';
import React,{useState} from 'react';
import {DataService} from '../services/data-service';
import {apiSlice} from '@layout/store/apiSlice';
import {store} from '@layout/store/store';
export default function HealthcareLogin({bridge,role,language,connectionError,onRetry,retrying}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit({identifier,password}){setBusy(true);setError('');try{await DataService.login({username:identifier.trim(),password,role});store.dispatch(apiSlice.util.resetApiState());await bridge.current.refresh();bridge.current.resetTo('careDashboard');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <ProviderSignIn role={role} language={language} busy={busy} error={error} connectionError={connectionError} retrying={retrying} onRetry={onRetry} onSubmit={submit}/>;
}
