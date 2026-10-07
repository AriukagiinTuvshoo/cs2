import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { WEAPONS } from './content.js';

function std(color, rough = 0.45, metal = 0.55, em = 0x000000, emI = 0) {
  const m = new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, emissive: em, emissiveIntensity: emI,
  });
  m.envMapIntensity = metal > 0.4 ? 1.25 : 0.7;
  return m;
}

function rbox(w, h, d, r = 0.004) {
  const rad = Math.min(r, w * 0.45, h * 0.45, d * 0.45);
  return new RoundedBoxGeometry(w, h, d, 2, rad);
}

function tube(r, len, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateX(Math.PI / 2);
  return g;
}

function add(g, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  g.add(m);
  return m;
}

function hands(g, sleeve, grip, support) {
  const cloth = std(sleeve, 0.82, 0.04);
  const glove = std(0x1c1e1a, 0.62, 0.12);
  const skin = std(0x8d6b52, 0.7, 0.02);
  const watch = std(0x22262c, 0.35, 0.7);
  add(g, new THREE.SphereGeometry(0.034, 10, 8), glove, grip.x, grip.y, grip.z);
  add(g, rbox(0.045, 0.05, 0.07, 0.01), glove, grip.x + 0.01, grip.y - 0.01, grip.z + 0.03);
  add(g, rbox(0.055, 0.07, 0.14, 0.012), cloth, grip.x + 0.03, grip.y - 0.06, grip.z + 0.1);
  add(g, rbox(0.07, 0.08, 0.22, 0.016), cloth, grip.x + 0.06, grip.y - 0.12, grip.z + 0.2);
  add(g, new THREE.SphereGeometry(0.012, 8, 6), skin, grip.x + 0.02, grip.y + 0.02, grip.z + 0.05);
  if (!support) return;
  add(g, new THREE.SphereGeometry(0.03, 10, 8), glove, support.x, support.y, support.z);
  add(g, rbox(0.05, 0.035, 0.08, 0.01), glove, support.x - 0.01, support.y - 0.01, support.z + 0.02);
  add(g, rbox(0.05, 0.055, 0.16, 0.012), cloth, support.x - 0.02, support.y - 0.04, support.z + 0.1);
  add(g, tube(0.016, 0.012, 8), watch, support.x - 0.03, support.y - 0.02, support.z + 0.06, 0, 0, Math.PI / 2);
}

