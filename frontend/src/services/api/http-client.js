import { config } from '../../config/runtime-config.js';
let csrfPromise;
let refreshPromise;
const timeoutMs=10000;
const failure=(message,status)=>Object.assign(new Error(message),status===undefined?{}:{status});
function transportError(error){
  if(error.name==='AbortError'||error.name==='TimeoutError')return failure('The request timed out. Check the connection and try again.');
  if(error.name==='TypeError')return failure('Unable to reach the backend. Check that it is running and try again.');
  if(error.name==='SyntaxError')return failure('The backend returned an invalid response. Please try again.');
  return error;
}
async function csrfToken(){
  if(!csrfPromise){
    csrfPromise=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=await fetch(config.apiBaseUrl+'/auth/csrf',{credentials:'include',signal:controller.signal});
        if(!response.ok)throw failure('Unable to establish a secure connection to the backend.',response.status);
        if(!response.headers.get('content-type')?.includes('application/json'))throw failure('The API returned a page instead of JSON. Check the frontend proxy and backend port.');
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
    if(!response.headers.get('content-type')?.includes('application/json'))throw failure('The API returned a page instead of JSON. Check the frontend proxy and backend port.',response.ok?undefined:response.status);
    const result=await response.json();
    // A rejected CSRF check never reaches the login controller. Renew the session token
    // and retry login once; permission failures and other mutations are never replayed.
    if(!retried&&path==='/auth/login'&&response.status===403&&result?.code==='CSRF_INVALID')return await request(path,method,body,true);
    if(!response.ok)throw failure(result?.message||'Request failed. Please try again.',response.status);
    if(['/auth/login','/auth/logout','/auth/guest','/auth/change-initial-password'].includes(path))csrfPromise=null;
    return result;
  }catch(error){throw transportError(error);}finally{clearTimeout(timer);}
}
