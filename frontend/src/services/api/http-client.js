import { config } from '../../config/runtime-config.js';
let csrfPromise;
let refreshPromise;
// Rural 2G/3G connections often need well over 10 seconds for a response, so wait longer before
// giving up; config.requestTimeoutMs can override it per deployment.
const timeoutMs=Number(config.requestTimeoutMs)||25000;
const failure=(message,status)=>Object.assign(new Error(message),status===undefined?{}:{status});
const telugu=()=>typeof document!=='undefined'&&document.documentElement.lang==='te';
const offline=()=>typeof navigator!=='undefined'&&navigator.onLine===false;
async function nonJsonFailure(response){
  const body=typeof response.text==='function'?await response.text():'';
  if(response.status===403&&body.trim()==='Invalid CORS request')return failure('The backend rejected this frontend address. Restart the backend with the current frontend URL and allowed origins.',403);
  return failure('The API returned a page instead of JSON. Check the frontend proxy and backend port.',response.status);
}
function transportError(error){
  if(offline())return failure(telugu()?'మీరు ఆఫ్‌లైన్‌లో ఉన్నారు. ఇంటర్నెట్ కనెక్షన్ వచ్చిన తర్వాత మళ్లీ ప్రయత్నించండి.':'You are offline. Try again when your internet connection is back.');
  if(error.name==='AbortError'||error.name==='TimeoutError')return failure(telugu()?'నెట్‌వర్క్ నెమ్మదిగా ఉంది. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.':'The network is slow and the request timed out. Please try again in a moment.');
  if(error.name==='TypeError')return failure(telugu()?'సర్వర్‌ను చేరుకోలేకపోయాం. కనెక్షన్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.':'Unable to reach the server. Check your connection and try again.');
  if(error.name==='SyntaxError')return failure('The backend returned an invalid response. Please try again.');
  return error;
}
async function csrfToken(){
  if(!csrfPromise){
    csrfPromise=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=await fetch(config.apiBaseUrl+'/auth/csrf',{credentials:'include',signal:controller.signal});
        if(!response.headers.get('content-type')?.includes('application/json'))throw await nonJsonFailure(response);
        if(!response.ok)throw failure('Unable to establish a secure connection to the backend.',response.status);
        const token=await response.json();if(typeof token.token!=='string'||!token.token||typeof token.headerName!=='string'||!token.headerName)throw failure('The backend did not return a security token. Check the API routing.');return token;
      }catch(error){csrfPromise=null;throw transportError(error);}finally{clearTimeout(timer);}
    })();
  }
  return csrfPromise;
}
async function refreshSession(){
  refreshPromise ||= request('/v1/auth/refresh','POST',{}).finally(()=>{refreshPromise=null;});
  return refreshPromise;
}
export async function request(path,method='GET',body,retried=false){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const security=method==='GET'?null:await csrfToken();
    const response=await fetch(config.apiBaseUrl+path,{method,signal:controller.signal,credentials:'include',headers:{'Content-Type':'application/json',...(security?{[security.headerName]:security.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(!retried&&response.status===401&&!path.startsWith('/auth/')&&!path.startsWith('/v1/auth/')){
      try{await refreshSession();}catch(error){if([401,403].includes(error.status))throw failure('Your session has expired. Please sign in again.',401);throw error;}
      // Keep the retried response's real error (such as validation, permissions or a full slot).
      return await request(path,method,body,true);
    }
    if(response.status===403)csrfPromise=null;
    if(response.status===204&&response.ok)return null;
    if(!response.headers.get('content-type')?.includes('application/json'))throw await nonJsonFailure(response);
    const result=await response.json();
    if(response.status===404&&path==='/auth/patients/register')throw failure('Patient registration is not loaded on the running backend. Restart Arogya Mitra Application.java and try again.',404);
    // A rejected CSRF check never reaches the login controller. Renew the session token
    // and retry login once; permission failures and other mutations are never replayed.
    if(!retried&&path==='/auth/login'&&response.status===403&&result?.code==='CSRF_INVALID')return await request(path,method,body,true);
    if(!response.ok)throw failure(result?.message||'Request failed. Please try again.',response.status);
    if(['/auth/login','/auth/logout','/auth/guest','/auth/change-initial-password'].includes(path))csrfPromise=null;
    return result;
  }catch(error){throw transportError(error);}finally{clearTimeout(timer);}
}