export function buildGun(id, sleeve = 0x2a3340) {
  const spec = WEAPONS[id];
  const g = new THREE.Group();
  const dark = std(0x1a1c18, 0.42, 0.62);
  const poly = std(0x121212, 0.58, 0.28);
  const steel = std(0x9aa2a8, 0.28, 0.82);
  const accent = std(id === 'kr762' ? 0x6a4328 : 0xc6a15a, 0.48, 0.35);
  const glass = std(0x14343c, 0.12, 0.2, 0x7ddec8, 0.55);
  g.userData.kind = spec.kind;

  if (spec.kind === 'knife') {
    add(g, rbox(0.018, 0.008, 0.26, 0.002), steel, 0, 0.02, -0.16);
    add(g, rbox(0.028, 0.012, 0.04, 0.002), steel, 0, 0.02, -0.02);
    add(g, rbox(0.032, 0.036, 0.1, 0.006), poly, 0, -0.005, 0.05);
    hands(g, sleeve, { x: 0.02, y: -0.02, z: 0.08 }, null);
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -0.3);
    return g;
  }

  if (spec.kind === 'pistol' || id === 'auto9') {
    const long = id === 'auto9';
    add(g, rbox(0.042, 0.062, long ? 0.2 : 0.16, 0.006), dark, 0, 0.03, long ? -0.06 : -0.04);
    add(g, tube(0.009, long ? 0.1 : 0.07), steel, 0, 0.055, long ? -0.18 : -0.14);
    const mag = add(g, rbox(0.028, long ? 0.11 : 0.08, 0.03, 0.004), poly, 0, long ? -0.05 : -0.04, 0.0);
    add(g, rbox(0.036, 0.07, 0.045, 0.006), dark, 0, -0.015, 0.035);
    add(g, rbox(0.01, 0.02, 0.02, 0.002), steel, 0.024, 0.03, -0.02);
    if (long) add(g, rbox(0.03, 0.02, 0.06, 0.003), accent, 0, 0.07, -0.02);
    hands(g, sleeve, { x: 0.02, y: -0.02, z: 0.04 }, long ? { x: -0.01, y: 0.02, z: -0.08 } : null);
    g.userData.mag = mag;
    g.userData.muzzle = new THREE.Vector3(0, 0.055, long ? -0.24 : -0.19);
    return g;
  }

  if (spec.kind === 'shotgun') {
    add(g, rbox(0.055, 0.06, 0.28, 0.006), dark, 0, 0.03, -0.02);
    add(g, tube(0.016, 0.42), steel, 0, 0.075, -0.22);
    const pump = add(g, rbox(0.048, 0.04, 0.12, 0.008), accent, 0, 0.02, -0.16);
    add(g, rbox(0.04, 0.1, 0.05, 0.006), dark, 0, -0.04, 0.08);
    add(g, rbox(0.045, 0.05, 0.18, 0.008), dark, 0, 0.02, 0.2);
    add(g, rbox(0.02, 0.03, 0.04, 0.003), steel, 0, 0.08, 0.02);
    hands(g, sleeve, { x: 0.03, y: -0.02, z: 0.06 }, { x: 0, y: 0.02, z: -0.16 });
    g.userData.pump = pump;
    g.userData.muzzle = new THREE.Vector3(0, 0.075, -0.44);
    return g;
  }

  if (spec.kind === 'sniper') {
    add(g, rbox(0.046, 0.055, 0.34, 0.005), dark, 0, 0.03, -0.02);
    add(g, tube(0.011, 0.55), steel, 0, 0.055, -0.38);
    add(g, tube(0.02, 0.18), dark, 0, 0.095, -0.06);
    add(g, new THREE.CircleGeometry(0.014, 12), glass, 0, 0.095, -0.155);
    const bolt = add(g, rbox(0.045, 0.012, 0.016, 0.002), steel, 0.03, 0.05, 0.0);
    add(g, rbox(0.038, 0.1, 0.045, 0.005), dark, 0, -0.04, 0.08);
    add(g, rbox(0.04, 0.045, 0.2, 0.006), dark, 0, 0.02, 0.24);
    add(g, rbox(0.03, 0.02, 0.08, 0.003), accent, 0, 0.01, -0.22);
    hands(g, sleeve, { x: 0.025, y: -0.02, z: 0.07 }, { x: -0.01, y: 0.03, z: -0.16 });
    g.userData.bolt = bolt;
    g.userData.muzzle = new THREE.Vector3(0, 0.055, -0.66);
    return g;
  }

  const long = spec.kind === 'rifle';
  const wood = id === 'kr762';
  const bodyLen = long ? (wood ? 0.34 : 0.3) : 0.22;
  add(g, rbox(0.05, 0.06, bodyLen, 0.006), dark, 0, 0.035, long ? -0.02 : 0);
  add(g, tube(0.01, long ? 0.34 : 0.16), steel, 0, 0.07, long ? -0.32 : -0.2);
  add(g, rbox(0.018, 0.028, 0.07, 0.003), steel, 0, 0.085, -0.02);
  add(g, rbox(0.028, 0.02, wood ? 0.1 : 0.07, 0.003), wood ? accent : dark, 0, 0.1, wood ? -0.08 : -0.04);
  add(g, new THREE.CircleGeometry(0.008, 8), glass, 0, 0.1, wood ? -0.132 : -0.078);
  const mag = add(g, rbox(0.032, long ? 0.13 : 0.09, 0.038, 0.004), poly, 0, -0.05, -0.02);
  add(g, rbox(0.036, 0.09, 0.042, 0.006), dark, 0, -0.03, 0.06);
  if (long) add(g, rbox(0.042, 0.042, wood ? 0.16 : 0.12, 0.006), wood ? accent : dark, 0, 0.02, 0.18);
  add(g, rbox(0.04, 0.035, long ? 0.16 : 0.1, 0.006), dark, 0, 0.03, long ? -0.2 : -0.12);
  add(g, tube(0.014, 0.03, 8), steel, 0, 0.07, long ? -0.5 : -0.3);
  hands(
    g, sleeve,
    { x: 0.03, y: -0.015, z: 0.05 },
    { x: -0.005, y: 0.02, z: long ? -0.18 : -0.1 },
  );
  g.userData.mag = mag;
  g.userData.muzzle = new THREE.Vector3(0, 0.07, long ? (wood ? -0.56 : -0.52) : -0.32);
  return g;
}

