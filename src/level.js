import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createProp, lampLightInfo } from './props.js';
import { getTextures } from './textures.js';

const SKY = {
  night: { bg: 0x070b14, fog: 0x0b1220, near: 28, far: 120, hemi: [0x8aa4d8, 0x3a2818, 1.35], sun: [0xd5e2ff, 1.85], exposure: 1.22, stars: true },
  storm: { bg: 0x100a16, fog: 0x120c18, near: 20, far: 90, hemi: [0x8a74c0, 0x2a1820, 1.05], sun: [0xc4c8dc, 1.25], exposure: 1.16, stars: false, rain: true },
  dusk: { bg: 0x3a2418, fog: 0x4a2c1c, near: 28, far: 130, hemi: [0xffb088, 0x4a3020, 1.15], sun: [0xffc090, 2.6], exposure: 1.05, stars: false },
  day: { bg: 0x8ec0ea, fog: 0xd5e2ee, near: 50, far: 160, hemi: [0xd4e6ff, 0xe4d4ac, 1.2], sun: [0xfff6e0, 3.1], exposure: 1.0, stars: false },
};

function skyDome(top, mid, bot) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top);
  grd.addColorStop(0.45, mid);
  grd.addColorStop(1, bot);
  g.fillStyle = grd;
  g.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(190, 18, 12),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false }),
  );
  return mesh;
}

export function buildLevelView(spec) {
  const textures = getTextures();
  const sky = SKY[spec.sky] || SKY.night;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sky.bg);
  scene.fog = new THREE.Fog(sky.fog, sky.near, sky.far);
  const domeColors = {
    night: ['#05070e', '#10182c', '#1a2438'],
    storm: ['#07060c', '#16101c', '#1c1420'],
    dusk: ['#2a140e', '#c46a3a', '#e7a06a'],
    day: ['#6aa6e0', '#b7d4f2', '#efe2c8'],
  }[spec.sky] || ['#05070e', '#10182c', '#1a2438'];
  scene.add(skyDome(...domeColors));

  if (sky.stars) {
    const n = 400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * 0.7;
      const r = 160;
      pos[i * 3] = Math.cos(u) * Math.cos(v) * r;
      pos[i * 3 + 1] = Math.sin(v) * r + 20;
      pos[i * 3 + 2] = Math.sin(u) * Math.cos(v) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, sizeAttenuation: true })));
  }

  const hemi = new THREE.HemisphereLight(sky.hemi[0], sky.hemi[1], sky.hemi[2]);
  hemi.layers.enable(1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(sky.sun[0], sky.sun[1]);
  sun.position.set(28, 42, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.04;
  sun.layers.enable(1);
  scene.add(sun);
  scene.add(sun.target);

  const group = new THREE.Group();
  scene.add(group);

  const groundKind = spec.id === 'vault' ? 'sand' : spec.id === 'highway' ? 'dirt' : (spec.id === 'downtown' ? 'asphalt' : 'concrete');
  const gtex = textures[groundKind] || textures.concrete;
  const bounds = spec.bounds;
  const gw = bounds.maxX - bounds.minX + 8;
  const gd = bounds.maxZ - bounds.minZ + 8;
  const groundN = textures[`${groundKind}N`] || textures.concreteN;
  const groundMat = new THREE.MeshStandardMaterial({
    map: gtex,
    normalMap: groundN,
    normalScale: new THREE.Vector2(0.85, 0.85),
    color: groundKind === 'sand' ? 0xd7c094 : 0xffffff,
    roughness: spec.sky === 'storm' ? 0.42 : 0.9,
    metalness: spec.sky === 'storm' ? 0.22 : 0.04,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((bounds.minX + bounds.maxX) / 2, 0.0, (bounds.minZ + bounds.maxZ) / 2);
  ground.receiveShadow = true;
  group.add(ground);

  if (spec.id === 'downtown' || spec.id === 'highway') {
    const lineMat = new THREE.MeshBasicMaterial({ color: spec.id === 'highway' ? 0xe6d2a8 : 0xd8deea });
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.12, spec.id === 'highway' ? 120 : 70), lineMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.y = 0.03;
    group.add(stripe);
  }

  const buckets = new Map();
  const materials = [];
  for (const b of spec.boxes || []) {
    const key = `${b.mat || 'concrete'}|${b.color || 0}`;
    if (!buckets.has(key)) {
      const map = b.mat === 'metal' ? textures.metal : textures.concrete;
      const normalMap = b.mat === 'metal' ? textures.metalN : textures.concreteN;
      const material = new THREE.MeshStandardMaterial({
        map,
        normalMap,
        normalScale: new THREE.Vector2(b.mat === 'metal' ? 0.45 : 0.7, b.mat === 'metal' ? 0.45 : 0.7),
        color: b.color ?? 0xffffff,
        roughness: b.mat === 'metal' ? 0.38 : 0.86,
        metalness: b.mat === 'metal' ? 0.55 : 0.06,
        envMapIntensity: b.mat === 'metal' ? 1.1 : 0.55,
      });
      materials.push(material);
      buckets.set(key, { material, geos: [] });
    }
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    geo.translate(b.x, b.y, b.z);
    buckets.get(key).geos.push(geo);
  }
  const shootMeshes = [];
  for (const bucket of buckets.values()) {
    if (!bucket.geos.length) continue;
    const merged = mergeGeometries(bucket.geos, false);
    bucket.geos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, bucket.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.solid = true;
    group.add(mesh);
    shootMeshes.push(mesh);
  }

  const lamps = [];
  const propMeshes = [];
  const destructibles = [];
  for (const p of spec.props || []) {
    const obj = createProp(p, textures);
    if (!obj) continue;
    group.add(obj);
    propMeshes.push(obj);
    const info = lampLightInfo(p);
    if (info) lamps.push(info);
    if (p.explosive || p.t === 'locker' || p.t === 'device' || p.t === 'barrel') destructibles.push(obj);
  }

  const night = spec.sky === 'night' || spec.sky === 'storm';
  for (const b of spec.buildings || []) {
    addWindows(group, b, textures, night);
    if (b.roof !== false) {
      const hx = ((b.x * 13.1 + b.z * 7.3) % 1 + 1) % 1;
      const ac = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.5, metalness: 0.4 }),
      );
      ac.position.set(b.x + (hx - 0.5) * b.w * 0.4, b.y + b.h + 0.2, b.z);
      ac.castShadow = true;
      group.add(ac);
    }
    if (night && b.lit !== false) {
      lamps.push({ x: b.x, y: b.y + 2.2, z: b.z, color: 0xffc9a0, intensity: 1.3, distance: 11 });
    }
  }
  for (const l of spec.lights || []) lamps.push(l);

  const pool = Array.from({ length: 6 }, () => {
    const light = new THREE.PointLight(0xffb060, 0, 12, 2);
    scene.add(light);
    return light;
  });

  return {
    scene, group, sun, sky, lamps, pool, shootMeshes, propMeshes, destructibles, materials,
    dispose() {
      scene.traverse((obj) => {
        if (obj.geometry && !obj.userData?.keep) obj.geometry.dispose();
        if (obj.material) {
          const mats = [].concat(obj.material);
          mats.forEach((m) => {
            if (m.map && !m.map.userData.shared) m.map.dispose();
            if (m.emissiveMap && !m.emissiveMap.userData.shared) m.emissiveMap.dispose();
            m.dispose();
          });
        }
      });
    },
  };
}

