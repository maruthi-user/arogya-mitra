import './provider-login.css';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {HealthcareApp,TemplateErrorBoundary} from './App';
import {store} from '@layout/store/store';
import '../template.css';
import '../styles/scoped-healthcare.css';
import '../components/data-display/data-table.css';
import '../styles/ui-alignment.css';
createRoot(document.getElementById('root')).render(<Provider store={store}><TemplateErrorBoundary><HealthcareApp/></TemplateErrorBoundary></Provider>);

// Installable app + offline app shell (see public/sw.js). Only in production builds, so the dev
// server's hot reload is never served from a cache.
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{/* the app works without it */});});
}
