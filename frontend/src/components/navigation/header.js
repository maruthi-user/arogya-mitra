import { LANG } from '../../i18n/index.js';
import { Brand } from '../ui/brand.js';
import { Icon } from '../ui/icon.js';
import { Avatar } from '../ui/avatar.js';
import { escapeHtml } from '../../utils/html.js';
export function renderHeader({title,canGoBack,role,name=''}) {
  return '<header class="app-header"><div class="mobile-brand">'+Brand()+'</div><div class="workspace-title">'+(canGoBack?'<button class="header-icon" data-a="back" aria-label="Go back">←</button>':'')+'<div><span class="eyebrow">'+(role==='admin'?'ADMINISTRATION':role==='provider'?'PRACTICE WORKSPACE':'YOUR CARE SPACE')+'</span><h1>'+title+'</h1></div></div><div class="header-tools">'+(role==='patient'?'<button class="header-icon" data-a="openSearch" aria-label="Search">'+Icon('search')+'</button>':'')+'<button class="language-pill" data-a="toggleLanguage">'+(LANG==='te'?'English':'తెలుగు')+'</button><div class="header-person">'+Avatar(name||role||'')+'<span>'+escapeHtml(name||'Welcome')+'<small>'+escapeHtml(role||'')+'</small></span></div>'+(role==='provider'||role==='admin'?'<button class="header-icon" data-a="logout" aria-label="Sign out">'+Icon('logout')+'</button>':'<button class="header-icon emergency-icon" data-a="emergency" aria-label="Emergency assistance">'+Icon('ambulance')+'</button>')+'</div></header>';
}