function addWindows(group, b, textures, night) {
  const y0 = b.y + 2.2;
  const y1 = b.y + b.h - 0.45;
  const band = y1 - y0;
  if (band < 0.35) return;
  const face = textures.facade(b.x, b.z, night);
  const material = new THREE.MeshStandardMaterial({
    map: face.map,
    emissiveMap: face.em,
    emissive: 0xffffff,
    emissiveIntensity: night ? 0.9 : 0.18,
    roughness: 0.8,
    metalness: 0.05,
  });
  const y = (y0 + y1) / 2;
  const planes = [
    [b.w - 0.2, band, b.x, y, b.z + b.d / 2 + 0.04, 0],
    [b.w - 0.2, band, b.x, y, b.z - b.d / 2 - 0.04, Math.PI],
    [b.d - 0.2, band, b.x + b.w / 2 + 0.04, y, b.z, Math.PI / 2],
    [b.d - 0.2, band, b.x - b.w / 2 - 0.04, y, b.z, -Math.PI / 2],
  ];
  for (const [w, h, x, yy, z, rot] of planes) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, yy, z);
    mesh.rotation.y = rot;
    group.add(mesh);
  }
}

export function updateLamps(pool, lamps, px, pz) {
  const ranked = lamps
    .map((l) => ({ l, d: (l.x - px) ** 2 + (l.z - pz) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, pool.length);
  pool.forEach((light, i) => {
    const item = ranked[i];
    if (!item) {
      light.intensity = 0;
      return;
    }
    light.position.set(item.l.x, item.l.y, item.l.z);
    light.color.set(item.l.color);
    light.intensity = (item.l.intensity ?? 1.5) * 10;
    light.distance = item.l.distance ?? 12;
  });
}

export function updateSun(sun, player) {
  sun.target.position.set(player.x, 0, player.z);
  sun.position.set(player.x + 22, 36, player.z + 12);
  sun.target.updateMatrixWorld();
}
