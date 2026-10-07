import * as THREE from 'three';
import { ENEMY_TYPES, ENEMY_NAMES } from './content.js';
import { moveBody, nearestNode, astar, dampAngle, normalizeAngle } from './physics.js';
import { buildHuman } from './humans.js';

let nameI = 0;
function nextName() {
  const n = ENEMY_NAMES[nameI % ENEMY_NAMES.length];
  nameI++;
  return n;
}

export { buildHuman } from './humans.js';

export class Enemy {
  constructor(def, diff) {
    this.id = def.id || `e${Math.random().toString(36).slice(2, 7)}`;
    this.type = def.type || 'soldier';
    this.stats = { ...ENEMY_TYPES[this.type] };
    this.hp = Math.round(this.stats.hp * diff.hp);
    this.maxHp = this.hp;
    this.pos = { x: def.x, y: def.y || 0, z: def.z };
    this.vy = 0;
    this.yaw = def.yaw || 0;
    this.alive = true;
    this.state = 'patrol';
    this.patrol = (def.patrol && def.patrol.length) ? def.patrol : [[def.x, def.z, def.y || 0]];
    this.patrolI = 0;
    this.hold = !!(def.hold || this.stats.hold);
    this.shootCd = Math.random() * 0.4;
    this.react = 0;
    this.lastSee = 10;
    this.alerted = false;
    this.name = def.name || (this.type === 'heavy' ? 'BREAKER' : this.type === 'sniper' ? 'WATCHER' : nextName());
    this.group = buildHuman(this.type, this.name.length + (this.id?.length || 0));
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.walk = Math.random() * 6;
    this.path = [];
    this.pathT = 0;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.strafeT = 0;
    this.goal = null;
    this.lastKnown = null;
    this.flash = 0;
    this.death = 0;
    this.truckGunner = !!def.truckGunner;
    this.wave = def.wave ?? null;
    this.local = def.truckGunner ? { x: def.lx || 0, y: def.y || 1.5, z: def.lz || 0 } : null;
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.62, 0.05),
      new THREE.MeshBasicMaterial({ color: 0x3dde8a, depthTest: false, transparent: true }),
    );
    bar.position.y = 1.92;
    bar.visible = false;
    this.bar = bar;
    this.group.add(bar);
    this.hitMeshes = this.group.userData.hitMeshes.map((h) => {
      h.mesh.userData.owner = this;
      h.mesh.userData.zone = h.zone;
      h.mesh.userData.mult = h.mult;
      return h.mesh;
    });
    this.resist = this.stats.resist || 1;
  }

  eye() {
    return { x: this.pos.x, y: this.pos.y + 1.55, z: this.pos.z };
  }

  takeDamage(amount, info) {
    if (!this.alive) return;
    const dmg = info?.cause === 'explosion' ? amount * this.resist : amount;
    this.hp -= dmg;
    this.flash = 0.12;
    this.alerted = true;
    this.state = 'combat';
    this.react = Math.min(this.react, 0.05);
    if (info?.from) this.lastKnown = { x: info.from.x, y: info.from.y || 0, z: info.from.z };
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.death = 0;
    }
  }

  update(dt, game) {
    if (!this.alive) {
      this.death += dt;
      this.group.rotation.x = Math.min(1.25, this.death * 4);
      this.group.position.y = this.pos.y + Math.min(0.15, this.death);
      return;
    }
    this.shootCd -= dt;
    this.react = Math.max(0, this.react - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.pathT -= dt;
    this.strafeT -= dt;
    if (this.truckGunner && game.truck) {
      const t = game.truck;
      this.pos.x = t.x + this.local.x;
      this.pos.y = (t.y || 0) + this.local.y;
      this.pos.z = t.z + this.local.z;
    }
    this.sense(dt, game);
    if (!this.truckGunner) this.locomote(dt, game);
    this.tryShoot(game);
    this.syncMesh(dt);
  }

  sense(dt, game) {
    const p = game.player;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const seeRange = this.stats.see * game.diff.see / (p.stealth || 1);
    let see = false;
    if (dist < seeRange && p.health > 0) {
      const want = Math.atan2(-dx, -dz);
      const ang = Math.abs(normalizeAngle(want - this.yaw));
      if (dist < 2.3 || ang < this.stats.fov) {
        const eye = this.eye();
        see = game.los(eye, { x: p.x, y: p.y + p.eye * 0.92, z: p.z })
          || game.los(eye, { x: p.x, y: p.y + 0.85, z: p.z });
      }
    }
    if (see) {
      if (!this.alerted) {
        this.react = game.diff.react;
        game.onAlert(this);
      }
      this.alerted = true;
      this.state = 'combat';
      this.lastSee = 0;
      this.lastKnown = { x: p.x, y: p.y, z: p.z };
      game.alertNearby(this, 20);
    } else {
      this.lastSee += dt;
      const hear = (p.noise || 0) * (this.stats.hear || 1);
      if (dist < hear) {
        this.lastKnown = { x: p.x, y: p.y, z: p.z };
        if (this.state === 'patrol') this.state = 'suspicious';
      }
      if (this.state === 'combat' && this.lastSee > 4.5) this.state = 'search';
      if ((this.state === 'search' || this.state === 'suspicious') && this.lastSee > 9) this.state = 'patrol';
    }
    this._see = see;
    this._dist = dist;
  }

  locomote(dt, game) {
    if (this.hold && this.state === 'combat') {
      const p = game.player;
      this.yaw = dampAngle(this.yaw, Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z)), 7, dt);
      this.applyGravity(dt, game);
      return;
    }
    let gx = this.pos.x;
    let gz = this.pos.z;
    let moving = false;
    if (this.state === 'patrol') {
      const pt = this.patrol[this.patrolI % this.patrol.length];
      gx = pt[0];
      gz = pt[1];
      if (Math.hypot(gx - this.pos.x, gz - this.pos.z) < 0.7) this.patrolI++;
      moving = true;
    } else if (this.lastKnown) {
      if (this.pathT <= 0) {
        this.pathT = 0.65;
        const nodes = game.nav?.nodes || [];
        const a = nearestNode(nodes, this.pos.x, this.pos.y, this.pos.z);
        const b = nearestNode(nodes, this.lastKnown.x, this.lastKnown.y || 0, this.lastKnown.z);
        this.path = astar(a, b);
      }
      if (this.state === 'combat') {
        if (this.strafeT <= 0) {
          this.strafeT = 1.1 + Math.random();
          this.strafe *= -1;
        }
        const p = game.player;
        const dx = p.x - this.pos.x;
        const dz = p.z - this.pos.z;
        const len = Math.hypot(dx, dz) || 1;
        const side = this._dist < 8 ? 1 : 0.4;
        gx = p.x - (dx / len) * 7 + (-dz / len) * this.strafe * side * 3;
        gz = p.z - (dz / len) * 7 + (dx / len) * this.strafe * side * 3;
        if (this._dist > 16 && this.path?.length) {
          const n = this.path[Math.min(1, this.path.length - 1)];
          gx = n.x;
          gz = n.z;
        }
      } else if (this.path?.length) {
        const n = this.path[Math.min(1, this.path.length - 1)];
        gx = n.x;
        gz = n.z;
        if (Math.hypot(n.x - this.pos.x, n.z - this.pos.z) < 0.8) this.path.shift();
      } else {
        gx = this.lastKnown.x;
        gz = this.lastKnown.z;
      }
      moving = true;
    }
    const speed = (this.state === 'combat' ? this.stats.speed * 1.12 : this.stats.speed * 0.72);
    const dx = gx - this.pos.x;
    const dz = gz - this.pos.z;
    const len = Math.hypot(dx, dz);
    let mx = 0;
    let mz = 0;
    if (moving && len > 0.35 && this.stats.speed > 0) {
      mx = (dx / len) * speed * dt;
      mz = (dz / len) * speed * dt;
      for (const other of game.enemies) {
        if (other === this || !other.alive) continue;
        const ox = this.pos.x - other.pos.x;
        const oz = this.pos.z - other.pos.z;
        const od = Math.hypot(ox, oz);
        if (od > 0.01 && od < 1.05) {
          mx += (ox / od) * 1.6 * dt;
          mz += (oz / od) * 1.6 * dt;
        }
      }
      this.yaw = dampAngle(this.yaw, Math.atan2(-dx, -dz), 8, dt);
      this.walk += dt * speed * 1.6;
    } else if (this.state === 'combat') {
      const p = game.player;
      this.yaw = dampAngle(this.yaw, Math.atan2(-(p.x - this.pos.x), -(p.z - this.pos.z)), 8, dt);
    }
    this.vy -= 22 * dt;
    const body = { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 0.34, h: 1.65 };
    const res = moveBody(game.world, body, mx, this.vy * dt, mz, 0.42);
    this.pos.x = body.x;
    this.pos.y = body.y;
    this.pos.z = body.z;
    if (res.grounded) this.vy = 0;
    if (res.hitHead) this.vy = 0;
  }

  applyGravity(dt, game) {
    this.vy -= 22 * dt;
    const body = { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 0.34, h: 1.65 };
    const res = moveBody(game.world, body, 0, this.vy * dt, 0);
    this.pos.x = body.x;
    this.pos.y = body.y;
    this.pos.z = body.z;
    if (res.grounded || res.hitHead) this.vy = 0;
  }

  tryShoot(game) {
    if (this.state !== 'combat' || this.react > 0 || this.shootCd > 0 || !this._see) return;
    if (this._dist > this.stats.range) return;
    this.shootCd = this.stats.rate * (0.8 + Math.random() * 0.45);
    const p = game.player;
    const origin = this.eye();
    const aimY = p.y + (Math.random() < 0.18 ? p.eye : 1.05);
    const aim = { x: p.x, y: aimY, z: p.z };
    const acc = this.stats.acc * game.diff.acc * (0.65 + this._dist * 0.03);
    aim.x += (Math.random() - 0.5) * acc * this._dist;
    aim.y += (Math.random() - 0.5) * acc * this._dist * 0.6;
    aim.z += (Math.random() - 0.5) * acc * this._dist;
    game.fireRay(origin, aim, {
      damage: this.stats.dmg * game.diff.dmg,
      from: this,
      color: 0xff5533,
      kind: 'enemy',
    });
    const parts = this.group.userData.parts;
    parts.rightArm.rotation.x = -1.05;
    if (parts.gun) parts.gun.position.z = -0.28;
  }

  syncMesh(dt) {
    const parts = this.group.userData.parts;
    const swing = Math.sin(this.walk) * (this.alive ? 0.5 : 0);
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    if (parts.kneeL) {
      parts.kneeL.rotation.x = Math.max(0, -swing) * 0.85;
      parts.kneeR.rotation.x = Math.max(0, swing) * 0.85;
    }
    const restL = this.group.userData.restArmL || 0;
    const restR = this.group.userData.restArm || 0;
    parts.leftArm.rotation.x = restL - swing * 0.35;
    if (this.state !== 'combat') parts.rightArm.rotation.x = restR + swing * 0.15;
    if (parts.gun) parts.gun.rotation.x = this.flash > 0 ? -0.06 : 0;
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.order = 'YXZ';
    this.group.rotation.y = this.yaw;
    if (this.bar) {
      const show = this.hp < this.maxHp && this.flash > 0 || (this.hp < this.maxHp && this._dist < 28);
      this.bar.visible = show && this.alive;
      this.bar.scale.x = Math.max(0.05, this.hp / this.maxHp);
      this.bar.material.color.set(this.hp / this.maxHp < 0.35 ? 0xff4455 : 0x3dde8a);
    }
    const f = this.flash > 0 ? 0.7 : 0;
    parts.torso.material.emissive.setRGB(f, f * 0.35, f * 0.28);
    parts.head.material.emissive.setRGB(f * 0.4, f * 0.15, f * 0.12);
  }
}