export class ViewModel {
  constructor(camera) {
    this.camera = camera;
    this.rig = new THREE.Group();
    this.rig.position.set(0.22, -0.22, -0.42);
    camera.add(this.rig);
    this.gun = null;
    this.kick = 0;
    this.bob = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.reloadT = 0;
    this.reloading = false;
    this.ads = 0;
    this.drop = 0;
    this.id = null;
    this.setLayer(this.rig);
  }

  setLayer(obj) {
    obj.layers.set(1);
    obj.traverse((o) => o.layers.set(1));
  }

  equip(id, sleeve) {
    if (this.gun) {
      this.rig.remove(this.gun);
      this.gun.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    this.id = id;
    this.gun = buildGun(id, sleeve);
    this.setLayer(this.gun);
    this.rig.add(this.gun);
    this.gun.traverse((o) => { o.frustumCulled = false; });
    this.drop = 1;
  }

  muzzleWorld(out) {
    if (!this.gun) return out.set(0, 0, 0);
    const local = this.gun.userData.muzzle || new THREE.Vector3(0, 0, -0.4);
    return this.gun.localToWorld(out.copy(local));
  }

  update(dt, state) {
    const spec = WEAPONS[this.id] || WEAPONS.vx4;
    this.kick = Math.max(0, this.kick - dt * 8);
    this.bob += dt * (state.moving ? (state.sprinting ? 13 : 9) : 1.5);
    const bobAmp = state.grounded && state.moving && this.ads < 0.4 ? 0.012 : 0.002;
    this.swayX += (state.lookX * 0.0009 - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (state.lookY * 0.0007 - this.swayY) * Math.min(1, dt * 8);
    this.ads += ((state.ads ? 1 : 0) - this.ads) * Math.min(1, dt * (10 * (state.adsMul || 1)));
    this.drop = Math.max(0, this.drop - dt * 4.5);
    const adsP = this.ads;
    const base = spec.kind === 'pistol' || spec.kind === 'knife' ? { x: 0.18, y: -0.2, z: -0.38 } : { x: 0.22, y: -0.2, z: -0.42 };
    const aim = { x: 0.0, y: -0.16, z: spec.kind === 'sniper' ? -0.28 : -0.32 };
    const sprintDrop = state.sprinting && !state.ads ? 0.08 : 0;
    this.rig.position.x = base.x + (aim.x - base.x) * adsP + Math.sin(this.bob) * bobAmp + this.swayX;
    this.rig.position.y = base.y + (aim.y - base.y) * adsP + Math.abs(Math.cos(this.bob)) * -bobAmp * 0.8 - this.kick * 0.02 - sprintDrop - this.drop * 0.35 + this.swayY;
    this.rig.position.z = base.z + (aim.z - base.z) * adsP + this.kick * 0.05;
    this.rig.rotation.x = -this.kick * 0.35 + (state.reloading ? Math.sin(state.reloadP * Math.PI) * 0.5 : 0);
    this.rig.rotation.y = this.swayX * 1.4 + (state.reloading ? -0.35 * Math.sin(state.reloadP * Math.PI) : 0);
    this.rig.rotation.z = this.swayX * -0.4 + adsP * -0.04;
    if (this.gun?.userData.pump && state.pump > 0) {
      this.gun.userData.pump.position.z = -0.16 + Math.sin(state.pump * Math.PI) * 0.08;
    }
    if (this.gun?.userData.mag && state.reloading) {
      this.gun.userData.mag.position.y = -0.05 - Math.sin(state.reloadP * Math.PI) * 0.12;
    }
  }
}

export function sleeveFor(op) {
  return { raven: 0x6a3030, ghost: 0x1e3330, iron: 0x4a4034, hawk: 0x243044 }[op] || 0x2a3340;
}
