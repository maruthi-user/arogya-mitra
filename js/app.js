(function () {
  'use strict';

  const S = Store.init();
  Voice.enabled = S.settings.voice;

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const listeningEl = document.getElementById('listening');

  let interacted = false;
  let currentVoice = null;
  let tourToken = 0;
  let introStep = 0;

  function setLang(code) {
    applyLang(code);
    Voice.setLang(LANG);
    document.getElementById('listenText').textContent = T.listening;
  }
  setLang(S.settings.lang || 'te');

  const nav = {
    screen: !S.settings.lang ? 'lang' : !S.settings.introSeen ? 'intro' : (S.settings.village ? 'home' : 'setup'),
    params: {},
    stack: []
  };

  /* ---------- helpers ---------- */

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const villageName = id => { const v = VILLAGES.find(x => x.id === id); return v ? lbl(v) : ''; };
  const medById = id => MEDICINES.find(m => m.id === id);
  const providerById = id => S.providers.find(p => p.id === id);
  const pharmacyById = id => S.pharmacies.find(p => p.id === id);
  const distTo = village => distanceKm(S.settings.village, village);

  function distLabel(km) {
    return km < 1 ? Math.round(km * 1000) + ' ' + T.metres : km + ' ' + T.km;
  }

  function fmtTime(t) {
    const [h, m] = t.split(':').map(Number);
    if (LANG === 'en') return (h % 12 || 12) + ':' + String(m).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM');
    const period = h < 12 ? T.morning : h < 16 ? T.noon : T.evening;
    return period + ' ' + (h % 12 || 12) + ':' + String(m).padStart(2, '0');
  }

  function isoDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function dateLabel(iso) {
    if (iso === isoDate(0)) return T.today;
    if (iso === isoDate(1)) return T.tomorrow;
    const [y, m, d] = iso.split('-');
    return d + '/' + m + '/' + y;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }

  function typeBadge(type) {
    const map = { mbbs: ['ok', T.mbbs], rmp: ['warn', T.rmp], ayush: ['info', T.ayush] };
    const [cls, label] = map[type] || ['info', ''];
    return `<span class="badge ${cls}">${label}</span>`;
  }

  /* ---------- navigation ---------- */

  function go(screen, params) {
    Voice.stop();
    tourToken++;
    if (screen !== nav.screen) nav.stack.push({ screen: nav.screen, params: nav.params });
    nav.screen = screen;
    nav.params = params || {};
    render();
  }

  function goBack() {
    Voice.stop();
    tourToken++;
    const prev = nav.stack.pop();
    if (!prev) return;
    nav.screen = prev.screen;
    nav.params = prev.params;
    render();
  }

  function resetTo(screen) {
    Voice.stop();
    tourToken++;
    nav.stack = [];
    nav.screen = screen;
    nav.params = {};
    render();
  }

  /* ---------- shared UI pieces ---------- */

  function header(title) {
    const back = nav.stack.length
      ? `<button class="iconbtn" data-a="back" aria-label="${T.back}">←</button>`
      : '<span class="iconbtn spacer"></span>';
    return `<header class="top">${back}<h1>${title}</h1><button class="spk" data-a="speak" aria-label="${T.listen}">🔊</button></header>`;
  }

  function navbar() {
    return `<nav class="nav">
      <button data-a="home"><span class="ico">🏠</span>${T.home}</button>
      <button data-a="mic" class="micbtn"><span class="ico">🎤</span>${T.speak}</button>
      <button data-a="help"><span class="ico">❓</span>${T.help}</button>
    </nav>`;
  }

  function page(title, body) {
    return `${header(title)}<main class="content">${body}</main>${navbar()}`;
  }

  function providerCard(p) {
    const km = distTo(p.village);
    return `<article class="card">
      <div class="card-head"><strong>${esc(providerName(p))}</strong>${typeBadge(p.type)}</div>
      <div class="meta">📍 ${distLabel(km)} · ${esc(villageName(p.village))} · <span class="${p.open ? 'ok-t' : 'bad-t'}">${p.open ? T.open : T.closed}</span></div>
      <div class="actions">
        <a class="btn green" href="tel:${esc(p.phone)}">📞 ${T.call}</a>
        <button class="btn ghost" data-a="book" data-id="${p.id}">📅 ${T.book}</button>
      </div>
    </article>`;
  }

  /* ---------- screens: each returns { html, voice, after } ---------- */

  const screens = {};

  screens.intro = function () {
    const step = introStep;
    const last = step === TOUR.length - 1;
    return {
      voice: null,
      html: `<section class="intro">
        <div class="brand">🩺 ${T.appName}</div>
        <p class="howto">${T.howToUse}</p>
        <div class="video-box">
          <video id="introVideo" playsinline controls hidden></video>
          <div id="tour" class="tour">
            <div class="tour-icon" id="tourIcon">${TOUR[step].icon}</div>
            <p class="tour-text" id="tourText">${TOUR[step].text}</p>
          </div>
        </div>
        <div class="dots" id="dots">${TOUR.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn accent big" data-a="introPlay" id="introPlay">▶ ${T.listen}</button>
        <div class="actions">
          <button class="btn ghost" data-a="introNext" id="introNext">${last ? T.start : T.next}</button>
          <button class="btn ghost" data-a="introSkip">${T.skip}</button>
        </div>
      </section>`,
      after() {
        const v = document.getElementById('introVideo');
        v.addEventListener('loadedmetadata', () => {
          v.hidden = false;
          document.getElementById('tour').hidden = true;
          document.getElementById('dots').hidden = true;
          document.getElementById('introPlay').hidden = true;
          document.getElementById('introNext').hidden = true;
        });
        v.addEventListener('ended', finishIntro);
        v.src = 'assets/intro-' + LANG + '.mp4';
      }
    };
  };

  screens.lang = function () {
    return {
      voice: null,
      html: `<section class="intro">
        <div class="brand">🩺 ఆరోగ్య మిత్ర · Arogya Mitra</div>
        <p class="howto">మీ భాష ఎంచుకోండి<br>Choose your language</p>
        <div class="stack">
          ${Object.keys(LANGS).map(k => `<button class="choice langbtn ${S.settings.lang === k ? 'sel' : ''}" data-a="setLang" data-id="${k}">${LANGS[k].label}${S.settings.lang === k ? ' ✓' : ''}</button>`).join('')}
        </div>
      </section>`
    };
  };

  screens.setup = function () {
    const chosen = S.settings.village;
    return {
      voice: 'setup',
      html: `${header(T.chooseVillage)}<main class="content">
        <div class="stack">
          ${VILLAGES.map(v => `<button class="choice ${chosen === v.id ? 'sel' : ''}" data-a="pickVillage" data-id="${v.id}">📍 ${lbl(v)}${chosen === v.id ? ' ✓' : ''}</button>`).join('')}
        </div>
        <label class="field">${T.yourName}<input type="text" id="nameInput" value="${esc(S.settings.name)}" maxlength="40" autocomplete="off"></label>
        <button class="btn accent big" data-a="setupDone">${T.continue}</button>
      </main>`
    };
  };

  screens.home = function () {
    const name = S.settings.name ? ', ' + esc(S.settings.name) : '';
    return {
      voice: 'home',
      html: page(T.appName, `
        <p class="hello">${T.greeting}${name} 👋 <span class="muted">· ${esc(villageName(S.settings.village))}</span></p>
        <button class="btn danger big" data-a="emergency">🚑 ${T.emergency}</button>
        <button class="tile wide" data-a="go" data-s="symptoms"><span class="tile-ico">🩺</span>${T.needDoctor}</button>
        <button class="tile wide" data-a="go" data-s="meds"><span class="tile-ico">💊</span>${T.needMedicine}</button>
        <button class="tile wide small" data-a="go" data-s="bookings"><span class="tile-ico">📅</span>${T.myBookings}</button>
        <button class="linkbtn" data-a="go" data-s="settings">⚙️ ${T.settings}</button>
        <button class="linkbtn" data-a="go" data-s="lang">🌐 తెలుగు / English</button>`)
    };
  };

  screens.symptoms = function () {
    return {
      voice: 'symptoms',
      html: page(T.whatProblem, `
        <div class="grid2">
          ${SYMPTOMS.map(s => `<button class="tile" data-a="symptom" data-id="${s.id}"><span class="tile-ico">${s.icon}</span>${lbl(s)}</button>`).join('')}
        </div>
        <h2 class="danger-h">⚠️ ${T.dangerSigns}</h2>
        <div class="grid2">
          ${RED_FLAGS.map(f => `<button class="tile red" data-a="emergency"><span class="tile-ico">${f.icon}</span>${lbl(f)}</button>`).join('')}
        </div>
        <button class="btn accent big" data-a="mic">🎤 ${T.speakProblem}</button>`)
    };
  };

  screens.providers = function (p) {
    const sym = SYMPTOMS.find(s => s.id === p.symptom);
    let list = S.providers.filter(x => !sym || sym.types.includes(x.type));
    if (!list.length) list = S.providers.slice();
    list.sort((a, b) => (b.open - a.open) || (distTo(a.village) - distTo(b.village)));
    return {
      voice: 'providers',
      html: page(sym ? `${sym.icon} ${lbl(sym)}` : T.nearbyDoctors, `
        <h2 class="sub">${T.nearbyDoctors}</h2>
        ${list.map(providerCard).join('')}
        <p class="fine">${T.demoNote}</p>`)
    };
  };

  screens.book = function (p) {
    const prov = providerById(p.pid);
    const day = p.day ?? 0;
    const date = isoDate(day);
    const now = new Date();
    const nowHm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    const slots = prov.slots.filter(t => day > 0 || t > nowHm);
    const taken = t => S.bookings.some(b => b.pid === prov.id && b.date === date && b.time === t && b.status === 'booked');
    return {
      voice: 'book',
      html: page(T.chooseTime, `
        <article class="card"><div class="card-head"><strong>${esc(providerName(prov))}</strong>${typeBadge(prov.type)}</div>
          <div class="meta">📍 ${distLabel(distTo(prov.village))} · ${esc(villageName(prov.village))}</div></article>
        <div class="seg">
          <button class="${day === 0 ? 'sel' : ''}" data-a="day" data-d="0">${T.today}</button>
          <button class="${day === 1 ? 'sel' : ''}" data-a="day" data-d="1">${T.tomorrow}</button>
        </div>
        ${slots.length ? `<div class="grid2">${slots.map(t => taken(t)
          ? `<button class="slot taken" data-a="slotTaken">${fmtTime(t)}</button>`
          : `<button class="slot ${p.time === t ? 'sel' : ''}" data-a="slot" data-t="${t}">${fmtTime(t)}</button>`).join('')}</div>`
          : `<p class="muted">${T.noSlots}</p>`}
        <button class="btn accent big" data-a="confirm">✅ ${T.confirm}</button>`)
    };
  };

  screens.confirmed = function (p) {
    const b = S.bookings.find(x => x.id === p.bid);
    const prov = b && providerById(b.pid);
    return {
      voice: 'confirmed',
      html: `${header(T.booked)}<main class="content center">
        <div class="bigcheck">✓</div>
        <h2>${esc(prov ? providerName(prov) : '')}</h2>
        <p class="when">${b ? dateLabel(b.date) + ' · ' + fmtTime(b.time) : ''}</p>
        <p class="muted">📍 ${prov ? distLabel(distTo(prov.village)) + ' · ' + esc(villageName(prov.village)) : ''}</p>
        <div class="actions wide">
          ${prov ? `<a class="btn green" href="tel:${esc(prov.phone)}">📞 ${T.call}</a>` : ''}
          <button class="btn ghost" data-a="home">🏠 ${T.home}</button>
        </div>
      </main>`
    };
  };

  screens.bookings = function () {
    const mine = S.bookings.slice().sort((a, b) => b.createdAt - a.createdAt);
    const stLabel = { booked: '', done: T.done, cancelled: T.cancelled };
    return {
      voice: 'bookings',
      html: page(T.bookingsTitle, mine.length ? mine.map(b => {
        const prov = providerById(b.pid);
        return `<article class="card ${b.status !== 'booked' ? 'dim' : ''}">
          <div class="card-head"><strong>${esc(prov ? providerName(prov) : '')}</strong>${stLabel[b.status] ? `<span class="badge info">${stLabel[b.status]}</span>` : ''}</div>
          <div class="meta">📅 ${dateLabel(b.date)} · ${fmtTime(b.time)}</div>
          ${b.status === 'booked' ? `<div class="actions">
            <a class="btn green" href="tel:${esc(prov ? prov.phone : '')}">📞 ${T.call}</a>
            <button class="btn ghost" data-a="cancelBk" data-id="${b.id}">✖ ${T.cancel}</button></div>` : ''}
        </article>`;
      }).join('') : `<p class="muted center">${T.noBookings}</p>`)
    };
  };

  screens.meds = function (p) {
    const med = medById(p.med);
    if (!med) {
      return {
        voice: 'meds',
        html: page(T.whichMedicine, `
          <div class="grid2">${MEDICINES.map(m => `<button class="tile" data-a="med" data-id="${m.id}"><span class="tile-ico">${m.icon}</span>${lbl(m)}</button>`).join('')}</div>
          <button class="btn accent big" data-a="mic">🎤 ${T.speak}</button>`)
      };
    }
    const list = S.pharmacies.slice().sort((a, b) =>
      (b.stock[med.id] - a.stock[med.id]) || (distTo(a.village) - distTo(b.village)));
    return {
      voice: 'medResults',
      html: page(`${med.icon} ${lbl(med)}`, `
        <h2 class="sub">${T.medicineWhere}</h2>
        ${med.rx ? `<div class="notice">📝 ${T.rxNote}</div>` : ''}
        ${list.map(s => {
          const has = s.stock[med.id] && s.open;
          return `<article class="card">
            <div class="card-head"><strong>${esc(providerName(s))}</strong><span class="badge ${has ? 'ok' : 'bad'}">${has ? T.available : T.notAvailable}</span></div>
            <div class="meta">📍 ${distLabel(distTo(s.village))} · ${esc(villageName(s.village))}${s.delivery ? ' · 🛵 ' + T.homeDelivery : ''}${s.open ? '' : ' · ' + T.closed}</div>
            <div class="actions"><a class="btn green" href="tel:${esc(s.phone)}">📞 ${T.callShop}</a></div>
          </article>`;
        }).join('')}
        <button class="btn ghost" data-a="clearMed">${T.whichMedicine}</button>
        <p class="fine">${T.demoNote}</p>`)
    };
  };

  screens.emergency = function () {
    const doc = S.providers.filter(p => p.type === 'mbbs' && p.open).sort((a, b) => distTo(a.village) - distTo(b.village))[0];
    return {
      voice: 'emergency',
      html: `${header(T.emergencyTitle)}<main class="content center emergency">
        <div class="alarm">🚑</div>
        <p class="e-body">${T.emergencyBody}</p>
        <a class="btn danger huge" href="tel:108">📞 ${T.callAmbulance}</a>
        ${doc ? `<div class="card left">${'<strong>' + esc(providerName(doc)) + '</strong>'} ${typeBadge(doc.type)}
          <div class="meta">📍 ${distLabel(distTo(doc.village))}</div>
          <div class="actions"><a class="btn green" href="tel:${esc(doc.phone)}">📞 ${T.call}</a></div></div>` : ''}
        <button class="btn ghost" data-a="back">${T.back}</button>
      </main>`
    };
  };

  screens.settings = function () {
    const te = Voice.hasVoice();
    return {
      voice: 'settings',
      html: page(T.settings, `
        <h2 class="sub">${T.village}</h2>
        <div class="seg wrap">${VILLAGES.map(v => `<button class="${S.settings.village === v.id ? 'sel' : ''}" data-a="setVillage" data-id="${v.id}">${lbl(v)}</button>`).join('')}</div>
        <label class="field">${T.yourName}<input type="text" id="nameInput" value="${esc(S.settings.name)}" maxlength="40" autocomplete="off"></label>
        <button class="row-btn" data-a="go" data-s="lang"><span>🌐 ${T.language}</span><strong>${LANGS[LANG].label}</strong></button>
        <button class="row-btn" data-a="toggleVoice"><span>🔊 ${T.voiceHelp}</span><strong>${S.settings.voice ? T.on : T.off}</strong></button>
        ${!te ? `<div class="notice">${T.noVoice}</div>` : ''}
        <button class="row-btn" data-a="help"><span>🎬 ${T.replayIntro}</span><strong>▶</strong></button>
        <button class="row-btn" data-a="who"><span>🧑‍⚕️ ${T.providerView}</span><strong>›</strong></button>
        <button class="row-btn danger-t" data-a="resetData"><span>🗑️ ${T.resetData}</span><strong>›</strong></button>
        ${Store.persistent ? '' : `<div class="notice">${T.storageBlocked}</div>`}`)
    };
  };

  screens.who = function () {
    return {
      voice: null,
      html: page(T.chooseProvider, `
        ${S.providers.map(p => `<button class="row-btn" data-a="dash" data-id="${p.id}"><span>🩺 ${esc(providerName(p))}</span><strong>›</strong></button>`).join('')}
        ${S.pharmacies.map(p => `<button class="row-btn" data-a="dash" data-id="${p.id}"><span>💊 ${esc(providerName(p))}</span><strong>›</strong></button>`).join('')}`)
    };
  };

  screens.dash = function () {
    const id = S.settings.providerId;
    const prov = providerById(id);
    const shop = pharmacyById(id);
    const ent = prov || shop;
    if (!ent) return screens.who();
    let body = `<article class="card"><div class="card-head"><strong>${esc(providerName(ent))}</strong>${prov ? typeBadge(prov.type) : ''}</div>
      <div class="meta">${esc(villageName(ent.village))}</div></article>
      <button class="row-btn" data-a="toggleOpen"><span>🕘 ${T.openToday}</span><strong>${ent.open ? T.on : T.off}</strong></button>`;
    if (shop) {
      body += `<h2 class="sub">${T.stock}</h2>` + MEDICINES.map(m =>
        `<button class="row-btn" data-a="toggleStock" data-id="${m.id}"><span>${m.icon} ${lbl(m)}</span><strong class="${shop.stock[m.id] ? 'ok-t' : 'bad-t'}">${shop.stock[m.id] ? T.available : T.notAvailable}</strong></button>`).join('');
    } else {
      const reqs = S.bookings.filter(b => b.pid === ent.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      body += `<h2 class="sub">${T.requests}</h2>` + (reqs.length ? reqs.map(b => `<article class="card ${b.status !== 'booked' ? 'dim' : ''}">
        <div class="card-head"><strong>${esc(b.name)}</strong><span class="meta">${esc(villageName(b.village))}</span></div>
        <div class="meta">📅 ${dateLabel(b.date)} · ${fmtTime(b.time)}${b.status !== 'booked' ? ' · ' + (b.status === 'done' ? T.done : T.cancelled) : ''}</div>
        ${b.status === 'booked' ? `<div class="actions"><button class="btn green" data-a="doneBk" data-id="${b.id}">✓ ${T.done}</button><button class="btn ghost" data-a="cancelBk" data-id="${b.id}">✖ ${T.cancel}</button></div>` : ''}
      </article>`).join('') : `<p class="muted">${T.noRequests}</p>`);
    }
    return { voice: 'dash', html: page(T.dashTitle, body) };
  };

  /* ---------- render ---------- */

  function render(speak) {
    const r = screens[nav.screen](nav.params);
    app.innerHTML = r.html;
    app.dataset.screen = nav.screen;
    window.scrollTo(0, 0);
    currentVoice = r.voice;
    if (r.after) r.after();
    if (speak !== false && interacted && r.voice) Voice.say(r.voice);
  }

  /* ---------- intro tour ---------- */

  function showStep(i) {
    introStep = i;
    const last = i === TOUR.length - 1;
    const icon = document.getElementById('tourIcon');
    if (!icon) return;
    icon.textContent = TOUR[i].icon;
    document.getElementById('tourText').textContent = TOUR[i].text;
    document.getElementById('dots').innerHTML = TOUR.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    document.getElementById('introNext').textContent = last ? T.start : T.next;
  }

  async function playTour() {
    const token = ++tourToken;
    Voice.stop();
    if (introStep === 0) await Voice.say('intro');
    for (let i = introStep; i < TOUR.length; i++) {
      if (token !== tourToken) return;
      showStep(i);
      await Voice.say(TOUR[i].voice);
      await new Promise(r => setTimeout(r, 600));
    }
    if (token === tourToken) finishIntro();
  }

  function finishIntro() {
    const replay = nav.stack.length > 0;
    S.settings.introSeen = true;
    Store.save();
    introStep = 0;
    if (replay) goBack();
    else resetTo(S.settings.village ? 'home' : 'setup');
  }

  /* ---------- voice search ---------- */

  function matches(text, words) {
    return words.some(w => /^[\x00-\x7f]+$/.test(w)
      ? new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text)
      : text.includes(w));
  }

  function handleVoice(text) {
    const t = text.toLowerCase();
    if (matches(t, EMERGENCY_KW) || RED_FLAGS.some(f => matches(t, f.kw))) return go('emergency');
    const med = MEDICINES.find(m => matches(t, m.kw));
    if (med) return go('meds', { med: med.id });
    const sym = SYMPTOMS.find(s => s.id !== 'other' && matches(t, s.kw));
    if (sym) return go('providers', { symptom: sym.id });
    if (matches(t, ['మందు', 'మందులు', 'మాత్ర', 'medicine', 'tablet'])) return go('meds');
    if (matches(t, ['డాక్టర్', 'వైద్యుడు', 'doctor'])) return go('symptoms');
    toast(T.notUnderstood);
  }

  function startMic() {
    if (!Voice.canListen()) { toast(T.noMic); return; }
    Voice.listen(handleVoice, st => {
      listeningEl.hidden = st !== 'listening';
      if (st === 'error') toast(T.micError);
      if (st === 'unsupported') toast(T.noMic);
    });
  }

  /* ---------- bookings ---------- */

  function createBooking() {
    const p = nav.params;
    if (!p.time) { toast(T.chooseTime); return; }
    const date = isoDate(p.day ?? 0);
    if (S.bookings.some(b => b.pid === p.pid && b.date === date && b.time === p.time && b.status === 'booked')) {
      toast(T.slotTaken);
      return;
    }
    const b = {
      id: 'b' + Date.now(), pid: p.pid, date, time: p.time, status: 'booked',
      name: S.settings.name || T.guest, village: S.settings.village, createdAt: Date.now()
    };
    S.bookings.push(b);
    Store.save();
    nav.screen = 'confirmed';
    nav.params = { bid: b.id };
    render();
  }

  /* ---------- actions ---------- */

  const actions = {
    go: d => go(d.s),
    home: () => resetTo('home'),
    setLang: d => {
      S.settings.lang = d.id;
      Store.save();
      setLang(d.id);
      if (nav.stack.length) goBack();
      else resetTo(!S.settings.introSeen ? 'intro' : (S.settings.village ? 'home' : 'setup'));
    },
    back: goBack,
    help: () => { introStep = 0; go('intro'); },
    speak: () => { if (currentVoice) Voice.say(currentVoice); else if (nav.screen === 'intro') playTour(); },
    mic: startMic,
    emergency: () => go('emergency'),
    symptom: d => go('providers', { symptom: d.id }),
    pickVillage: d => { S.settings.village = d.id; Store.save(); render(false); },
    setupDone: () => {
      if (!S.settings.village) { toast(T.chooseVillage); return; }
      resetTo('home');
    },
    setVillage: d => { S.settings.village = d.id; Store.save(); render(false); },
    book: d => go('book', { pid: d.id, day: 0, time: null }),
    day: d => { nav.params.day = Number(d.d); nav.params.time = null; render(false); },
    slot: d => { nav.params.time = d.t; render(false); },
    slotTaken: () => toast(T.slotTaken),
    confirm: createBooking,
    cancelBk: d => { const b = S.bookings.find(x => x.id === d.id); if (b) { b.status = 'cancelled'; Store.save(); render(false); } },
    doneBk: d => { const b = S.bookings.find(x => x.id === d.id); if (b) { b.status = 'done'; Store.save(); render(false); } },
    med: d => { nav.params = { med: d.id }; render(); },
    clearMed: () => { nav.params = {}; render(); },
    toggleVoice: () => {
      S.settings.voice = !S.settings.voice;
      Voice.enabled = S.settings.voice;
      if (!Voice.enabled) Voice.stop();
      Store.save();
      render(false);
    },
    who: () => go('who'),
    dash: d => { S.settings.providerId = d.id; Store.save(); go('dash'); },
    toggleOpen: () => {
      const ent = providerById(S.settings.providerId) || pharmacyById(S.settings.providerId);
      if (ent) { ent.open = !ent.open; Store.save(); render(false); }
    },
    toggleStock: d => {
      const shop = pharmacyById(S.settings.providerId);
      if (shop) { shop.stock[d.id] = !shop.stock[d.id]; Store.save(); render(false); }
    },
    resetData: () => {
      if (!confirm(T.resetConfirm)) return;
      Object.assign(S, Store.reset());
      Voice.enabled = true;
      introStep = 0;
      setLang('te');
      resetTo('lang');
    },
    introPlay: playTour,
    introNext: () => {
      tourToken++;
      Voice.stop();
      if (introStep >= TOUR.length - 1) { finishIntro(); return; }
      showStep(introStep + 1);
      Voice.say(TOUR[introStep].voice);
    },
    introSkip: finishIntro
  };

  /* ---------- events ---------- */

  document.addEventListener('pointerdown', () => { interacted = true; }, { once: true });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    interacted = true;
    const fn = actions[el.dataset.a];
    if (fn) fn(el.dataset, el);
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'nameInput') {
      S.settings.name = e.target.value.trim();
      Store.save();
    }
  });

  if ('speechSynthesis' in window) {
    speechSynthesis.onvoiceschanged = () => { if (nav.screen === 'settings') render(false); };
  }

  render(false);
})();