export class Hostage {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.pos = { x: def.x, y: def.y || 0, z: def.z };
    this.vy = 0;
    this.yaw = 0;
    this.hp = 70;
    this.following = false;
    this.downed = false;
    this.dead = false;
    this.bleed = 0;
    this.revive = 0;
    this.walk = 0;
    this.group = buildHuman('civilian', def.name === 'BOR' ? 1 : 0);
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.hitMeshes = this.group.userData.hitMeshes.map((h) => {
      h.mesh.userData.owner = this;
      h.mesh.userData.zone = h.zone;
      return h.mesh;
    });
    this.stuck = 0;
  }

  takeDamage(amount) {
    if (this.dead || this.downed) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.downed = true;
      this.following = false;
      this.bleed = 22;
    }
  }

  update(dt, game) {
    if (this.dead) return;
    if (this.downed) {
      this.bleed -= dt;
      this.group.rotation.x = 1.2;
      this.group.position.set(this.pos.x, this.pos.y + 0.15, this.pos.z);
      if (this.bleed <= 0) {
        this.dead = true;
        game.failMission('hostage');
      }
      return;
    }
    this.group.rotation.x = 0;
    const p = game.player;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let mx = 0;
    let mz = 0;
    if (this.following && dist > 1.7) {
      const speed = dist > 7 ? 4.4 : 3.2;
      mx = (dx / dist) * speed * dt;
      mz = (dz / dist) * speed * dt;
      this.yaw = dampAngle(this.yaw, Math.atan2(-dx, -dz), 8, dt);
      this.walk += dt * 8;
    }
    this.vy -= 22 * dt;
    const before = this.pos.x + this.pos.z;
    const body = { x: this.pos.x, y: this.pos.y, z: this.pos.z, r: 0.32, h: 1.6 };
    const res = moveBody(game.world, body, mx, this.vy * dt, mz, 0.42);
    this.pos.x = body.x;
    this.pos.y = body.y;
    this.pos.z = body.z;
    if (res.grounded || res.hitHead) this.vy = 0;
    if (this.following && Math.abs(this.pos.x + this.pos.z - before) < 0.002 && dist > 3) this.stuck += dt;
    else this.stuck = 0;
    if (this.stuck > 2.5) {
      this.pos.x = p.x;
      this.pos.z = p.z;
      this.pos.y = p.y;
      this.stuck = 0;
    }
    const parts = this.group.userData.parts;
    const swing = Math.sin(this.walk) * 0.5;
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    if (parts.kneeL) {
      parts.kneeL.rotation.x = Math.max(0, -swing) * 0.8;
      parts.kneeR.rotation.x = Math.max(0, swing) * 0.8;
    }
    this.group.position.set(this.pos.x, this.pos.y, this.pos.z);
    this.group.rotation.y = this.yaw;
  }
}

