import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WEAPONS, OPERATORS, DIFFICULTY, TIPS } from './content.js';
import { getLang, t, tl, formatTime } from './i18n.js';
import { loadSave, writeSave } from './save.js';
import { AudioBus } from './audio.js';
import { Input } from './input.js';
import { getTextures } from './textures.js';
import { buildLevelView, updateLamps, updateSun } from './level.js';
import { compileLevel } from './levelcompile.js';
import { getMap } from './maps/index.js';
import { ViewModel, sleeveFor } from './weapons.js';
import { Effects } from './effects.js';
import { Enemy, Hostage, Truck } from './entities.js';
import { getMission, MissionRunner } from './missions.js';
import { moveBody, rayCapsule, damp } from './physics.js';
import { createProp } from './props.js';
import { buildHuman } from './humans.js';

const SLEEVE = { raven: 0x6a3030, ghost: 0x1e3330, iron: 0x4a4034, hawk: 0x243044 };

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.save = loadSave();
    this.settings = this.save.settings;
    this.state = 'boot';
    this.input = new Input(canvas);
    this.audio = new AudioBus();
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = this.settings.shadows !== false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.envMap = null;
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (err) {
      console.warn(err);
    }
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.menuScene = new THREE.Scene();
    this.menuCam = new THREE.PerspectiveCamera(60, 1, 0.1, 80);
    this.buildMenu();
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.08, 220);
    this.camera.rotation.order = 'YXZ';
    this.resize();
    this.state = 'menu';
    this.view = null;
    this.scene = null;
    this.level = null;
    this.player = null;
    this.enemies = [];
    this.hostages = [];
    this.grenades = [];
    this.pickups = [];
    this.targets = [];
    this.destructibles = [];
    this.mission = null;
    this.spec = null;
    this.world = null;
    this.nav = null;
    this.effects = null;
    this.loadout = { ...this.save.loadout };
    this.diff = DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal;
    this.ignoreLock = false;
    this.input.onLockChange = (locked) => {
      document.body.classList.toggle('locked', !!locked);
      if (!locked && this.state === 'playing' && !this.ignoreLock && !this.input.fallback && !this.buyOpen) this.pause();
    };
    canvas.addEventListener('mousedown', () => {
      if (this.state === 'playing' && !this.input.locked && !this.buyOpen) this.input.requestLock();
    });
    this.acc = 0;
    this.shake = 0;
    this.radio = [];
    this.numbers = [];
    this.killsFeed = [];
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = this.settings?.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.6);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    if (this.menuCam) {
      this.menuCam.aspect = w / h;
      this.menuCam.updateProjectionMatrix();
    }
  }

  buildMenu() {
    const scene = this.menuScene;
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.Fog(0x07090e, 8, 18);
    scene.environment = this.envMap;
    scene.add(new THREE.HemisphereLight(0x9ab4d8, 0x2a1c12, 1.6));
    const sun = new THREE.DirectionalLight(0xffd2b0, 2.8);
    sun.position.set(4, 8, 3);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7ddec8, 1.6);
    rim.position.set(-4, 3, -2);
    scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6, 48),
      new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.72, metalness: 0.28 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const op = this.save.loadout?.op || 'raven';
    const kind = op === 'iron' ? 'heavy' : op === 'ghost' ? 'sniper' : op === 'hawk' ? 'sniper' : 'soldier';
    const actor = buildHuman(kind, op === 'hawk' ? 4 : 1);
    actor.position.y = 0;
    scene.add(actor);
    const spot = new THREE.SpotLight(0xf0a202, 48, 14, 0.45, 0.45, 1);
    spot.position.set(1.6, 4.2, 2.2);
    spot.target.position.set(0, 1.15, 0);
    scene.add(spot);
    scene.add(spot.target);
    this.menuSpin = actor;
  }

  loop() {
    requestAnimationFrame(this.loop);
    if (this.crashed) return;
    try {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.fps = Math.round(1 / Math.max(dt, 0.001));
      this.input.pollGamepad();
      if (this.state === 'playing') this.updatePlay(dt);
      else if (this.scene && (this.state === 'paused' || this.state === 'results' || this.state === 'loading')) this.renderPlay();
      else this.updateMenu(dt);
      this.input.endFrame();
    } catch (err) {
      this.crashed = true;
      console.error(err);
      this.ui.crash(err);
    }
  }

  updateMenu(dt) {
    this.menuSpin.rotation.y += dt * 0.22;
    const t = performance.now() * 0.00012;
    this.menuCam.position.set(Math.sin(t) * 2.35, 1.28, Math.cos(t) * 2.35);
    this.menuCam.lookAt(0, 1.12, 0);
    this.renderer.render(this.menuScene, this.menuCam);
  }

  async startMission(id, quick = false) {
    if (this.loading) return;
    this.loading = true;
    try {
    const def = id === 'range' ? null : getMission(id);
    this.audio.ensure();
    this.ui.show('loading');
    await frame();
    this.clearPlay();
    const mapId = def ? def.map : 'range';
    this.spec = getMap(mapId);
    const compiled = compileLevel(this.spec);
    this.world = compiled.world;
    this.nav = compiled.nav;
    this.level = buildLevelView(this.spec);
    this.scene = this.level.scene;
    this.scene.environment = this.envMap;
    this.effects = new Effects(this.scene, getTextures());
    this.effects.enableRain(this.spec.sky === 'storm');
    this.audio.setRain(this.spec.sky === 'storm');
    this.renderer.toneMappingExposure = this.level.sky.exposure;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    this.scene.add(this.camera);
    this.view = new ViewModel(this.camera);
    const vmLight = new THREE.PointLight(0xfff6ea, 8, 4, 2);
    vmLight.layers.set(1);
    this.camera.add(vmLight);
    this.flash = new THREE.SpotLight(0xfff4d2, 0, 32, 0.5, 0.35, 1);
    this.flash.position.set(0.12, -0.08, 0);
    this.flash.target.position.set(0, -0.1, -1);
    this.camera.add(this.flash, this.flash.target);
    this.mode = def ? 'mission' : 'range';
    this.missionDef = def;
    this.mission = def ? new MissionRunner(def, this) : null;
    this.diff = DIFFICULTY[this.settings.difficulty] || DIFFICULTY.normal;
    this.resetStats();
    this.makePlayer();
    this.bootWeapons();
    this.spawnWorldActors();
    if (this.mission) this.mission.update(0);
    this.checkpoint();
    this.state = 'playing';
    this.dead = false;
    this.buyOpen = false;
    this.paused = false;
    this.ui.show('hud');
    document.body.classList.add('playing');
    this.audio.setMood('tension');
    if (!quick) this.say('CONTROL', def?.briefing || { en: 'Range is hot.', mn: 'Талбай халуун.' });
    if (def?.horde) this.openBuy();
    else {
      this.ignoreLock = true;
      if (!this.input.locked) this.input.requestLock();
      setTimeout(() => { this.ignoreLock = false; }, 700);
    }
    this.scene.updateMatrixWorld(true);
    } catch (err) {
      console.error(err);
      this.state = 'menu';
      document.body.classList.remove('playing');
      this.clearPlay();
      this.ui.show('menu');
      this.ui.crash(err);
    } finally {
      this.loading = false;
    }
  }

  resetStats() {
    this.kills = 0;
    this.shots = 0;
    this.hits = 0;
    this.headshots = 0;
    this.deaths = 0;
    this.alerts = 0;
    this.damageTaken = 0;
    this.meleeKills = 0;
    this.barrelKills = 0;
    this.playTime = 0;
    this.cash = 0;
    this.grenadeCount = 2;
    this.waves = null;
    this.truck = null;
    this.holdPrompt = null;
    this.bombProgress = { bombA: 0, bombB: 0 };
    this.queue = [];
    this.simTime = 0;
    this.optional = 0;
    this.numbers = [];
    this.killsFeed = [];
    this.radio = [];
    this.ending = false;
    this.deadTimer = 0;
    this.fireCd = 0;
    this.reloadT = 0;
    this.reloading = false;
    this.recoilP = 0;
    this.recoilY = 0;
    this.spray = 0;
    this.idle = 1;
    this.pump = 0;
    this.grenadeHold = false;
    this.noiseTimer = 0;
    this.stepT = 0;
    this.slot = 'primary';
  }

  makePlayer() {
    const s = this.spec.player;
    const op = this.loadout.op || 'raven';
    this.player = {
      x: s.x, y: s.y || 0, z: s.z,
      vx: 0, vy: 0, vz: 0,
      yaw: s.yaw || 0, pitch: 0,
      r: 0.36, h: 1.72, eye: 1.58,
      health: 100, armor: op === 'iron' ? 50 : 0,
      crouch: 0, grounded: true, invuln: 1.2, hurt: 0, hurtLock: 0,
      noise: 0, op, flashOn: this.spec.sky !== 'day',
      speedMul: op === 'raven' ? 1.12 : op === 'iron' ? 0.9 : 1,
      stealth: op === 'ghost' ? 1.45 : 1,
      noiseMul: op === 'ghost' ? 0.55 : 1,
      recoilMul: op === 'hawk' ? 0.72 : 1,
      hsMul: op === 'hawk' ? 1.15 : 1,
      explMul: op === 'iron' ? 0.55 : 1,
      radarMul: op === 'ghost' ? 1.45 : 1,
      adsMul: op === 'hawk' ? 1.35 : 1,
      swapMul: op === 'raven' ? 1.45 : 1,
    };
    this.camera.position.set(s.x, 1.58, s.z);
    this.camera.rotation.y = s.yaw || 0;
  }

  bootWeapons() {
    this.ammo = {};
    for (const [id, w] of Object.entries(WEAPONS)) this.ammo[id] = { mag: w.mag, reserve: w.reserve };
    this.weapons = {
      primary: this.loadout.primary || 'vx4',
      secondary: this.loadout.secondary || 'm19',
      melee: 'knife',
    };
    this.slot = 'primary';
    this.view.equip(this.weapons.primary, SLEEVE[this.player.op]);
  }

  spawnWorldActors() {
    this.enemies = [];
    this.hostages = [];
    this.pickups = [];
    if (this.spec.truck) {
      this.truck = new Truck(this.spec.truck);
      this.scene.add(this.truck.group);
    }
    this.targets = [];
    this.destructibles = [];
    for (const def of this.spec.enemies || []) this.spawnEnemy(def);
    for (const def of this.spec.hostages || []) {
      const h = new Hostage(def);
      this.hostages.push(h);
      this.scene.add(h.group);
    }
    for (const prop of this.spec.props || []) {
      if (prop.t === 'med' || prop.t === 'armor' || prop.t === 'ammo') {
        this.pickups.push({ ...prop, taken: false, t: 0 });
      }
      if (prop.explosive || prop.t === 'locker' || prop.t === 'device') {
        const mesh = this.level.propMeshes.find((m) => m.userData.prop === prop);
        if (!mesh) continue;
        const obj = {
          prop, mesh, hp: prop.t === 'locker' ? 36 : 20, alive: true, id: prop.id,
          hitMeshes: [],
          takeDamage: (amount, info) => this.damageProp(obj, amount, info),
        };
        mesh.traverse((o) => {
          if (o.isMesh) {
            o.userData.owner = obj;
            obj.hitMeshes.push(o);
          }
        });
        this.destructibles.push(obj);
      }
      if (prop.t === 'target') {
        const mesh = this.level.propMeshes.find((m) => m.userData.prop === prop);
        if (!mesh) continue;
        const obj = {
          prop, mesh, alive: true, rest: 0,
          hitMeshes: [],
          takeDamage: (amount, info) => this.hitTarget(obj, info),
        };
        mesh.traverse((o) => {
          if (o.isMesh && o !== mesh.children[0]) {
            o.userData.owner = obj;
            o.userData.zone = o.position.y > 1.5 ? 'head' : 'body';
            obj.hitMeshes.push(o);
          }
        });
        this.targets.push(obj);
      }
    }
  }

  spawnEnemy(def) {
    const e = new Enemy(def, this.diff);
    this.enemies.push(e);
    this.scene.add(e.group);
    return e;
  }

  clearPlay() {
    if (this.camera) {
      for (const child of [...this.camera.children]) this.camera.remove(child);
    }
    if (this.level) this.level.dispose();
    this.level = null;
    this.scene = null;
    this.view = null;
    this.effects = null;
    this.truck = null;
    this.enemies = [];
    this.grenades = [];
    this.hostages = [];
    this.waves = null;
  }

  updatePlay(dt) {
    this.simTime += dt;
    this.playTime += dt;
    this.queue = this.queue.filter((ev) => {
      if (this.simTime >= ev.t) { ev.fn(); return false; }
      return true;
    });
    if (this.dead) {
      this.deadTimer -= dt;
      this.renderPlay();
      if (this.deadTimer <= 0) this.respawn();
      return;
    }
    if (this.ending) {
      this.renderPlay();
      return;
    }
    this.holdPrompt = null;
    this.interactPrompt = '';
    this.look(dt);
    this.acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 4) {
      this.movePlayer(step);
      this.acc -= step;
      n++;
    }
    this.scene?.updateMatrixWorld(true);
    this.updateCombat(dt);
    this.updateActors(dt);
    this.updateMission(dt);
    this.handleInteract(dt);
    this.updatePickups(dt);
    for (const f of this.killsFeed) f.t -= dt;
    this.killsFeed = this.killsFeed.filter((f) => f.t > 0);
    for (const n of this.numbers) n.life -= dt;
    this.numbers = this.numbers.filter((n) => n.life > 0);
    for (const r of this.radio) r.life -= dt;
    this.radio = this.radio.filter((r) => r.life > 0);
    this.effects?.update(dt, this.player);
    this.updateCamera(dt);
    this.updateMood();
    this.ui.hud(this.hudSnapshot());
    this.renderPlay();
    if (this.input.pressed('Escape') || this.input.gpPressed(9)) {
      if (this.buyOpen) this.closeBuy();
      else this.pause();
    }
    if (this.input.pressed('KeyB') && this.mode === 'mission' && this.missionDef?.horde && this.waves?.waiting) this.openBuy();
  }

  look(dt) {
    const p = this.player;
    const look = this.input.consumeLook();
    const sens = 0.00225 * (this.settings.sens || 1);
    const allowMouse = this.input.locked || this.input.fallback || this.input.mouseDown(0) || this.input.mouseDown(2);
    if (allowMouse) {
      p.yaw -= look.x * sens;
      p.pitch -= look.y * sens * (this.settings.invert ? -1 : 1);
    }
    const gstick = 2.2 * (this.settings.sens || 1);
    p.yaw -= this.input.gp.lx * gstick * dt;
    p.pitch -= this.input.gp.ly * gstick * dt * (this.settings.invert ? -1 : 1);
    if (this.input.down('ArrowLeft')) p.yaw += 1.7 * dt;
    if (this.input.down('ArrowRight')) p.yaw -= 1.7 * dt;
    if (this.input.down('ArrowUp')) p.pitch += 1.2 * dt;
    if (this.input.down('ArrowDown')) p.pitch -= 1.2 * dt;
    if (this.input.fallback && !this.input.locked) {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((this.input.cursor.x - rect.left) / rect.width) * 2 - 1;
      const ny = ((this.input.cursor.y - rect.top) / rect.height) * 2 - 1;
      if (Math.abs(nx) > 0.88) p.yaw -= Math.sign(nx) * 1.35 * dt;
      if (Math.abs(ny) > 0.88) p.pitch -= Math.sign(ny) * 1.05 * dt;
    }
    p.pitch = Math.max(-1.35, Math.min(1.35, p.pitch));
  }

  movePlayer(dt) {
    const p = this.player;
    const wish = this.input.moveAxes();
    const ads = this.ads();
    const crouchWant = this.input.down('ControlLeft') || this.input.down('KeyC') || this.input.touch.buttons.has(3);
    p.crouch = damp(p.crouch, crouchWant ? 1 : 0, 12, dt);
    p.h = 1.72 - p.crouch * 0.64;
    p.eye = p.h - 0.12;
    const sprint = (this.input.down('ShiftLeft') || this.input.down('ShiftRight')) && wish.y > 0.5 && p.crouch < 0.4 && !ads && p.grounded;
    p.sprinting = sprint;
    const speed = (p.crouch > 0.5 ? 2.5 : sprint ? 7.45 : 4.6) * p.speedMul * (ads ? 0.64 : 1);
    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);
    let wx = fx * wish.y + rx * wish.x;
    let wz = fz * wish.y + rz * wish.x;
    const wm = Math.hypot(wx, wz);
    if (wm > 0) { wx /= wm; wz /= wm; }
    if (p.grounded) {
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 0) {
        const ns = Math.max(0, sp - sp * 10 * dt);
        const sc = ns / sp;
        p.vx *= sc;
        p.vz *= sc;
      }
    }
    if (wm > 0) {
      const current = p.vx * wx + p.vz * wz;
      const add = speed - current;
      if (add > 0) {
        let a = (p.grounded ? 58 : 12) * dt * speed;
        if (a > add) a = add;
        p.vx += wx * a;
        p.vz += wz * a;
      }
    }
    if ((this.input.pressed('Space') || this.input.gpPressed(0) || this.input.touch.buttons.has(4)) && p.grounded && p.crouch < 0.5) {
      p.vy = 6.9;
      p.grounded = false;
    }
    p.vy -= 22 * dt;
    const body = { x: p.x, y: p.y, z: p.z, r: p.r, h: p.h };
    const res = moveBody(this.world, body, p.vx * dt, p.vy * dt, p.vz * dt, 0.46);
    p.x = body.x; p.y = body.y; p.z = body.z;
    p.grounded = res.grounded;
    if (res.grounded && p.vy < 0) p.vy = 0;
    if (res.hitHead && p.vy > 0) p.vy = 0;
    if (p.y < -4) { p.x = this.cp?.x || 0; p.y = 0; p.z = this.cp?.z || 0; p.vy = 0; }
    this.pushTruck();
    const moving = Math.hypot(p.vx, p.vz) > 0.45;
    p.moving = moving;
    let noise = 1.1;
    if (this.noiseTimer > 0) noise = 36;
    else if (p.crouch > 0.5) noise = moving ? 3.1 : 0.7;
    else if (sprint) noise = 15;
    else if (moving) noise = 7;
    p.noise = noise * p.noiseMul;
    this.noiseTimer = Math.max(0, this.noiseTimer - dt);
    if (moving && p.grounded) {
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = sprint ? 0.32 : p.crouch > 0.5 ? 0.58 : 0.46;
        this.audio.step();
      }
    }
    if (this.input.pressed('KeyF')) p.flashOn = !p.flashOn;
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt * 1.6);
    p.hurtLock = Math.max(0, p.hurtLock - dt);
  }

  pushTruck() {
    const t = this.truck;
    if (!t) return;
    const p = this.player;
    const dx = p.x - t.x;
    const dz = p.z - t.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.5 && d > 0.001 && p.y < 2.1) {
      p.x += (dx / d) * (2.5 - d);
      p.z += (dz / d) * (2.5 - d);
    }
  }

  ads() {
    return this.input.mouseDown(2) || this.input.gp.buttons.has(6) || this.input.touch.buttons.has(2);
  }

  currentWeapon() {
    const id = this.weapons[this.slot];
    return WEAPONS[id];
  }

  updateCombat(dt) {
    const w = this.currentWeapon();
    this.fireCd = Math.max(0, this.fireCd - dt);
    this.idle += dt;
    this.pump = Math.max(0, this.pump - dt * 1.6);
    this.recoilP = damp(this.recoilP, 0, 7.5, dt);
    this.recoilY = damp(this.recoilY, 0, 8, dt);
    if (this.idle > 0.26) this.spray = Math.max(0, this.spray - dt * 18);
    if (this.reloading) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.finishReload();
    }
    if (this.input.pressed('Digit1')) this.switchSlot('primary');
    if (this.input.pressed('Digit2')) this.switchSlot('secondary');
    if (this.input.pressed('Digit3') || this.input.pressed('KeyV')) this.switchSlot('melee');
    if (this.mode === 'range') {
      const keys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];
      const ids = ['vx4', 'kr762', 'sting', 'breach', 'longbow', 'm19', 'auto9'];
      keys.forEach((k, i) => { if (this.input.pressed(k)) this.forceWeapon(ids[i]); });
    }
    if (this.input.gpPressed(5)) this.switchSlot(this.slot === 'primary' ? 'secondary' : 'primary');
    if ((this.input.pressed('KeyR') || this.input.gpPressed(1)) && !w.melee) this.startReload();
    const fireHeld = this.input.mouseDown(0) || this.input.gp.buttons.has(7) || this.input.touch.buttons.has(0);
    const fireEdge = this.input.mousePressed(0) || this.input.gpPressed(7);
    if (w.melee) {
      if (fireEdge && this.fireCd <= 0) this.melee();
    } else if (!this.reloading && (w.auto ? fireHeld : fireEdge) && this.fireCd <= 0 && !this.buyOpen) {
      this.shoot();
    }
    if ((this.input.pressed('KeyG') || this.input.gpPressed(3))) this.grenadeHold = this.grenadeCount > 0;
    if (this.grenadeHold && !this.input.down('KeyG') && !this.input.gp.buttons.has(3)) {
      this.throwGrenade();
      this.grenadeHold = false;
    }
    this.updateGrenades(dt);
    const moving = this.player.moving;
    let spread = !this.player.grounded ? w.spreadAir : moving ? w.spreadMove * (this.player.sprinting ? 1.3 : 1) : w.spread;
    if (this.player.crouch > 0.6 && !moving) spread *= 0.68;
    if (this.ads()) spread *= w.adsMul || 0.4;
    if (this.idle > 0.28 && this.player.grounded && !moving) spread *= 0.38;
    spread += this.spray * 0.0032;
    this.spread = spread;
    const reloadP = this.reloading ? 1 - this.reloadT / (w.reload || 1) : 0;
    this.view.update(dt, {
      moving, sprinting: this.player.sprinting, grounded: this.player.grounded,
      ads: this.ads() && !w.melee, adsMul: this.player.adsMul,
      reloading: this.reloading, reloadP, pump: this.pump,
      lookX: 0, lookY: 0,
    });
  }

  switchSlot(slot) {
    if (this.weapons[slot] === this.view.id && this.slot === slot) return;
    this.slot = slot;
    this.reloading = false;
    this.view.equip(this.weapons[slot], SLEEVE[this.player.op]);
    this.audio.click();
  }

  forceWeapon(id) {
    const spec = WEAPONS[id];
    if (spec.slot === 'secondary') this.weapons.secondary = id;
    else this.weapons.primary = id;
    this.slot = spec.slot === 'secondary' ? 'secondary' : 'primary';
    this.view.equip(id, SLEEVE[this.player.op]);
  }

  startReload() {
    const id = this.weapons[this.slot];
    const w = WEAPONS[id];
    const a = this.ammo[id];
    if (!w || w.melee || this.reloading || a.mag >= w.mag || a.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = w.reload / (this.player.swapMul > 1 && this.player.op === 'raven' ? 1 : 1);
    this.audio.reload();
  }

  finishReload() {
    const id = this.weapons[this.slot];
    const w = WEAPONS[id];
    const a = this.ammo[id];
    const need = w.mag - a.mag;
    const take = Math.min(need, a.reserve);
    a.mag += take;
    a.reserve -= take;
    this.reloading = false;
  }

  shoot() {
    const id = this.weapons[this.slot];
    const w = WEAPONS[id];
    const a = this.ammo[id];
    if (a.mag <= 0) {
      this.audio.empty();
      this.startReload();
      return;
    }
    a.mag--;
    this.fireCd = 60 / w.rpm;
    this.noiseTimer = 0.45;
    this.shots++;
    this._hitThisShot = false;
    this.spray = Math.min(14, this.spray + 1);
    this.idle = 0;
    this.shotIndex = (this.shotIndex || 0) + 1;
    this.view.kick = 1;
    if (w.kind === 'shotgun') this.pump = 1;
    const pellets = w.pellets || 1;
    this.camera.rotation.x = this.player.pitch - this.recoilP;
    this.camera.rotation.y = this.player.yaw + this.recoilY;
    this.camera.updateMatrixWorld();
    const base = new THREE.Vector3();
    this.camera.getWorldDirection(base);
    const origin = { x: this.player.x, y: this.player.y + this.player.eye, z: this.player.z };
    for (let i = 0; i < pellets; i++) {
      const dir = base.clone();
      dir.x += (Math.random() - 0.5) * this.spread;
      dir.y += (Math.random() - 0.5) * this.spread;
      dir.z += (Math.random() - 0.5) * this.spread;
      dir.normalize();
      this.fireDir(origin, dir, {
        damage: w.dmg, hs: w.hs * this.player.hsMul, falloff: w.falloff,
        byPlayer: true, color: 0xffe3a3, kind: w.kind, from: null,
      });
    }
    this.recoilP += w.recoil * this.player.recoilMul * (1 + Math.min(6, this.spray) * 0.06);
    this.recoilY += (Math.random() - 0.5) * w.recoilSide + Math.sin(this.shotIndex * 1.3) * w.recoilSide;
    this.audio.gun(w.kind);
    this.shake = Math.min(1, this.shake + (w.kind === 'shotgun' || w.kind === 'sniper' ? 0.18 : 0.07));
    const m = new THREE.Vector3();
    this.view.muzzleWorld(m);
    this.effects.muzzle(m, this.view.gun);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.effects.shell(m, right);
    if (a.mag <= 0) this.startReload();
  }

  melee() {
    this.fireCd = 0.48;
    this.view.kick = 1;
    this.audio.noiseBurst?.(0.08, 500, 0.4, 0.2);
    const fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - this.player.x;
      const dy = (e.pos.y + 1) - (this.player.y + 1.2);
      const dz = e.pos.z - this.player.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 2.25) continue;
      if ((dx * fwd.x + dy * fwd.y + dz * fwd.z) / dist < 0.25) continue;
      const ex = -Math.sin(e.yaw);
      const ez = -Math.cos(e.yaw);
      const fl = Math.hypot(this.player.x - e.pos.x, this.player.z - e.pos.z) || 1;
      const face = (ex * (this.player.x - e.pos.x) + ez * (this.player.z - e.pos.z)) / fl;
      let dmg = 58;
      if (face < -0.35) dmg *= 2.6;
      const before = e.alive;
      e.takeDamage(dmg, { cause: 'melee', byPlayer: true });
      this.noteHit(e, 'body', before, 'melee');
    }
    this.audio.click();
  }

  fireDir(origin, dir, info) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(origin.x, origin.y, origin.z),
      new THREE.Vector3(dir.x, dir.y, dir.z).normalize(),
      0.05,
      180,
    );
    const meshes = this.collectMeshes();
    const hits = ray.intersectObjects(meshes, false).filter((h) => {
      const owner = h.object.userData.owner;
      if (info.from && owner === info.from) return false;
      if (info.from?.stats && owner?.stats) return false;
      return true;
    });
    if (!info.byPlayer && info.playerTarget) {
      const cap = rayCapsule(
        origin, dir,
        { x: this.player.x, y: this.player.y + 0.35, z: this.player.z },
        { x: this.player.x, y: this.player.y + this.player.h - 0.12, z: this.player.z },
        0.34,
      );
      if (cap != null && (!hits[0] || cap < hits[0].distance)) {
        this.playerHurt(info.damage, origin);
        const end = { x: origin.x + dir.x * cap, y: origin.y + dir.y * cap, z: origin.z + dir.z * cap };
        this.effects.tracer(origin.x, origin.y, origin.z, end.x, end.y, end.z, info.color || 0xff5533);
        return;
      }
    }
    const hit = hits[0];
    if (!hit) {
      this.effects.tracer(origin.x, origin.y, origin.z, origin.x + dir.x * 40, origin.y + dir.y * 40, origin.z + dir.z * 40, info.color || 0xffe3a3);
      return;
    }
    const owner = hit.object.userData.owner;
    if (owner?.takeDamage) {
      let dmg = info.damage;
      const zone = hit.object.userData.zone || 'body';
      if (zone === 'head') dmg *= info.hs || 2;
      if (zone === 'leg') dmg *= 0.78;
      if (info.falloff) {
        const [a, b, min] = info.falloff;
        const dist = hit.distance;
        const k = dist <= a ? 1 : dist >= b ? min : 1 + (min - 1) * ((dist - a) / (b - a));
        dmg *= k;
      }
      const was = owner.alive !== false && (owner.hp == null || owner.hp > 0);
      owner.takeDamage(dmg, { ...info, zone, from: origin });
      if (info.byPlayer) this.noteHit(owner, zone, was, info.cause || 'gun');
      else this.audio.impact(true);
      this.effects.burst(hit.point.x, hit.point.y, hit.point.z, zone === 'head' ? 0xff3355 : 0xff5533, 8, 2.2, 0.3);
      if (info.byPlayer && this.settings.numbers) this.numbers.push({ x: hit.point.x, y: hit.point.y + 0.2, z: hit.point.z, text: `${Math.round(dmg)}`, life: 0.7, head: zone === 'head' });
    } else {
      const n = hit.face?.normal?.clone() || new THREE.Vector3(0, 1, 0);
      n.transformDirection(hit.object.matrixWorld);
      this.effects.decal(hit.point, n);
      this.effects.burst(hit.point.x, hit.point.y, hit.point.z, 0xffcc88, 6, 2, 0.25);
      this.audio.impact(false);
    }
    this.effects.tracer(origin.x, origin.y, origin.z, hit.point.x, hit.point.y, hit.point.z, info.color || 0xffe3a3);
  }

  collectMeshes() {
    const list = this.level ? [...this.level.shootMeshes] : [];
    for (const prop of this.level?.propMeshes || []) {
      prop.traverse((o) => { if (o.isMesh) list.push(o); });
    }
    for (const e of this.enemies) if (e.alive) list.push(...e.hitMeshes);
    for (const h of this.hostages) if (!h.dead) list.push(...(h.hitMeshes || []));
    for (const d of this.destructibles) if (d.alive) list.push(...d.hitMeshes);
    if (this.truck && !this.truck.stopped) list.push(...this.truck.hitMeshes);
    for (const tgt of this.targets) if (tgt.alive) list.push(...tgt.hitMeshes);
    return list;
  }

  noteHit(owner, zone, wasAlive, cause) {
    if (!this._hitThisShot || cause !== 'gun') this.hits++;
    this._hitThisShot = true;
    if (zone === 'head') this.headshots++;
    this.audio.impact(true);
    this.ui?.flashHit?.(zone === 'head');
    if (owner.prop) return;
    if (wasAlive && owner.alive === false) {
      this.kills++;
      this.cash += 100 + (zone === 'head' ? 50 : 0);
      if (cause === 'melee') this.meleeKills++;
      if (cause === 'explosion') this.barrelKills++;
      this.killsFeed.unshift({ name: owner.name || 'TARGET', head: zone === 'head', t: 4 });
      this.killsFeed.length = Math.min(4, this.killsFeed.length);
      this.audio.click();
    } else if (wasAlive && owner.hp != null && owner.hp <= 0) {
      this.kills++;
      this.cash += 120;
    }
  }

  fireRay(origin, aim, info) {
    const dx = aim.x - origin.x;
    const dy = aim.y - origin.y;
    const dz = aim.z - origin.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    this.fireDir(origin, { x: dx / len, y: dy / len, z: dz / len }, { ...info, playerTarget: true, byPlayer: false });
    this.audio.gun('enemy', Math.hypot(origin.x - this.player.x, origin.z - this.player.z));
  }

  playerHurt(amount, from) {
    const p = this.player;
    if (p.invuln > 0 || p.health <= 0 || this.dead) return;
    let dmg = amount;
    if (p.armor > 0) {
      const absorbed = Math.min(p.armor, dmg * 0.55);
      p.armor -= absorbed;
      dmg -= absorbed;
    }
    p.health -= dmg;
    p.hurt = 1;
    p.hurtLock = 0.4;
    this.damageTaken += dmg;
    this.hurtFrom = from;
    this.shake = Math.min(1, this.shake + 0.28);
    this.audio.hurt();
    if (p.health <= 0) {
      p.health = 0;
      this.onDeath();
    }
  }

  damageProp(obj, amount, info) {
    if (!obj.alive) return;
    obj.hp -= amount;
    if (obj.hp > 0) return;
    obj.alive = false;
    obj.mesh.visible = false;
    for (const box of this.world.aabbs) if (box.meta === obj.prop) this.world.remove(box);
    if (obj.prop.explosive || obj.prop.t === 'barrel') {
      this.queue.push({
        t: this.simTime + 0.08,
        fn: () => this.explode(obj.prop.x, 0.6, obj.prop.z, 5.6, 86),
      });
    }
    if (obj.prop.t === 'locker') {
      this.optional++;
      this.audio.objective();
      this.uiToast('optional');
    }
  }

  hitTarget(obj, info) {
    if (!obj.alive) return;
    obj.alive = false;
    obj.rest = 1.3;
    obj.mesh.rotation.x = 1.2;
    obj.name = 'PLATE';
    this.cash += info?.zone === 'head' ? 15 : 0;
  }

  explode(x, y, z, radius, dmg) {
    this.effects?.shockwave(x, y, z);
    this.effects?.burst(x, y + 0.4, z, 0xff8844, 22, 7, 0.55);
    const pd = Math.hypot(x - this.player.x, z - this.player.z);
    this.audio.explode(pd);
    this.shake = Math.min(1, this.shake + Math.max(0, 1 - pd / radius) * 0.7);
    if (pd < radius) this.playerHurt(dmg * (1 - pd / radius) * this.player.explMul, { x, y, z });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - x, e.pos.z - z);
      if (d < radius) {
        const was = e.alive;
        e.takeDamage(dmg * (1 - d / radius), { cause: 'explosion', byPlayer: true });
        this.noteHit(e, 'body', was, 'explosion');
      }
    }
    for (const h of this.hostages) {
      const d = Math.hypot(h.pos.x - x, h.pos.z - z);
      if (d < radius * 0.85) h.takeDamage(40 * (1 - d / radius));
    }
    if (this.truck && !this.truck.stopped) {
      const d = Math.hypot(this.truck.x - x, this.truck.z - z);
      if (d < radius) this.truck.takeDamage(dmg * 0.5 * (1 - d / radius));
    }
    for (const obj of this.destructibles) {
      if (!obj.alive || !(obj.prop.explosive || obj.prop.t === 'barrel')) continue;
      const d = Math.hypot(obj.prop.x - x, obj.prop.z - z);
      if (d > 0.4 && d < radius * 0.8) obj.takeDamage(50, { cause: 'explosion' });
    }
  }

  throwGrenade() {
    if (this.grenadeCount <= 0) return;
    this.grenadeCount--;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const p = this.player;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a4a32, roughness: 0.5, metalness: 0.3 }),
    );
    this.scene.add(mesh);
    this.grenades.push({
      mesh,
      x: p.x + dir.x * 0.4, y: p.y + p.eye, z: p.z + dir.z * 0.4,
      vx: dir.x * 14 + p.vx, vy: dir.y * 12 + 3.5, vz: dir.z * 14 + p.vz,
      fuse: 2.3,
    });
    this.audio.click();
  }

  updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vy -= 12 * dt;
      const body = { x: g.x, y: g.y, z: g.z, r: 0.12, h: 0.2 };
      const res = moveBody(this.world, body, g.vx * dt, g.vy * dt, g.vz * dt, 0.2);
      if (body.x === g.x && Math.abs(g.vx) > 0.4) g.vx *= -0.45;
      else g.x = body.x;
      if (res.grounded || res.hitHead) g.vy *= -0.35;
      g.y = body.y;
      g.z = body.z;
      g.vx *= 0.99; g.vz *= 0.99;
      g.mesh.position.set(g.x, g.y + 0.08, g.z);
      if (g.fuse <= 0) {
        this.explode(g.x, g.y, g.z, 6.4, 120);
        this.scene.remove(g.mesh);
        g.mesh.geometry.dispose();
        this.grenades.splice(i, 1);
      }
    }
  }

  updateActors(dt) {
    for (const e of this.enemies) {
      e.update(dt, this);
      if (e.bar) e.bar.lookAt(this.camera.position);
    }
    for (const h of this.hostages) h.update(dt, this);
    this.truck?.update(dt);
    if (this.truck?.escaped && !this.truck.stopped && this.mission?.current()?.type === 'truck') this.failMission('truck');
    for (const tgt of this.targets) {
      if (!tgt.alive) {
        tgt.rest -= dt;
        if (tgt.rest <= 0) {
          tgt.alive = true;
          tgt.mesh.rotation.x = 0;
        }
      }
    }
    this.flash.intensity = this.player.flashOn ? 36 : 0;
  }

  handleInteract(dt) {
    if (this.holdPrompt) return;
    const p = this.player;
    let near = null;
    let best = 2.4;
    for (const h of this.hostages) {
      if (h.dead) continue;
      const d = Math.hypot(h.pos.x - p.x, h.pos.z - p.z);
      if (d < best && Math.abs(h.pos.y - p.y) < 1.6) { best = d; near = h; }
    }
    if (!near) return;
    if (near.downed) {
      this.holdPrompt = { p: near.revive / 2.4, text: tl({ en: 'Revive', mn: 'Сэргээх' }) };
      if (this.input.down('KeyE') || this.input.gp.buttons.has(2)) {
        near.revive += dt;
        this.holdPrompt.p = near.revive / 2.4;
        if (near.revive >= 2.4) {
          near.downed = false;
          near.hp = 45;
          near.revive = 0;
          near.following = true;
          this.audio.objective();
        }
      } else near.revive = Math.max(0, near.revive - dt);
      return;
    }
    this.interactPrompt = near.following
      ? tl({ en: 'E  hold position', mn: 'E  байрлалд үлд' })
      : tl({ en: 'E  follow me', mn: 'E  намайг дага' });
    if (this.input.pressed('KeyE') || this.input.gpPressed(2)) {
      near.following = !near.following;
      this.audio.click();
    }
  }

  updateMission(dt) {
    if (this.waves) this.waves.update(dt, this);
    if (this.mission) this.mission.update(dt);
    this.updateBombs(dt);
    const beacon = this.mission?.beacon?.() || null;
    this.effects?.setBeacon(beacon, beacon?.color || 0xf0a202);
    if (this.waves?.finished && this.mission && !this.ending) {
      /* runner handles waves step */
    }
  }

  updateBombs(dt) {
    if (this.mission?.current()?.type !== 'bombs') return;
    for (const id of ['bombA', 'bombB']) {
      if (this.mission.flags[id]) continue;
      const zone = this.spec.zones[id];
      const inside = Math.hypot(this.player.x - zone.x, this.player.z - zone.z) <= zone.r;
      if (inside && (this.input.down('KeyE') || this.input.gp.buttons.has(2)) && this.player.hurtLock <= 0) {
        this.bombProgress[id] += dt;
        this.holdPrompt = { p: this.bombProgress[id] / 5, text: tl({ en: 'Defuse', mn: 'Тайлах' }) };
        if (this.bombProgress[id] >= 5) {
          this.mission.flags[id] = true;
          this.audio.objective();
          this.say('ECHO', this.mission.flags.bombA && this.mission.flags.bombB
            ? { en: 'Both devices are dead.', mn: 'Хоёр төхөөрөмж унтарлаа.' }
            : { en: 'One down. Find the other.', mn: 'Нэг нь унтарлаа. Нөгөөг ол.' });
        }
      } else {
        this.bombProgress[id] = Math.max(0, this.bombProgress[id] - dt * (inside ? 1.6 : 0.4));
        if (inside) this.holdPrompt = { p: this.bombProgress[id] / 5, text: tl({ en: 'Defuse', mn: 'Тайлах' }) };
      }
    }
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      p.t += dt;
      const mesh = this.level.propMeshes.find((m) => m.userData.prop === p);
      if (mesh) {
        mesh.visible = !p.taken;
        mesh.position.y = (p.y || 0) + Math.sin(p.t * 3) * 0.08;
      }
      if (p.taken) {
        if (p.respawn) {
          p.cool = (p.cool || 0) - dt;
          if (p.cool <= 0) p.taken = false;
        }
        continue;
      }
      if (Math.hypot(p.x - this.player.x, p.z - this.player.z) < 1.15 && Math.abs((p.y || 0) - this.player.y) < 1.5) {
        this.collect(p);
      }
    }
  }

  collect(p) {
    if (p.t === 'med') {
      if (this.player.health >= 100) return;
      this.player.health = Math.min(100, this.player.health + 40);
    } else if (p.t === 'armor') {
      if (this.player.armor >= 100) return;
      this.player.armor = Math.min(100, this.player.armor + 40);
    } else {
      const id = this.weapons[this.slot] === 'knife' ? this.weapons.primary : this.weapons[this.slot];
      this.ammo[id].reserve += 36;
    }
    p.taken = true;
    p.cool = 18;
    this.audio.objective();
  }

  updateCamera(dt) {
    const p = this.player;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const sh = this.settings.shake === false ? 0 : this.shake;
    this.camera.position.set(
      p.x + (Math.random() - 0.5) * sh * 0.08,
      p.y + p.eye + (Math.random() - 0.5) * sh * 0.05,
      p.z + (Math.random() - 0.5) * sh * 0.08,
    );
    this.camera.rotation.x = p.pitch - this.recoilP;
    this.camera.rotation.y = p.yaw + this.recoilY;
    this.camera.rotation.z = (Math.random() - 0.5) * sh * 0.03;
    const ads = this.ads() && !this.currentWeapon().melee;
    const targetFov = ads ? (this.currentWeapon().ads || 55) : this.settings.fov + (p.sprinting ? 3 : 0);
    this.camera.fov = damp(this.camera.fov, targetFov, 10, dt);
    this.camera.updateProjectionMatrix();
    if (this.level) {
      updateSun(this.level.sun, p);
      updateLamps(this.level.pool, this.level.lamps, p.x, p.z);
    }
    if (p.health < 32 && p.health > 0) this.audio.setHeartbeat(true);
    else this.audio.setHeartbeat(false);
  }

  updateMood() {
    const combat = this.enemies.some((e) => e.alive && e.state === 'combat');
    this.audio.setMood(combat ? 'combat' : 'tension');
  }

  renderPlay() {
    if (!this.scene) return;
    const cam = this.camera;
    cam.layers.set(0);
    this.renderer.autoClear = true;
    this.renderer.render(this.scene, cam);
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    cam.layers.set(1);
    this.renderer.render(this.scene, cam);
    cam.layers.set(0);
    this.renderer.autoClear = true;
  }

  hudSnapshot() {
    const id = this.weapons[this.slot];
    const w = WEAPONS[id];
    const a = this.ammo[id];
    const step = this.mission?.current?.();
    let sub = '';
    if (this.missionDef?.timer) sub = `${t('timer')} ${formatTime(this.mission.bombT)}`;
    if (this.truck && this.mission?.current()?.type === 'truck') {
      const left = Math.max(0, -78 - this.truck.z);
      sub = `${Math.round(this.truck.hp)} HP · ${Math.round(left)}m`;
    }
    if (this.waves) sub = this.waves.waiting ? `${t('intermission')} ${Math.ceil(this.waves.wait)}` : `${t('enemies')} ${this.enemies.filter((e) => e.alive).length}`;
    return {
      health: this.player.health,
      armor: this.player.armor,
      mag: w.melee ? '—' : a.mag,
      reserve: w.melee ? '' : a.reserve,
      name: w.name,
      mode: w.melee ? 'melee' : w.kind === 'shotgun' ? 'pump' : w.kind === 'sniper' ? 'bolt' : w.auto ? 'auto' : 'semi',
      spread: this.spread || 0.01,
      ads: this.ads() && w.kind === 'sniper',
      reloading: this.reloading,
      reloadP: this.reloading ? 1 - this.reloadT / (w.reload || 1) : 0,
      objective: this.mode === 'range' ? t('rangeHelp') : (this.mission?.objective?.() || ''),
      sub,
      grenades: this.grenadeCount,
      hurt: this.player.hurt,
      hurtFrom: this.hurtFrom,
      yaw: this.player.yaw,
      low: this.player.health < 32,
      hold: this.holdPrompt,
      prompt: this.interactPrompt,
      feed: this.killsFeed,
      radio: this.radio[0],
      numbers: this.numbers,
      beacon: this.mission?.beacon?.() || null,
      player: this.player,
      enemies: this.enemies,
      hostages: this.hostages,
      boxes: this.spec.boxes,
      zones: this.spec.zones,
      time: this.playTime,
      wave: this.waves ? this.waves.index + 1 : 0,
      cash: this.cash,
      fps: this.fps || 60,
      wait: this.waves?.waiting ? this.waves.wait : 0,
      locked: this.input.locked,
      fallback: this.input.fallback && !this.input.locked,
      tutorial: this.save.tutorial && this.playTime < 50,
      op: this.player.op,
      slot: this.slot,
    };
  }

  say(speaker, text) {
    this.radio.unshift({ speaker, text: tl(text), life: 6 });
    this.radio.length = Math.min(4, this.radio.length);
    this.ui.radio(this.radio[0]);
  }

  uiToast(key) {
    this.ui.toast(t(key));
  }

  onAlert(enemy) {
    if (enemy._counted) return;
    enemy._counted = true;
    this.alerts++;
    if (this.alerts === 1) this.say('ECHO', { en: 'Contact. They know you are here.', mn: 'Холбоо барилт. Тэд чамайг мэдлээ.' });
  }

  alertNearby(enemy, radius) {
    for (const other of this.enemies) {
      if (other === enemy || !other.alive || other.alerted) continue;
      if (Math.hypot(other.pos.x - enemy.pos.x, other.pos.z - enemy.pos.z) < radius) {
        other.alerted = true;
        other.state = 'suspicious';
        other.lastKnown = { x: this.player.x, y: this.player.y, z: this.player.z };
      }
    }
  }

  los(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.25) return true;
    const hit = this.world.raycast(a.x, a.y, a.z, dx / len, dy / len, dz / len, len - 0.25);
    return !hit;
  }

  playerInZone(name) {
    const z = this.spec.zones?.[name];
    if (!z) return false;
    return this.posInZone(this.player.x, this.player.z, name);
  }

  posInZone(x, z, name) {
    const zone = this.spec.zones?.[name];
    if (!zone) return false;
    return Math.hypot(x - zone.x, z - zone.z) <= zone.r;
  }

  checkpoint() {
    const p = this.player;
    this.cp = { x: p.x, y: p.y, z: p.z, yaw: p.yaw, armor: p.armor };
  }

  onDeath() {
    if (this.dead) return;
    this.dead = true;
    this.deaths++;
    this.deadTimer = 1.45;
    this.audio.sting('down');
    this.audio.setHeartbeat(false);
    this.ui.showDeath(true);
  }

  respawn() {
    this.dead = false;
    this.ui.showDeath(false);
    const p = this.player;
    const cp = this.cp || this.spec.player;
    p.x = cp.x; p.y = cp.y || 0; p.z = cp.z; p.yaw = cp.yaw || p.yaw;
    p.vx = p.vy = p.vz = 0;
    p.health = 100;
    p.armor = Math.max(p.armor, cp.armor || 0);
    p.invuln = 2.6;
    if (this.missionDef?.horde) {
      p.x = 0; p.z = 0; p.y = 0;
      if (this.waves && !this.waves.finished && !this.waves.waiting) {
        for (const e of this.enemies) {
          if (e.wave === this.waves.index) {
            e.alive = false;
            e.group.visible = false;
          }
        }
        this.waves.queue = [];
        this.waves.index -= 1;
        this.waves.waiting = true;
        this.waves.wait = 6;
      }
      this.openBuy();
    }
  }

  completeMission() {
    if (this.ending) return;
    this.ending = true;
    this.audio.sting('win');
    this.audio.setMood('win');
    setTimeout(() => this.finish(true), 1100);
  }

  failMission(reason) {
    if (this.ending) return;
    this.ending = true;
    this.failReason = reason;
    this.audio.sting('down');
    setTimeout(() => this.finish(false, reason), 700);
  }

  finish(success, reason) {
    this.state = 'results';
    this.ignoreLock = true;
    this.input.exitLock();
    document.body.classList.remove('playing');
    const stars = this.computeStars(success);
    const stats = {
      success, reason,
      stars,
      time: this.playTime,
      kills: this.kills,
      headshots: this.headshots,
      accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
      deaths: this.deaths,
      alerts: this.alerts,
      damage: Math.round(this.damageTaken),
      wave: this.waves ? this.waves.index + (this.waves.finished ? 1 : 0) : 0,
    };
    if (this.missionDef) {
      const prev = this.save.missions[this.missionDef.id] || { stars: 0, bestTime: null };
      const bestTime = success ? Math.min(prev.bestTime ?? Infinity, this.playTime) : prev.bestTime;
      this.save.missions[this.missionDef.id] = {
        stars: Math.max(prev.stars || 0, stars),
        bestTime: bestTime === Infinity ? null : bestTime,
        clears: (prev.clears || 0) + (success ? 1 : 0),
      };
      if (success) {
        this.save.stats.missions++;
        this.save.xp += 350 + stars * 180 + this.kills * 8;
      }
    }
    this.save.stats.kills += this.kills;
    this.save.stats.shots += this.shots;
    this.save.stats.hits += this.hits;
    this.save.stats.headshots += this.headshots;
    this.save.stats.playTime += this.playTime;
    this.save.tutorial = false;
    this.save.loadout = { ...this.loadout };
    writeSave(this.save);
    this.ui.showResults(stats, this.missionDef);
  }

  computeStars(success) {
    if (this.missionDef?.horde) {
      const w = this.waves ? (this.waves.finished ? 8 : Math.max(0, this.waves.index)) : 0;
      if (w >= 8) return 3;
      if (w >= 6) return 2;
      if (w >= 4) return 1;
      return 0;
    }
    if (!success) return 0;
    const par = this.missionDef?.par || 9999;
    if (this.playTime <= par && this.deaths === 0) return 3;
    if (this.playTime <= par || this.deaths === 0) return 2;
    return 1;
  }

  pause() {
    if (this.state !== 'playing' || this.dead || this.ending) return;
    this.state = 'paused';
    this.ignoreLock = true;
    this.input.exitLock();
    this.ui.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.show('hud');
    this.ignoreLock = true;
    this.input.requestLock();
    setTimeout(() => { this.ignoreLock = false; }, 400);
    this.clock.getDelta();
  }

  abort() {
    this.state = 'menu';
    this.ending = false;
    this.dead = false;
    this.buyOpen = false;
    document.body.classList.remove('playing');
    this.input.exitLock();
    this.audio.setRain(false);
    this.audio.setHeartbeat(false);
    this.audio.setMood('menu');
    this.ui.show('menu');
    this.clearPlay();
  }

  openBuy() {
    if (!this.missionDef?.horde) return;
    this.buyOpen = true;
    this.ignoreLock = true;
    this.input.exitLock();
    this.ui.showBuy(this);
  }

  closeBuy() {
    this.buyOpen = false;
    this.ui.hideBuy();
    if (this.state === 'playing') {
      this.ignoreLock = true;
      this.input.requestLock();
      setTimeout(() => { this.ignoreLock = false; }, 400);
    }
  }

  buy(item) {
    const prices = { ammo: 160, armor: 280, med: 220, grenade: 200 };
    if (item.startsWith('w:')) {
      const id = item.slice(2);
      const price = WEAPONS[id].price || 600;
      if (this.cash < price) return this.ui.toast(t('afford'));
      this.cash -= price;
      this.forceWeapon(id);
      this.ammo[id] = { mag: WEAPONS[id].mag, reserve: WEAPONS[id].reserve };
      this.audio.objective();
      return;
    }
    const price = prices[item];
    if (this.cash < price) return this.ui.toast(t('afford'));
    this.cash -= price;
    if (item === 'ammo') {
      const id = this.weapons[this.slot] === 'knife' ? this.weapons.primary : this.weapons[this.slot];
      this.ammo[id].reserve += WEAPONS[id].reserve;
      this.ammo[id].mag = WEAPONS[id].mag;
    } else if (item === 'armor') this.player.armor = Math.min(100, this.player.armor + 50);
    else if (item === 'med') this.player.health = Math.min(100, this.player.health + 50);
    else if (item === 'grenade') this.grenadeCount = Math.min(4, this.grenadeCount + 1);
    this.audio.objective();
    this.ui.showBuy(this);
  }

  zonePos(name) {
    return this.spec?.zones?.[name] || null;
  }
}

function frame() {
  return new Promise((res) => requestAnimationFrame(res));
}

export { TIPS, OPERATORS };
