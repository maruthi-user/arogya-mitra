import React from 'react';
import {renderToString} from 'react-dom/server';
import {Provider} from 'react-redux';
import {Router} from 'wouter';
import {configureLayout} from '@layout/config/registry';
import {store} from '@layout/store/store';
import {setUserData} from '@layout/store/authSlice';
import {LayoutProvider} from '@layout/shell/LayoutContext';
import {AppShell} from '@layout/shell/AppShell';
import {TooltipProvider} from '@layout/ui/tooltip';
import HealthcareLogin from '../src/react-app/Login';
import {healthcareConfig} from '../src/react-app/config';
export function renderLogin(role,language){return renderToString(<Router ssrPath="/"><HealthcareLogin bridge={{current:null}} role={role} language={language}/></Router>);}
export function renderShell(role){configureLayout(healthcareConfig({current:null},'en',role));store.dispatch(setUserData({id:'example',fullName:'Example User',role}));return renderToString(<Provider store={store}><Router ssrPath="/app/home"><LayoutProvider><TooltipProvider><AppShell><p>Healthcare workflow content</p></AppShell></TooltipProvider></LayoutProvider></Router></Provider>);}