export class Truck {
  constructor(def) {
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.speed = def.speed;
    this.path = def.path;
    this.dist = 0;
    this.x = def.path[0].x;
    this.y = 0;
    this.z = def.path[0].z;
    this.yaw = 0;
    this.stopped = false;
    this.escaped = false;
    this.group = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.35, 2.4), new THREE.MeshStandardMaterial({ color: 0x6a3030, roughness: 0.5, metalness: 0.35 }));
    cab.position.set(0, 1.2, -2.1);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.6, 4.3), new THREE.MeshStandardMaterial({ color: 0x2c3338, roughness: 0.55, metalness: 0.3 }));
    bed.position.set(0, 1.4, 1.15);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 6.8), new THREE.MeshStandardMaterial({ color: 0x15171a, metalness: 0.4, roughness: 0.6 }));
    chassis.position.y = 0.4;
    this.group.add(cab, bed, chassis);
    cab.userData.owner = this;
    bed.userData.owner = this;
    chassis.userData.owner = this;
    this.hitMeshes = [cab, bed, chassis];
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const lamp = new THREE.SpotLight(0xffe2b8, 3, 22, 0.55, 0.45, 1);
    lamp.position.set(0, 1.1, -3.4);
    lamp.target.position.set(0, 0.2, -10);
    this.group.add(lamp, lamp.target);
    this.sync();
  }

  takeDamage(amount) {
    if (this.stopped) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.stopped = true;
    }
  }

  update(dt) {
    if (this.stopped || this.escaped) {
      this.sync();
      return;
    }
    this.dist += this.speed * dt;
    let remain = this.dist;
    const path = this.path;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 0.001;
      if (remain <= len) {
        const t = remain / len;
        this.x = a.x + (b.x - a.x) * t;
        this.z = a.z + (b.z - a.z) * t;
        this.yaw = Math.atan2(-(b.x - a.x), -(b.z - a.z));
        this.sync();
        return;
      }
      remain -= len;
    }
    this.x = path[path.length - 1].x;
    this.z = path[path.length - 1].z;
    this.escaped = true;
    this.sync();
  }

  sync() {
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }
}

