import * as THREE from 'three';

const geos = new Map();
function geo(key, make) {
  if (!geos.has(key)) geos.set(key, make());
  return geos.get(key);
}

function capDown(r, len, seg = 6) {
  return geo(`cap${r}x${len}x${seg}`, () => {
    const g = new THREE.CapsuleGeometry(r, len, 2, seg);
    g.translate(0, -(len * 0.5 + r), 0);
    return g;
  });
}

function mat(color, rough = 0.72, metal = 0.08, em = 0x000000, emI = 0) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, emissive: em, emissiveIntensity: emI,
  });
}

const LOOK = {
  soldier: { cloth: 0x2a3038, armor: 0x3c434c, skin: 0x8d6a4e, hair: 0x1a140f, visor: 0xff3344, visorI: 1.5, helm: true },
  rusher: { cloth: 0x3a2a22, armor: 0x4a3428, skin: 0x7a5a42, hair: 0x1c120c, visor: 0xff6633, visorI: 1.3, helm: true, light: true },
  sniper: { cloth: 0x2a3830, armor: 0x243028, skin: 0x8a684c, hair: 0x1a1612, visor: 0x39e0a0, visorI: 0.35, helm: true, cloak: true },
  heavy: { cloth: 0x4a3028, armor: 0x6e737a, skin: 0x8a6848, hair: 0x2a241c, visor: 0xffcc66, visorI: 1.1, helm: true, bulk: true },
  boss: { cloth: 0x3a1820, armor: 0x6a2230, skin: 0x6a4a38, hair: 0x111, visor: 0xffcc44, visorI: 2.2, helm: true, coat: true },
  civilian: { cloth: 0x3d4e62, armor: 0x2c3848, skin: 0xc49a78, hair: 0x2a1c14, visor: 0x000000, visorI: 0, helm: false },
};

function varyColor(hex, seed) {
  const c = new THREE.Color(hex);
  const n = ((Math.abs(seed) * 13) % 17) / 17 - 0.5;
  c.offsetHSL(n * 0.03, 0, n * 0.08);
  return c;
}

function put(parent, geometry, material, x, y, z, zone, hits, shadow = false) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (zone && hits) hits.push({ mesh, zone, mult: zone === 'leg' ? 0.75 : 1 });
  return mesh;
}

