import './provider-login.css';
﻿import React from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {HealthcareApp,TemplateErrorBoundary} from './App';
import {store} from '@layout/store/store';
import '../template.css';
import '../styles/scoped-healthcare.css';
createRoot(document.getElementById('root')).render(<Provider store={store}><TemplateErrorBoundary><HealthcareApp/></TemplateErrorBoundary></Provider>);

import '../components/data-display/data-table.css';
