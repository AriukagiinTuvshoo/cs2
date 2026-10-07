import * as THREE from 'three';

function mat(color, rough = 0.7, metal = 0.15, em = 0x000000, emI = 0) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, metalness: metal, emissive: em, emissiveIntensity: emI,
  });
}

function mesh(geo, material, x, y, z, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function createProp(prop, textures) {
  const g = new THREE.Group();
  g.position.set(prop.x, prop.y || 0, prop.z);
  g.rotation.y = ((prop.rot || 0) % 4) * Math.PI / 2;
  g.userData.prop = prop;

  switch (prop.t) {
    case 'crate': {
      const s = prop.s || 1.1;
      const m = mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({
        map: textures.crate, normalMap: textures.crateN, roughness: 0.78, metalness: 0.05,
      }), 0, s / 2, 0, g);
      m.castShadow = true;
      break;
    }
    case 'barrel': {
      const color = prop.explosive ? 0x8a2a22 : 0x3a4248;
      const body = mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.02, 12), mat(color, 0.55, 0.35), 0, 0.52, 0, g);
      mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 12), mat(0x222), 0, 0.98, 0, g);
      if (prop.explosive) {
        body.material.emissive = new THREE.Color(0x441108);
        body.material.emissiveIntensity = 0.4;
      }
      break;
    }
    case 'car':
    case 'van': {
      const van = prop.t === 'van';
      const color = prop.color || 0x1c1e24;
      const bodyH = van ? 1.35 : 0.62;
      const bodyY = van ? 1.05 : 0.62;
      const len = van ? 4.6 : 4.15;
      mesh(new THREE.BoxGeometry(1.8, bodyH, len), mat(color, 0.45, 0.4), 0, bodyY, 0, g);
      mesh(new THREE.BoxGeometry(1.55, van ? 0.7 : 0.48, van ? 2.1 : 1.8), mat(0x0c1218, 0.2, 0.5), 0, bodyY + bodyH * 0.55, van ? -0.2 : -0.15, g);
      const wheel = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
      const wm = mat(0x151515, 0.9, 0.1);
      [[-0.85, 0.32, -1.35], [0.85, 0.32, -1.35], [-0.85, 0.32, 1.35], [0.85, 0.32, 1.35]].forEach(([x, y, z]) => {
        const wh = mesh(wheel, wm, x, y, z, g);
        wh.rotation.z = Math.PI / 2;
      });
      mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), mat(0xfff1c2, 0.4, 0.2, 0xfff1c2, 0.8), -0.55, bodyY, -len / 2, g);
      mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), mat(0xfff1c2, 0.4, 0.2, 0xfff1c2, 0.8), 0.55, bodyY, -len / 2, g);
      mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), mat(0xff2233, 0.4, 0.2, 0xff2233, 0.9), -0.55, bodyY, len / 2, g);
      mesh(new THREE.BoxGeometry(0.4, 0.1, 0.06), mat(0xff2233, 0.4, 0.2, 0xff2233, 0.9), 0.55, bodyY, len / 2, g);
      break;
    }
    case 'truck': {
      const color = prop.color || 0x6a3028;
      mesh(new THREE.BoxGeometry(2.3, 1.3, 2.3), mat(color, 0.5, 0.3), 0, 1.15, -2.2, g);
      mesh(new THREE.BoxGeometry(2.35, 1.7, 4.4), mat(0x2a3036, 0.6, 0.25), 0, 1.45, 1.1, g);
      mesh(new THREE.BoxGeometry(2.1, 0.35, 6.6), mat(0x1a1c20, 0.8, 0.2), 0, 0.45, 0, g);
      const light = new THREE.SpotLight(0xffe0b0, 22, 18, 0.5, 0.5, 1);
      light.position.set(0, 1.1, -3.5);
      light.target.position.set(0, 0.4, -8);
      g.add(light);
      g.add(light.target);
      break;
    }
    case 'lamp': {
      mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.1, 6), mat(0x2a2e32, 0.5, 0.6), 0, 2.05, 0, g);
      const head = mesh(new THREE.BoxGeometry(0.45, 0.12, 0.45), mat(0xffc98a, 0.4, 0.2, 0xffb060, 1.4), 0, 4.15, 0, g);
      head.castShadow = false;
      break;
    }
    case 'dumpster':
      mesh(new THREE.BoxGeometry(1.35, 1.25, 2.3), mat(0x1e6b45, 0.6, 0.25), 0, 0.7, 0, g);
      break;
    case 'barrier':
      mesh(new THREE.BoxGeometry(0.5, 0.85, 2), mat(0xc4c8cc, 0.55, 0.15), 0, 0.45, 0, g);
      break;
    case 'sandbag':
      mesh(new THREE.BoxGeometry(0.66, 0.62, 1.6), mat(0x6a6248, 0.95, 0), 0, 0.34, 0, g);
      break;
    case 'container':
      mesh(new THREE.BoxGeometry(2.4, 2.45, 6), mat(prop.color || 0x8f2d2a, 0.55, 0.35), 0, 1.25, 0, g);
      break;
    case 'counter':
      mesh(new THREE.BoxGeometry(0.68, 1.05, prop.w || 4.5), mat(0x2a2428, 0.45, 0.2), 0, 0.55, 0, g);
      break;
    case 'generator':
      mesh(new THREE.BoxGeometry(1.25, 1.05, 0.75), mat(0x3a4046, 0.5, 0.4), 0, 0.55, 0, g);
      break;
    case 'antenna':
      mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.6, 6), mat(0x889, 0.4, 0.7), 0, 2.3, 0, g);
      mesh(new THREE.BoxGeometry(0.5, 0.08, 0.08), mat(0x222), 0, 4.3, 0, g);
      break;
    case 'helipad': {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 3.7, 28),
        new THREE.MeshBasicMaterial({ color: 0xf0a202, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      g.add(ring);
      break;
    }
    case 'neon': {
      const tex = textures.sign(prop.text || 'OPEN', prop.color || '#39f0d0');
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 0.85),
        new THREE.MeshStandardMaterial({
          map: tex, emissiveMap: tex, emissive: new THREE.Color(prop.color || '#39f0d0'),
          emissiveIntensity: 1.3, roughness: 0.4, metalness: 0.2,
        }),
      );
      plane.position.y = prop.y || 3;
      g.add(plane);
      g.userData.light = { color: prop.color || '#39f0d0', y: (prop.y || 3) };
      break;
    }
    case 'billboard': {
      const tex = textures.sign(prop.text || 'ASH', prop.color || '#ff3355');
      mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 6), mat(0x222), 0, 1.6, 0, g);
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.5),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.1, emissive: 0x220008, emissiveIntensity: 0.4 }),
      );
      board.position.y = 3.3;
      g.add(board);
      break;
    }
    case 'locker':
      mesh(new THREE.BoxGeometry(0.8, 1.7, 0.5), mat(0x2a3340, 0.45, 0.4, 0x1144aa, 0.25), 0, 0.9, 0, g);
      break;
    case 'device': {
      mesh(new THREE.BoxGeometry(0.55, 0.28, 0.4), mat(0x1a1c20, 0.4, 0.5), 0, 0.2, 0, g);
      const blink = mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat(0xff2244, 0.4, 0.2, 0xff2244, 2), 0, 0.4, 0, g);
      g.userData.blink = blink;
      break;
    }
    case 'rock':
      mesh(new THREE.DodecahedronGeometry(0.7, 0), mat(0x6a645c, 0.95, 0), 0, 0.4, 0, g);
      break;
    case 'pallet':
      mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), mat(0x8a6840, 0.9, 0), 0, 0.08, 0, g);
      break;
    case 'cone':
      mesh(new THREE.ConeGeometry(0.18, 0.45, 8), mat(0xe07020, 0.6, 0.1), 0, 0.25, 0, g);
      break;
    case 'med':
    case 'armor':
    case 'ammo': {
      const color = prop.t === 'med' ? 0x2fbf71 : prop.t === 'armor' ? 0x3aa0ff : 0xe0b15a;
      const m = mesh(new THREE.BoxGeometry(0.38, 0.28, 0.28), mat(color, 0.45, 0.2, color, 0.7), 0, 0.4, 0, g);
      g.userData.bob = m;
      g.userData.pickup = prop.t;
      break;
    }
    case 'desk':
      mesh(new THREE.BoxGeometry(1.4, 0.08, 0.7), mat(0x6a5438, 0.7, 0.05), 0, 0.78, 0, g);
      mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), mat(0x3a3a3a), -0.6, 0.37, 0.28, g);
      mesh(new THREE.BoxGeometry(0.08, 0.74, 0.08), mat(0x3a3a3a), 0.6, 0.37, -0.28, g);
      break;
    case 'target': {
      const stand = mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), mat(0x222), 0, 0.75, 0, g);
      stand.castShadow = true;
      const plate = mesh(new THREE.BoxGeometry(0.7, 0.9, 0.06), mat(0xd8d2c4, 0.5, 0.1), 0, 1.35, 0, g);
      const head = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), mat(0xe23b3b, 0.4, 0.2), 0, 1.7, 0.04, g);
      head.rotation.x = Math.PI / 2;
      g.userData.plate = plate;
      g.userData.head = head;
      break;
    }
    default:
      return null;
  }
  return g;
}

export function lampLightInfo(prop) {
  if (prop.t === 'lamp') return { x: prop.x, y: 4.1, z: prop.z, color: 0xffb060, intensity: 2.4, distance: 14 };
  if (prop.t === 'neon') return { x: prop.x, y: prop.y || 3, z: prop.z, color: prop.color || 0x39f0d0, intensity: 1.6, distance: 9 };
  return null;
}
