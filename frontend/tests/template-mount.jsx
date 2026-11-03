import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {HealthcareApp,bridge,TemplateErrorBoundary} from '../src/react-app/App';
import {store} from '@layout/store/store';
import {apiSlice} from '@layout/store/apiSlice';
import {expireSession} from '@layout/store/authSlice';
export function mount(container){const root=createRoot(container);return {start:()=>root.render(<Provider store={store}><TemplateErrorBoundary><HealthcareApp/></TemplateErrorBoundary></Provider>),stop:()=>{root.unmount();store.dispatch(apiSlice.util.resetApiState());},expire:()=>store.dispatch(expireSession()),getApplication:()=>bridge.current};}
export {act};