function npcGun(kind, dark, steel) {
  const g = new THREE.Group();
  const len = kind === 'sniper' ? 0.78 : kind === 'rusher' ? 0.36 : kind === 'heavy' ? 0.55 : 0.5;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, len), dark);
  body.position.z = -len * 0.32;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, len * 0.62, 8), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -len * 0.62);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.045), dark);
  mag.position.set(0, -0.08, -0.02);
  g.add(body, barrel, mag);
  if (kind === 'sniper') {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), steel);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.08, -0.08);
    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(0.016, 10),
      mat(0x17343a, 0.15, 0.4, 0x39e0a0, 0.8),
    );
    glass.position.set(0, 0.08, -0.18);
    g.add(scope, glass);
  } else {
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.06), steel);
    sight.position.set(0, 0.07, -0.04);
    g.add(sight);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function buildHuman(kind = 'soldier', seed = 0) {
  const spec = LOOK[kind] || LOOK.soldier;
  const g = new THREE.Group();
  const hits = [];
  const clothC = varyColor(spec.cloth, seed);
  const cloth = mat(clothC, 0.86, 0.03);
  const armor = mat(varyColor(spec.armor, seed + 3), spec.bulk ? 0.38 : 0.48, spec.bulk ? 0.62 : 0.42);
  const skin = mat(varyColor(spec.skin, seed + 1), 0.64, 0.02);
  const dark = mat(0x16181c, 0.55, 0.35);
  const steel = mat(0x8b9298, 0.32, 0.78);
  const torsoMat = armor.clone();
  const headMat = (spec.helm ? armor : skin).clone();
  torsoMat.emissive = new THREE.Color(0x000000);
  headMat.emissive = new THREE.Color(0x000000);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(spec.bulk ? 0.46 : 0.36, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  g.add(shadow);

  const hips = new THREE.Group();
  hips.position.y = spec.bulk ? 0.9 : 0.86;
  g.add(hips);
  put(hips, new THREE.BoxGeometry(0.28, 0.12, 0.18), cloth, 0, 0.02, 0, 'body', hits, true);

  function leg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (spec.bulk ? 0.12 : 0.1), 0, 0);
    put(pivot, capDown(spec.bulk ? 0.085 : 0.07, 0.26), cloth, 0, 0, 0, 'leg', hits, true);
    const knee = new THREE.Group();
    knee.position.y = -0.36;
    put(knee, capDown(0.055, 0.26), cloth, 0, 0, 0.015, 'leg', hits, true);
    put(knee, new THREE.BoxGeometry(0.11, 0.09, 0.24), dark, 0, -0.32, 0.04, 'leg', hits);
    put(knee, new THREE.BoxGeometry(0.1, 0.07, 0.06), armor, 0, -0.02, -0.055, 'leg', hits);
    pivot.add(knee);
    hips.add(pivot);
    return { pivot, knee };
  }
  const left = leg(-1);
  const right = leg(1);

  const chest = new THREE.Group();
  chest.position.y = 0.1;
  hips.add(chest);

  const torso = put(chest, new THREE.CapsuleGeometry(spec.bulk ? 0.2 : 0.16, 0.3, 3, 8), torsoMat, 0, 0.26, 0, 'body', hits, true);
  const plate = put(chest, new THREE.BoxGeometry(spec.bulk ? 0.34 : 0.28, 0.32, 0.07), armor, 0, 0.3, -0.13, 'body', hits, true);
  put(chest, new THREE.BoxGeometry(0.22, 0.06, 0.04), dark, 0, 0.16, -0.17, 'body', hits);
  for (let i = -1; i <= 1; i++) {
    put(chest, new THREE.BoxGeometry(0.065, 0.09, 0.045), dark, i * 0.075, 0.08, -0.17, 'body', hits);
  }
  put(chest, new THREE.BoxGeometry(0.13, 0.05, 0.14), armor, -0.22, 0.44, 0, 'body', hits, true);
  put(chest, new THREE.BoxGeometry(spec.bulk ? 0.16 : 0.12, 0.055, 0.15), armor, 0.22, 0.44, 0, 'body', hits, true);
  put(chest, new THREE.BoxGeometry(0.16, 0.18, 0.08), cloth, 0, 0.28, 0.12, 'body', hits);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 5), steel);
  antenna.position.set(-0.16, 0.62, 0.04);
  chest.add(antenna);

  if (spec.cloak) {
    put(chest, new THREE.BoxGeometry(0.42, 0.7, 0.04), cloth, 0, 0.1, 0.16, 'body', hits);
    put(chest, new THREE.BoxGeometry(0.08, 0.22, 0.04), cloth, -0.16, 0.22, 0.14, 'body', hits);
    put(chest, new THREE.BoxGeometry(0.08, 0.18, 0.04), cloth, 0.15, 0.05, 0.15, 'body', hits);
  }
  if (spec.coat) {
    put(chest, new THREE.BoxGeometry(0.16, 0.62, 0.04), mat(0x4a1822, 0.8, 0.1), -0.18, 0.02, 0.08, 'body', hits);
    put(chest, new THREE.BoxGeometry(0.16, 0.62, 0.04), mat(0x4a1822, 0.8, 0.1), 0.18, 0.02, 0.08, 'body', hits);
  }

  function arm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (spec.bulk ? 0.28 : 0.24), 0.4, 0);
    put(pivot, capDown(spec.bulk ? 0.055 : 0.046, 0.18), cloth, 0, 0, 0, 'body', hits, true);
    const elbow = new THREE.Group();
    elbow.position.y = -0.26;
    put(elbow, capDown(0.04, 0.18), cloth, 0, 0, 0, 'body', hits);
    put(elbow, new THREE.SphereGeometry(0.042, 8, 6), dark, side * 0.01, -0.24, -0.02, 'body', hits);
    if (spec.bulk && side < 0) {
      put(elbow, new THREE.BoxGeometry(0.16, 0.28, 0.04), armor, -0.06, -0.08, -0.04, 'body', hits, true);
    }
    pivot.add(elbow);
    chest.add(pivot);
    return pivot;
  }
  const leftArm = arm(-1);
  const rightArm = arm(1);
  if (kind !== 'civilian') {
    rightArm.rotation.x = -0.72;
    rightArm.rotation.z = -0.18;
    leftArm.rotation.x = -0.42;
    leftArm.rotation.z = 0.28;
  } else {
    leftArm.rotation.z = 0.08;
    rightArm.rotation.z = -0.08;
  }

  const neck = new THREE.Group();
  neck.position.y = 0.5;
  chest.add(neck);
  const head = put(neck, new THREE.SphereGeometry(0.105, 16, 12), headMat, 0, 0.13, 0, 'head', hits, true);
  if (spec.helm) {
    const helm = put(
      neck,
      new THREE.SphereGeometry(0.124, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      armor,
      0, 0.16, 0.01,
      'head', hits, true,
    );
    helm.castShadow = true;
    const visorMat = mat(spec.visor, 0.18, 0.35, spec.visor, spec.visorI);
    put(neck, new THREE.BoxGeometry(spec.bulk ? 0.18 : 0.15, spec.bulk ? 0.07 : 0.04, 0.035), visorMat, 0, 0.14, -0.1, 'head', hits);
    put(neck, new THREE.BoxGeometry(0.04, 0.03, 0.05), dark, -0.1, 0.2, 0.02, 'head', hits);
  } else {
    const hair = mat(seed % 2 ? 0x1a120e : spec.hair, 0.8, 0.02);
    put(neck, new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.17, seed % 2 ? -0.01 : 0.02, 'head', hits);
    if (seed % 2 === 0) {
      put(neck, new THREE.SphereGeometry(0.06, 10, 8), hair, 0.02, 0.12, 0.06, 'head', hits);
    }
    const eyeMat = mat(0x1c2430, 0.3, 0.1);
    put(neck, new THREE.SphereGeometry(0.012, 6, 6), eyeMat, -0.035, 0.14, -0.09, 'head', hits);
    put(neck, new THREE.SphereGeometry(0.012, 6, 6), eyeMat, 0.035, 0.14, -0.09, 'head', hits);
    if (seed % 2) put(neck, new THREE.BoxGeometry(0.06, 0.02, 0.02), mat(0x3a2a22), 0, 0.07, -0.09, 'head', hits);
  }

  let gun = null;
  if (kind !== 'civilian') {
    gun = npcGun(kind, dark, steel);
    gun.position.set(0.1, 0.2, -0.22);
    chest.add(gun);
    gun.traverse((o) => {
      if (o.isMesh) hits.push({ mesh: o, zone: 'body', mult: 1 });
    });
  }

  g.userData.parts = {
    leftLeg: left.pivot,
    rightLeg: right.pivot,
    kneeL: left.knee,
    kneeR: right.knee,
    leftArm,
    rightArm,
    torso,
    head,
    plate,
    gun,
  };
  g.userData.hitMeshes = hits;
  g.userData.restArm = kind === 'civilian' ? 0.05 : -0.72;
  g.userData.restArmL = kind === 'civilian' ? 0.05 : -0.42;
  return g;
}
