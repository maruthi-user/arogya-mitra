import React,{useState} from 'react';
import {Link} from 'wouter';
import {Eye,EyeOff} from 'lucide-react';

export default function PatientAccess({register=false,language='en',busy,error,onSubmit,onRegister}){
 const [input,setInput]=useState({identifier:'',password:'',phone:'',name:'',village:'',confirmPassword:''});
 const [visible,setVisible]=useState({password:false,confirmPassword:false});
 const l=(te,en)=>language==='te'?te:en;
 const change=e=>setInput({...input,[e.target.name]:e.target.value});
 const passwordField=(name,label)=><div className="provider-login-field"><label htmlFor={'patient-'+name}>{label}</label><div className="provider-login-password"><input id={'patient-'+name} name={name} type={visible[name]?'text':'password'} autoComplete={register?'new-password':'current-password'} minLength={register?8:undefined} required value={input[name]} onChange={change} disabled={busy}/><button type="button" aria-label={visible[name]?l('పాస్‌వర్డ్ దాచండి','Hide password'):l('పాస్‌వర్డ్ చూపండి','Show password')} aria-controls={'patient-'+name} aria-pressed={visible[name]} disabled={busy} onClick={()=>setVisible(v=>({...v,[name]:!v[name]}))}>{visible[name]?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></div>;
 return <div className="provider-login-page"><header className="provider-login-header"><div className="provider-login-header-inner"><Link className="provider-login-brand" href="/"><img src="/assets/images/arogya-mitra-logo.png" alt=""/><span>Arogya Mitra</span></Link></div></header><main className="provider-login-main"><section className="provider-login-card"><aside className="provider-login-story"><h2>{l('మీ ఆరోగ్యం, మీ ఖాతా','Your care, your account')}</h2><p>{l('మీ బుకింగ్‌లను ఒకేచోట చూడండి.','Sign in to see your bookings across visits.')}</p></aside><div className="provider-login-content"><h1>{register?l('రోగి నమోదు','Patient registration'):l('రోగి ప్రవేశం','Patient sign in')}</h1><div className="patient-access-options"><Link href="/auth/login?role=patient" aria-current={!register?'page':undefined}>{l('ప్రవేశించండి','Sign in')}</Link><Link href="/auth/patient-register" aria-current={register?'page':undefined}>{l('నమోదు','Register')}</Link></div>
 <form aria-busy={busy} onSubmit={e=>{e.preventDefault();if(!busy)(register?onRegister(input):onSubmit(input));}}>
 {error&&<p className="provider-login-error" role="alert">{error}</p>}
 {register?<>
  <label className="provider-login-field">{l('మొబైల్ నంబర్ (మీ యూజర్‌నేమ్)','Mobile number (your username)')}<input name="phone" type="tel" autoComplete="tel" pattern="[6-9][0-9]{9}" required maxLength={10} value={input.phone} onChange={change} disabled={busy}/></label>
  <label className="provider-login-field">{l('పేరు','Name')}<input name="name" autoComplete="name" required maxLength={40} value={input.name} onChange={change} disabled={busy}/></label>
  <label className="provider-login-field">{l('గ్రామం','Village')}<input name="village" type="text" autoComplete="address-level3" required maxLength={40} value={input.village} onChange={change} disabled={busy}/></label>
 </>:<label className="provider-login-field">{l('యూజర్‌నేమ్ (మొబైల్ నంబర్)','Username (mobile number)')}<input name="identifier" inputMode="tel" autoComplete="username" required value={input.identifier} onChange={change} disabled={busy}/></label>}
 {passwordField('password',l('పాస్‌వర్డ్','Password'))}
 {register&&<><p>{l('కనీసం 8 అక్షరాలు, ఒక అక్షరం మరియు ఒక సంఖ్య అవసరం.','Use at least 8 characters, including a letter and a digit.')}</p>{passwordField('confirmPassword',l('పాస్‌వర్డ్ నిర్ధారణ','Confirm password'))}</>}
 <button className="provider-login-submit" disabled={busy} type="submit">{busy?l('దయచేసి వేచి ఉండండి','Please wait'):register?l('ఖాతాను సృష్టించండి','Create account'):l('ప్రవేశించండి','Sign in')}</button>
 </form><div className="provider-login-back"><Link href="/" aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}}>{l('\u0c2a\u0c3e\u0c24\u0c4d\u0c30 \u0c0e\u0c02\u0c2a\u0c3f\u0c15\u0c15\u0c41 \u0c24\u0c3f\u0c30\u0c3f\u0c17\u0c3f \u0c35\u0c46\u0c33\u0c4d\u0c32\u0c02\u0c21\u0c3f','Back to role selection')}</Link></div></div></section></main></div>;
}
