import { applyI18n, setLang, t, tl, formatTime, rankName, getLang } from './i18n.js';
import { MISSIONS } from './missions.js';
import { OPERATORS, WEAPONS, PRIMARY_IDS, SECONDARY_IDS, TIPS } from './content.js';
import { writeSave, defaultSave } from './save.js';

export class UI {
  constructor() {
    this.game = null;
    this.toastT = 0;
    this.numPool = [];
  }

  bind(game) {
    this.game = game;
    setLang(game.save.settings.lang || 'mn');
    applyI18n();
    this.buildCompass();
    this.syncSettings();
    this.paintCareer();
    const q = (id) => document.getElementById(id);
    q('splash-go').onclick = () => { game.audio.ensure(); game.save.seenSplash = true; writeSave(game.save); this.show('menu'); };
    q('btn-quick').onclick = () => { game.audio.ensure(); game.input.requestLock(); game.startMission('nightfall', true); };
    q('btn-campaign').onclick = () => { this.renderMissions(); this.show('missions'); };
    q('btn-range').onclick = () => { game.audio.ensure(); game.input.requestLock(); game.startMission('range'); };
    q('btn-controls').onclick = () => { q('controls-body').textContent = t('controlsBody'); this.showOverlay('controls'); };
    q('controls-close').onclick = () => this.hideOverlay('controls');
    q('btn-settings').onclick = () => this.showOverlay('settings');
    q('btn-pause-settings').onclick = () => this.showOverlay('settings');
    q('set-close').onclick = () => this.hideOverlay('settings');
    q('missions-back').onclick = () => this.show('menu');
    q('brief-back').onclick = () => this.show('missions');
    q('btn-deploy').onclick = () => { game.audio.ensure(); game.input.requestLock(); game.startMission(this.briefId); };
    q('btn-resume').onclick = () => game.resume();
    q('btn-abort').onclick = () => game.abort();
    q('btn-retry').onclick = () => game.startMission(game.missionDef?.id || 'nightfall');
    q('btn-next').onclick = () => {
      const i = MISSIONS.findIndex((m) => m.id === game.missionDef?.id);
      const next = MISSIONS[i + 1];
      if (next) { this.openBrief(next.id); this.show('briefing'); }
      else game.abort();
    };
    q('btn-res-menu').onclick = () => game.abort();
    q('btn-full').onclick = () => document.documentElement.requestFullscreen?.();
    q('buy-skip').onclick = () => { if (game.waves) game.waves.wait = 0; game.closeBuy(); };
    q('set-reset').onclick = () => {
      const lang = game.save.settings.lang;
      game.save = defaultSave();
      game.save.settings.lang = lang;
      game.settings = game.save.settings;
      writeSave(game.save);
      this.paintCareer();
      this.toast(t('reset'));
    };
    document.querySelectorAll('.lang').forEach((btn) => {
      btn.onclick = () => {
        setLang(btn.dataset.lang);
        game.settings.lang = btn.dataset.lang;
        game.save.settings.lang = btn.dataset.lang;
        writeSave(game.save);
        applyI18n();
        this.paintCareer();
        this.markLang();
      };
    });
    this.bindSettings();
    this.bindTouch();
    this.markLang();
    if (!game.save.seenSplash) this.show('splash');
    else this.show('menu');
    const tips = TIPS[getLang()] || TIPS.en;
    q('load-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
    q('menu-lede').textContent = t('splashBody');
  }

  markLang() {
    document.querySelectorAll('.lang').forEach((b) => b.classList.toggle('on', b.dataset.lang === getLang()));
  }

  show(name) {
    for (const id of ['splash', 'menu', 'missions', 'briefing', 'pause', 'results', 'loading']) {
      document.getElementById(id).classList.toggle('hidden', id !== name);
    }
    document.getElementById('hud').classList.toggle('hidden', name !== 'hud');
    if (name === 'menu') this.paintCareer();
    if (name === 'loading') {
      const tips = TIPS[getLang()] || TIPS.en;
      document.getElementById('load-tip').textContent = tips[Math.floor(Math.random() * tips.length)];
      const op = OPERATORS.find((o) => o.id === (this.game.loadout?.op || 'raven')) || OPERATORS[0];
      const img = document.getElementById('load-portrait');
      if (img) img.src = op.portrait;
    }
  }

  showOverlay(id) { document.getElementById(id).classList.remove('hidden'); }
  hideOverlay(id) { document.getElementById(id).classList.add('hidden'); }

  paintCareer() {
    const s = this.game.save;
    const op = OPERATORS.find((o) => o.id === (s.loadout?.op || 'raven')) || OPERATORS[0];
    const portrait = document.getElementById('dossier-portrait');
    if (portrait) {
      portrait.src = op.portrait;
      portrait.alt = op.name;
    }
    const opName = document.getElementById('dossier-op');
    if (opName) opName.textContent = `${op.name}  ·  ${tl(op.role)}`;
    const rank = rankName(s.xp || 0);
    document.getElementById('career-rank').textContent = `${t('level')} ${rank.level}  ${rank.name}`;
    const acc = s.stats.shots ? Math.round((s.stats.hits / s.stats.shots) * 100) : 0;
    document.getElementById('career-stats').textContent = `${t('kills')} ${s.stats.kills}   ${t('accuracy')} ${acc}%   ${t('xp')} ${s.xp}`;
    const stars = MISSIONS.reduce((n, m) => n + ((s.missions[m.id]?.stars) || 0), 0);
    document.getElementById('career-ops').textContent = `${t('stars')} ${stars} / ${MISSIONS.length * 3}`;
  }

  renderMissions() {
    const root = document.getElementById('mission-list');
    root.innerHTML = '';
    for (const m of MISSIONS) {
      const rec = this.game.save.missions[m.id] || {};
      const btn = document.createElement('button');
      btn.className = 'mcard';
      const stars = '★★★'.slice(0, rec.stars || 0) + '☆☆☆'.slice(rec.stars || 0);
      btn.innerHTML = `<span class="type">${tl(m.type)}  ·  ${tl(m.place)}</span><h3>${tl(m.name)}</h3><p>${tl(m.briefing).slice(0, 110)}…</p><span class="stars">${stars}</span>`;
      btn.onclick = () => { this.openBrief(m.id); this.show('briefing'); };
      root.appendChild(btn);
    }
  }

  openBrief(id) {
    this.briefId = id;
    const m = MISSIONS.find((x) => x.id === id);
    this.game.loadout = { ...this.game.save.loadout, ...m.suggest, ...(this.game.save.loadout.primary ? this.game.save.loadout : m.suggest) };
    if (!this.game.save.missions[id]) this.game.loadout = { ...m.suggest, secondary: m.suggest.secondary || 'm19' };
    document.getElementById('brief-name').textContent = tl(m.name);
    document.getElementById('brief-place').textContent = tl(m.place);
    document.getElementById('brief-text').textContent = tl(m.briefing);
    const ol = document.getElementById('brief-objs');
    ol.innerHTML = '';
    for (const step of m.steps) {
      const li = document.createElement('li');
      li.textContent = tl(step.text);
      ol.appendChild(li);
    }
    if (m.optional) {
      const li = document.createElement('li');
      li.textContent = `${t('optional')}: ${tl(m.optional.text)}`;
      ol.appendChild(li);
    }
    this.renderLoadout();
  }

  renderLoadout() {
    const load = this.game.loadout;
    const ops = document.getElementById('op-list');
    ops.innerHTML = '';
    const cur = OPERATORS.find((o) => o.id === load.op) || OPERATORS[0];
    const hero = document.getElementById('op-hero');
    if (hero) {
      hero.innerHTML = `<img src="${cur.portrait}" alt="${cur.name}" /><div><b>${cur.name}</b><em>${tl(cur.role)}</em><p>${tl(cur.perk)}</p></div>`;
    }
    for (const op of OPERATORS) {
      const b = document.createElement('button');
      b.className = 'chip opcard' + (load.op === op.id ? ' on' : '');
      b.innerHTML = `<img src="${op.portrait}" alt="" /><span>${op.name}</span>`;
      b.style.borderLeft = `3px solid ${op.color}`;
      b.onclick = () => { load.op = op.id; this.game.save.loadout = { ...load }; writeSave(this.game.save); this.paintCareer(); this.renderLoadout(); };
      b.title = tl(op.perk);
      ops.appendChild(b);
    }
    const fill = (el, ids, key) => {
      el.innerHTML = '';
      for (const id of ids) {
        const w = WEAPONS[id];
        const b = document.createElement('button');
        b.className = 'chip' + (load[key] === id ? ' on' : '');
        b.innerHTML = `${w.name}<small>${tl(w.desc).slice(0, 42)}</small>`;
        b.onclick = () => { load[key] = id; this.game.save.loadout = { ...load }; writeSave(this.game.save); this.renderLoadout(); };
        el.appendChild(b);
      }
    };
    fill(document.getElementById('primary-list'), PRIMARY_IDS, 'primary');
    fill(document.getElementById('secondary-list'), SECONDARY_IDS, 'secondary');
    const diffs = document.getElementById('diff-list');
    diffs.innerHTML = '';
    for (const id of ['easy', 'normal', 'hard']) {
      const b = document.createElement('button');
      b.className = 'chip' + (this.game.settings.difficulty === id ? ' on' : '');
      b.textContent = t(id);
      b.onclick = () => { this.game.settings.difficulty = id; this.game.save.settings.difficulty = id; writeSave(this.game.save); this.renderLoadout(); };
      diffs.appendChild(b);
    }
    this.game.save.loadout = { ...load };
    writeSave(this.game.save);
  }

  hud(s) {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el && el.textContent !== String(text)) el.textContent = text;
    };
    set('obj-text', s.objective || '');
    set('obj-sub', s.sub || '');
    set('hp-num', Math.max(0, Math.ceil(s.health)));
    set('ap-num', Math.ceil(s.armor));
    set('mag', s.mag);
    set('reserve', s.reserve === '' ? '' : `/ ${s.reserve}`);
    set('wname', s.name);
    set('firemode', t(s.mode));
    document.getElementById('hp-fill').style.width = `${Math.max(0, s.health)}%`;
    document.getElementById('ap-fill').style.width = `${Math.max(0, s.armor)}%`;
    document.getElementById('hp-fill').style.background = s.health < 32 ? '#ff3b4e' : '#d8efe4';
    document.getElementById('crosshair').style.setProperty('--gap', `${6 + (s.spread || 0) * 420}px`);
    document.getElementById('scope').classList.toggle('hidden', !s.ads);
    document.getElementById('crosshair').style.opacity = s.ads ? '0' : '1';
    document.getElementById('dmg').style.opacity = s.hurt || 0;
    document.getElementById('lowhp').classList.toggle('on', !!s.low);
    document.getElementById('reload-indicator').classList.toggle('on', !!s.reloading);
    const nades = document.getElementById('nades');
    nades.textContent = '◉'.repeat(s.grenades || 0);
    document.getElementById('fps').textContent = `${s.fps} FPS`;
    document.getElementById('cash-hud').textContent = s.cash ? `$ ${s.cash}` : '';
    document.getElementById('timer-hud').textContent = s.sub && s.sub.includes(':') ? '' : '';
    if (s.sub && /^\d/.test(s.sub) === false && s.objective) {
      /* sub already in obj-sub */
    }
    const hold = document.getElementById('holdbar');
    if (s.hold && s.hold.p > 0) {
      hold.classList.add('on');
      document.getElementById('hold-label').textContent = `${t('hold')} E · ${s.hold.text}`;
      document.getElementById('hold-fill').style.width = `${Math.round(s.hold.p * 100)}%`;
    } else hold.classList.remove('on');
    document.getElementById('interact-prompt').textContent = s.hold ? '' : (s.prompt || '');
    document.getElementById('hintbar').textContent = s.tutorial ? t('tutorialKeys') : '';
    document.body.classList.toggle('locked', !!s.locked);
    const op = OPERATORS.find((o) => o.id === s.op);
    const face = document.getElementById('op-hud');
    if (op && face && face.dataset.op !== op.id) {
      face.src = op.portrait;
      face.alt = op.name;
      face.dataset.op = op.id;
    }
    document.getElementById('lock-hint').classList.toggle('hidden', !s.fallback);
    document.getElementById('lock-hint').textContent = s.fallback ? t('lockHint') : '';
    const radio = document.getElementById('radio-line');
    radio.textContent = s.radio && s.radio.life > 0 ? `${s.radio.speaker}: ${s.radio.text}` : '';
    const feed = document.getElementById('killfeed');
    feed.innerHTML = (s.feed || []).map((f) => `<div><b>${t('you')}</b> ▸ ${f.name}${f.head ? ' · ' + t('head') : ''}</div>`).join('');
    this.drawMinimap(s);
    this.drawNumbers(s);
    this.drawOffscreen(s);
    const deg = ((-s.yaw * 180 / Math.PI) % 360 + 360) % 360;
    document.getElementById('compass-strip').style.transform = `translateX(${140 - deg * 3.2}px)`;
    const buy = document.getElementById('buy');
    if (buy && !buy.classList.contains('hidden')) {
      document.getElementById('buy-timer').textContent = s.wait ? `${t('intermission')} ${Math.ceil(s.wait)}` : t('waveStart');
      document.getElementById('buy-cash').textContent = `${t('cash')}  ${s.cash || 0}`;
    }
  }

  flashHit(head) {
    const el = document.getElementById('hitmarker');
    el.classList.toggle('head', !!head);
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  buildCompass() {
    const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let html = '';
    for (let k = 0; k < 3; k++) labels.forEach((l) => { html += `<b>${l}</b>`; });
    document.getElementById('compass-strip').innerHTML = html;
  }

  drawMinimap(s) {
    const c = document.getElementById('minimap');
    const ctx = c.getContext('2d');
    const w = c.width;
    ctx.clearRect(0, 0, w, w);
    ctx.save();
    ctx.translate(w / 2, w / 2);
    ctx.rotate(s.yaw);
    const scale = 3.1;
    ctx.strokeStyle = 'rgba(232,214,180,0.35)';
    ctx.lineWidth = 2;
    for (const b of s.boxes || []) {
      ctx.strokeRect((b.x - s.player.x - b.w / 2) * scale, (b.z - s.player.z - b.d / 2) * scale, b.w * scale, b.d * scale);
    }
    ctx.fillStyle = '#ff4455';
    for (const e of s.enemies || []) {
      if (!e.alive) continue;
      const dx = e.pos.x - s.player.x;
      const dz = e.pos.z - s.player.z;
      if (Math.hypot(dx, dz) > 34 * (s.player.radarMul || 1) && !e.alerted) continue;
      ctx.fillRect(dx * scale - 2, dz * scale - 2, 4, 4);
    }
    ctx.fillStyle = '#3ddea0';
    for (const h of s.hostages || []) {
      if (h.dead) continue;
      ctx.fillRect((h.pos.x - s.player.x) * scale - 2, (h.pos.z - s.player.z) * scale - 2, 4, 4);
    }
    if (s.beacon) {
      ctx.fillStyle = '#e8a317';
      ctx.beginPath();
      ctx.arc((s.beacon.x - s.player.x) * scale, (s.beacon.z - s.player.z) * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#7ddec8';
    ctx.beginPath();
    ctx.moveTo(w / 2, w / 2 - 6);
    ctx.lineTo(w / 2 - 4, w / 2 + 5);
    ctx.lineTo(w / 2 + 4, w / 2 + 5);
    ctx.fill();
  }

  drawNumbers(s) {
    const root = document.getElementById('dmg-nums');
    root.innerHTML = '';
    if (!s.numbers) return;
    for (const n of s.numbers) {
      const vec = this.project(n.x, n.y, n.z);
      if (!vec || vec.z > 1) continue;
      const el = document.createElement('span');
      el.textContent = n.text;
      if (n.head) el.className = 'head';
      el.style.left = `${vec.x * 100}%`;
      el.style.top = `${vec.y * 100}%`;
      el.style.opacity = Math.max(0, n.life);
      root.appendChild(el);
    }
  }

  project(x, y, z) {
    try {
      const cam = this.game.camera;
      if (!cam) return null;
      if (!this.game._proj) this.game._proj = new cam.position.constructor();
      const p = this.game._proj;
      p.set(x, y, z);
      p.project(cam);
      if (p.z > 1) return { z: 2 };
      return { x: p.x * 0.5 + 0.5, y: -p.y * 0.5 + 0.5, z: p.z };
    } catch {
      return null;
    }
  }

  drawOffscreen(s) {
    const el = document.getElementById('offscreen');
    if (!s.beacon || !this.game.camera) { el.classList.add('hidden'); return; }
    const p = this.project(s.beacon.x, 1.5, s.beacon.z);
    if (!p || (p.z < 1 && p.x > 0.05 && p.x < 0.95 && p.y > 0.08 && p.y < 0.92)) {
      el.classList.add('hidden');
      return;
    }
    let x = p.x - 0.5;
    let y = p.y - 0.5;
    if (!p || p.z > 1) { x = -x; y = -y; }
    const ang = Math.atan2(y, x);
    const cx = window.innerWidth / 2 + Math.cos(ang) * Math.min(window.innerWidth, window.innerHeight) * 0.36;
    const cy = window.innerHeight / 2 + Math.sin(ang) * Math.min(window.innerWidth, window.innerHeight) * 0.32;
    el.classList.remove('hidden');
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.style.transform = `rotate(${ang + Math.PI / 4}px)`;
  }

  toast(text) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1400);
  }

  radio(line) {
    if (!line) return;
    document.getElementById('radio-line').textContent = `${line.speaker}: ${line.text}`;
  }

  showDeath(on) {
    document.getElementById('death-banner').classList.toggle('hidden', !on);
  }

  showResults(stats, mission) {
    this.show('results');
    document.getElementById('res-kicker').textContent = mission ? tl(mission.name) : t('range');
    document.getElementById('res-title').textContent = stats.success ? t('complete') : t('failed');
    document.getElementById('res-stars').textContent = `${'★'.repeat(stats.stars)}${'☆'.repeat(Math.max(0, 3 - stats.stars))}`;
    document.getElementById('res-stars').className = 'stars';
    const reason = stats.reason === 'time' ? t('failTime') : stats.reason === 'truck' ? t('failTruck') : stats.reason === 'hostage' ? t('failHostage') : '';
    const cells = [
      [t('time'), formatTime(stats.time)],
      [t('kills'), stats.kills],
      [t('headshots'), stats.headshots],
      [t('accuracy'), `${stats.accuracy}%`],
      [t('deaths'), stats.deaths],
      [t('alerts'), stats.alerts],
    ];
    document.getElementById('res-stats').innerHTML = cells.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('') + (reason ? `<div><b>—</b><span>${reason}</span></div>` : '');
    const badges = [];
    if (stats.alerts === 0 && stats.success) badges.push(t('badgeGhost'));
    if (stats.accuracy >= 45 && stats.kills >= 4) badges.push(t('badgeSharp'));
    if (stats.damage === 0 && stats.success) badges.push(t('badgeClean'));
    document.getElementById('res-badges').innerHTML = badges.map((b) => `<span class="badge">${b}</span>`).join('');
    document.getElementById('btn-next').style.display = mission && MISSIONS.some((m, i) => MISSIONS[i - 1]?.id === mission.id || (MISSIONS[i]?.id === mission.id && MISSIONS[i + 1])) ? '' : 'none';
    const i = MISSIONS.findIndex((m) => m.id === mission?.id);
    document.getElementById('btn-next').style.display = i >= 0 && MISSIONS[i + 1] ? '' : 'none';
  }

  showBuy(game) {
    this.showOverlay('buy');
    document.getElementById('buy-cash').textContent = `${t('cash')}  ${game.cash}`;
    document.getElementById('buy-timer').textContent = game.waves ? `${t('intermission')} ${Math.ceil(game.waves.wait)}` : '';
    const list = document.getElementById('buy-list');
    list.innerHTML = '';
    const items = [
      ['ammo', `${t('ammo')} · 160`],
      ['armor', `${t('armor')} · 280`],
      ['med', `${t('med')} · 220`],
      ['grenade', `${t('grenade')} · 200`],
      ...PRIMARY_IDS.map((id) => [`w:${id}`, `${WEAPONS[id].name} · ${WEAPONS[id].price || 0}`]),
    ];
    for (const [id, label] of items) {
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = label;
      b.onclick = () => game.buy(id);
      list.appendChild(b);
    }
  }

  hideBuy() { this.hideOverlay('buy'); }

  crash(err) {
    const el = document.getElementById('crash');
    el.classList.remove('hidden');
    el.textContent = String(err?.stack || err?.message || err);
  }

  bindSettings() {
    const g = this.game;
    const s = g.settings;
    const sens = document.getElementById('set-sens');
    const fov = document.getElementById('set-fov');
    const vol = document.getElementById('set-vol');
    const music = document.getElementById('set-music');
    sens.value = s.sens;
    fov.value = s.fov;
    vol.value = s.vol;
    music.value = s.music;
    document.getElementById('set-invert').checked = !!s.invert;
    document.getElementById('set-shake').checked = s.shake !== false;
    document.getElementById('set-numbers').checked = s.numbers !== false;
    document.getElementById('set-shadows').checked = s.shadows !== false;
    const save = () => writeSave(g.save);
    sens.oninput = () => { s.sens = Number(sens.value); save(); };
    fov.oninput = () => { s.fov = Number(fov.value); if (g.camera && g.state !== 'playing') { g.camera.fov = s.fov; g.camera.updateProjectionMatrix(); } save(); };
    vol.oninput = () => { s.vol = Number(vol.value); g.audio.setVolumes(s.vol, s.music); save(); };
    music.oninput = () => { s.music = Number(music.value); g.audio.setVolumes(s.vol, s.music); save(); };
    document.getElementById('set-invert').onchange = (e) => { s.invert = e.target.checked; save(); };
    document.getElementById('set-shake').onchange = (e) => { s.shake = e.target.checked; save(); };
    document.getElementById('set-numbers').onchange = (e) => { s.numbers = e.target.checked; save(); };
    document.getElementById('set-shadows').onchange = (e) => {
      s.shadows = e.target.checked;
      g.renderer.shadowMap.enabled = s.shadows;
      save();
    };
    const qbtn = document.getElementById('set-quality');
    const paintQ = () => { qbtn.textContent = `${t('quality')}: ${t(s.quality === 'low' ? 'low' : 'high')}`; };
    paintQ();
    qbtn.onclick = () => { s.quality = s.quality === 'low' ? 'high' : 'low'; paintQ(); g.resize(); save(); };
  }

  syncSettings() { /* filled in bindSettings */ }

  bindTouch() {
    const input = this.game.input;
    window.addEventListener('touchstart', () => document.body.classList.add('touch'), { once: true });
    document.querySelectorAll('#touch button').forEach((btn) => {
      const kind = btn.dataset.touch;
      const down = (e) => {
        e.preventDefault();
        if (kind === 'jump') input.keys.add('Space');
        else if (kind === 'reload') input.keys.add('KeyR');
        else if (kind === 'use') input.keys.add('KeyE');
        else if (kind === 'crouch') input.keys.add('KeyC');
        else input.touch.buttons.add(Number(kind));
      };
      const up = () => {
        input.keys.delete('Space');
        input.keys.delete('KeyR');
        input.keys.delete('KeyE');
        input.keys.delete('KeyC');
        input.touch.buttons.delete(Number(kind));
      };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
    });
  }
}
