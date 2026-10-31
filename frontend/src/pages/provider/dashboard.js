import { T, LANG } from '../../i18n/index.js';

import { providerName } from '../../data/provider-names.js';

import { Avatar } from '../../components/ui/avatar.js';
import { StatCard } from '../../components/data-display/card.js';
import { Icon } from '../../components/ui/icon.js';
export function createProviderDashboardPage(ctx) {
const { page, esc, typeBadge, isoDate, provider, mine, screens } = ctx;
const l=(te,en)=>LANG === 'te'?te:en;
return ()=>{
      const p=provider(); if(!p)return {voice:null,html:page('Profile unavailable','<p>Your provider profile could not be loaded. Refresh the connection.</p><button class="btn accent" data-a="retry">Retry</button>')};
      const upcoming=mine().filter(b=>b.status==='confirmed'&&b.date>=isoDate(0)).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
      return {voice:'dash',html:page(T.dashTitle,`<section class="workspace-welcome"><div><span class="eyebrow">YOUR PRACTICE, CONNECTED</span><h2>${l('స్వాగతం','Welcome')}, ${esc(providerName(p))}.</h2><p>${esc(p.organization||'')} · ${l('మీ రోజు కోసం ఒక సరళమైన దృశ్యం.','A clear view of your day, so you can focus on care.')}</p></div>${Icon('provider')}</section>
        <div class="stats-grid">${StatCard(l('నేటి అపాయింట్‌మెంట్లు','Today’s appointments'),mine().filter(b=>b.date === isoDate(0)&&b.status === 'confirmed').length)}
        ${StatCard(l('వేచి ఉన్న అభ్యర్థనలు','Pending requests'),mine().filter(b=>b.status === 'pending').length)}${StatCard(l('పూర్తయినవి','Completed visits'),mine().filter(b=>b.status==='done').length)}${StatCard(l('రాబోయే అపాయింట్‌మెంట్లు','Upcoming visits'),upcoming.length)}</div>
        <button class="row-btn" data-a="toggleOpen">${T.openToday} · ${p.open?T.on:T.off}</button>
        <button class="btn accent" data-a="go" data-s="providerBookings">${T.requests}</button>
        <div class="section-heading"><h2>${l('రాబోయే సందర్శనలు','Upcoming schedule')}</h2><button class="text-button" data-a="go" data-s="schedule">${l('సమయాలు మార్చండి','Edit schedule')} →</button></div><div class="schedule-list">${upcoming.slice(0,5).map(b=>`<article class="schedule-item"><span class="schedule-time">${esc(b.time)}<small>${esc(b.date)}</small></span>${Avatar(b.name)}<div><strong>${esc(b.name)}</strong><p>${esc(b.reason||l('సంప్రదింపు','Consultation'))}</p></div><span class="status-badge confirmed">Confirmed</span></article>`).join('')||'<p class="empty-state">No confirmed visits yet. Appointment requests appear here after you accept them.</p>'}</div>`)};
    };
}
