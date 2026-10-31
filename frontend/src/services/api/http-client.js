import { config } from '../../config/runtime-config.js';
let csrfPromise;
async function csrfToken(){
  csrfPromise ||= fetch(config.apiBaseUrl+'/auth/csrf',{credentials:'include'}).then(async response=>{
    if(!response.ok)throw new Error('Unable to establish a secure connection to the backend');return response.json();
  }).catch(error=>{csrfPromise=null;throw error;});
  return csrfPromise;
}
export async function request(path, method = 'GET', body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const security=method==='GET'?null:await csrfToken();
      const response = await fetch(config.apiBaseUrl + path, {
        method, signal: controller.signal,credentials:'include',
        headers: { 'Content-Type': 'application/json',...(security?{[security.headerName]:security.token}:{}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
      if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('The API did not return JSON. Check the backend connection.');
      const result = await response.json();
      if(response.status===403)csrfPromise=null;
      if (!response.ok) throw Object.assign(new Error(result.message || 'Request failed'), { status: response.status });
      if(['/auth/login','/auth/logout','/auth/guest'].includes(path))csrfPromise=null;
      return result;
    } finally { clearTimeout(timeout); }
  }