export class WaveDirector {
  constructor(waves, points) {
    this.waves = waves;
    this.points = points;
    this.index = -1;
    this.queue = [];
    this.aliveIds = new Set();
    this.wait = 4;
    this.waiting = true;
    this.finished = false;
    this.spawnT = 0;
  }

  update(dt, game) {
    if (this.finished) return;
    if (this.waiting) {
      this.wait -= dt;
      if (this.wait <= 0) this.startWave(game);
      return;
    }
    this.spawnT -= dt;
    const alive = game.enemies.filter((e) => e.alive && e.wave != null && e.wave === this.index).length;
    if (this.queue.length && alive < 7 && this.spawnT <= 0) {
      this.spawnT = 0.8;
      const type = this.queue.shift();
      const sp = this.pick(game);
      game.spawnEnemy({
        type,
        x: sp.x,
        z: sp.z,
        hold: type === 'sniper',
        wave: this.index,
      });
    }
    if (!this.queue.length && alive === 0) {
      game.cash += 400;
      game.uiToast('waveClear');
      if (this.index >= this.waves.length - 1) {
        this.finished = true;
        return;
      }
      this.waiting = true;
      this.wait = 12;
      game.openBuy();
    }
  }

  startWave(game) {
    this.index++;
    this.waiting = false;
    const wave = this.waves[this.index];
    this.queue = [];
    for (let i = 0; i < wave.n; i++) this.queue.push(wave.types[i % wave.types.length]);
    game.closeBuy();
    game.uiToast('waveStart');
    game.say('CONTROL', {
      en: `Wave ${this.index + 1}. They are in the yard.`,
      mn: `${this.index + 1}-р давалгаа. Тэд талбайд орж ирлээ.`,
    });
  }

  pick(game) {
    let best = this.points[0];
    let bestD = -1;
    for (const p of this.points) {
      const d = Math.hypot(p.x - game.player.x, p.z - game.player.z);
      if (d > bestD) { bestD = d; best = p; }
    }
    return best || { x: 16, z: 16 };
  }
}

export const YARD_WAVES = [
  { n: 6, types: ['soldier'] },
  { n: 8, types: ['soldier', 'rusher'] },
  { n: 9, types: ['soldier', 'rusher', 'soldier'] },
  { n: 10, types: ['soldier', 'rusher', 'sniper'] },
  { n: 8, types: ['soldier', 'heavy', 'rusher'] },
  { n: 12, types: ['soldier', 'rusher'] },
  { n: 10, types: ['soldier', 'sniper', 'rusher'] },
  { n: 12, types: ['soldier', 'heavy', 'rusher', 'soldier'] },
];
