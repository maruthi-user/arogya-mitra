import React,{useState} from 'react';
import {Link} from 'wouter';
import {Eye,EyeOff} from 'lucide-react';

function CareIllustration(){
 return <svg className="provider-login-illustration" viewBox="0 0 320 220" fill="none" aria-hidden="true">
  <path d="M19 164C5 119 43 42 104 35c61-7 63 29 105 24 46-5 77 20 84 60-30 8-54 20-66 56H24Z" fill="#caeddd" opacity=".7"/>
  <g stroke="#086b56" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
   <path d="M49 177V115h47m123 0h44v21M40 107h57v11H40zM218 117h52M98 177V96H86V86l67-35 68 35v10h-12v81" fill="#effbf4"/>
   <path d="M126 177v-48h54v48m-27-48v48m-8-25v8m17-8v8M62 132h35v23H62zm15 0v23M31 177h165"/>
   <path d="M148 73v24m-12-12h24" strokeWidth="10"/>
   <path d="M18 177c-8-14 6-22 15-16-1-20 24-22 27-2 15-5 23 7 17 18M106 193h91"/>
   <path d="M220 203c-12-46 29-61 75-67-1 49-24 80-75 67Z" fill="#e3f6eb"/>
   <path d="M219 204c9-18 23-33 42-43m-42 43h-59"/>
  </g>
 </svg>;
}

export default function ProviderSignIn({role='provider',language='en',busy=false,error='',connectionError='',retrying=false,onRetry,onSubmit}){
 const admin=role==='admin';
 const te=language==='te',l=(telugu,english)=>te?telugu:english;
 const [identifier,setIdentifier]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false);
 function changeLanguage(next){if(next!==language)document.dispatchEvent(new CustomEvent('arogya-action',{detail:'toggleLanguage'}));}
 const guardNavigation=e=>{if(busy)e.preventDefault();};
 const welcomeDescription=admin?l('సేవాదారుల సమీక్ష మరియు ప్లాట్‌ఫారమ్ కార్యకలాపాలను నిర్వహించండి.','Manage provider reviews and platform operations.'):l('మీ సేవలు మరియు సంరక్షణ అభ్యర్థనలను నిర్వహించండి.','Manage your services and care requests.');
 return <div className="provider-login-page">
  <header className="provider-login-header"><div className="provider-login-header-inner">
   <Link href="/" className="provider-login-brand" onClick={guardNavigation} aria-label={l('ఆరోగ్య మిత్ర హోమ్','Arogya Mitra home')}>
    <img src="/assets/images/arogya-mitra-logo.png" width="60" height="60" alt=""/><span>Arogya Mitra</span>
   </Link>
   <div className="provider-login-language" role="group" aria-label={l('భాషను ఎంచుకోండి','Choose language')}>
    <button type="button" lang="en" aria-pressed={!te} disabled={busy} onClick={()=>changeLanguage('en')}>English</button>
    <button type="button" lang="te" aria-pressed={te} disabled={busy} onClick={()=>changeLanguage('te')}>తెలుగు</button>
   </div>
  </div></header>
  <main className="provider-login-main">
   <div className="provider-login-mobile-welcome"><h1>{l('తిరిగి స్వాగతం.','Welcome back.')}</h1><p>{welcomeDescription}</p></div>
   <section className="provider-login-card" aria-labelledby="provider-signin-title">
    <aside className="provider-login-story"><CareIllustration/><h2>{l('తిరిగి స్వాగతం.','Welcome back.')}</h2><p>{welcomeDescription}</p></aside>
    <div className="provider-login-content"><h2 id="provider-signin-title">{admin?l('నిర్వాహక ప్రవేశం','Admin sign in'):l('సేవాదారు ప్రవేశం','Provider sign in')}</h2><p className="provider-login-description">{admin?l('మీ ఆరోగ్య మిత్ర నిర్వాహక ఖాతాలోకి ప్రవేశించండి.','Sign in to your Arogya Mitra admin account.'):l('మీ ఆరోగ్య మిత్ర ఖాతాలోకి ప్రవేశించండి.','Sign in to your Arogya Mitra account.')}</p>
     <form onSubmit={e=>{e.preventDefault();if(!busy)onSubmit({identifier,password});}} aria-busy={busy}>
      {(error||connectionError)&&<div className="provider-login-error" role="alert"><p>{error||connectionError}</p>{connectionError&&onRetry&&<button type="button" disabled={busy||retrying} onClick={onRetry}>{retrying?l('కనెక్ట్ అవుతోంది…','Reconnecting…'):l('మళ్లీ ప్రయత్నించండి','Retry connection')}</button>}</div>}
      <div className="provider-login-field"><label htmlFor="provider-signin-email">{l('యూజర్‌నేమ్ లేదా ఇమెయిల్','Username or email')}</label><input id="provider-signin-email" name="identifier" inputMode={admin?'text':'email'} type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={100} placeholder={l('మీ యూజర్‌నేమ్ లేదా ఇమెయిల్ నమోదు చేయండి','Enter your username or email')} value={identifier} onChange={e=>setIdentifier(e.target.value)} disabled={busy}/></div>
      <div className="provider-login-field"><label htmlFor="provider-signin-password">{l('పాస్‌వర్డ్','Password')}</label><div className="provider-login-password"><input id="provider-signin-password" name="password" type={showPassword?'text':'password'} autoComplete="current-password" required placeholder={l('మీ పాస్‌వర్డ్ నమోదు చేయండి','Enter your password')} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/><button type="button" onClick={()=>setShowPassword(v=>!v)} disabled={busy} aria-label={showPassword?l('పాస్‌వర్డ్ దాచండి','Hide password'):l('పాస్‌వర్డ్ చూపండి','Show password')} aria-pressed={showPassword} aria-controls="provider-signin-password">{showPassword?<EyeOff size={23}/>:<Eye size={23}/>}</button></div></div>
      {!admin&&<div className="provider-login-forgot"><Link href="/auth/password-setup" onClick={guardNavigation} aria-disabled={busy}>{l('పాస్‌వర్డ్ మర్చిపోయారా?','Forgot password?')}</Link></div>}
      <button className="provider-login-submit" type="submit" disabled={busy}>{busy?l('ప్రవేశిస్తోంది…','Signing in…'):l('ప్రవేశించండి','Sign in')}</button>
     </form>
     <div className="provider-login-back"><Link href="/" onClick={guardNavigation} aria-disabled={busy}>{l('\u0c2a\u0c3e\u0c24\u0c4d\u0c30 \u0c0e\u0c02\u0c2a\u0c3f\u0c15\u0c15\u0c41 \u0c24\u0c3f\u0c30\u0c3f\u0c17\u0c3f \u0c35\u0c46\u0c33\u0c4d\u0c32\u0c02\u0c21\u0c3f','Back to role selection')}</Link></div>
     {admin?<p className="provider-login-register">{l('ఖాతా సహాయం కోసం ప్లాట్‌ఫారమ్ యజమానిని సంప్రదించండి.','For account assistance, contact the platform owner.')}</p>:<p className="provider-login-register">{l('ఆరోగ్య మిత్రకు కొత్తవారా?','New to Arogya Mitra?')} <Link href="/auth/register" onClick={guardNavigation} aria-disabled={busy}>{l('ఖాతాను సృష్టించండి','Create account')}</Link></p>}
    </div>
   </section>
  </main>
 </div>;
}
