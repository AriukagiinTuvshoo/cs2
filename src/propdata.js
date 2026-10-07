export function collidersFor(prop) {
  if (prop.noCollide) return [];
  const rot = ((prop.rot || 0) % 4 + 4) % 4;
  const raw = rawColliders(prop);
  return raw.map((c) => applyRot(c, rot, prop.x, prop.y || 0, prop.z));
}

function rawColliders(prop) {
  switch (prop.t) {
    case 'crate': {
      const s = prop.s || 1.1;
      return [{ x: 0, y: s / 2, z: 0, w: s, h: s, d: s }];
    }
    case 'barrel':
      return [{ x: 0, y: 0.52, z: 0, w: 0.68, h: 1.04, d: 0.68 }];
    case 'car':
      return [{ x: 0, y: 0.7, z: 0, w: 1.9, h: 1.35, d: 4.35 }];
    case 'van':
      return [{ x: 0, y: 1.05, z: 0, w: 2.05, h: 2.05, d: 4.8 }];
    case 'truck':
      return [{ x: 0, y: 1.35, z: 0, w: 2.4, h: 2.6, d: 7.2 }];
    case 'lamp':
      return [{ x: 0, y: 2.1, z: 0, w: 0.18, h: 4.2, d: 0.18 }];
    case 'dumpster':
      return [{ x: 0, y: 0.7, z: 0, w: 1.4, h: 1.4, d: 2.4 }];
    case 'barrier':
      return [{ x: 0, y: 0.45, z: 0, w: 0.55, h: 0.9, d: 2.05 }];
    case 'sandbag':
      return [{ x: 0, y: 0.34, z: 0, w: 0.7, h: 0.68, d: 1.7 }];
    case 'container':
      return [{ x: 0, y: 1.25, z: 0, w: 2.45, h: 2.5, d: 6.1 }];
    case 'counter':
      return [{ x: 0, y: 0.55, z: 0, w: 0.7, h: 1.1, d: prop.w || 4.5 }];
    case 'generator':
      return [{ x: 0, y: 0.55, z: 0, w: 1.3, h: 1.1, d: 0.8 }];
    case 'antenna':
      return [{ x: 0, y: 2.2, z: 0, w: 0.22, h: 4.4, d: 0.22 }];
    case 'locker':
      return [{ x: 0, y: 0.9, z: 0, w: 0.85, h: 1.8, d: 0.55 }];
    case 'device':
      return [{ x: 0, y: 0.35, z: 0, w: 0.7, h: 0.7, d: 0.7 }];
    case 'rock':
      return [{ x: 0, y: 0.45, z: 0, w: 1.4, h: 0.9, d: 1.1 }];
    case 'pillar': {
      const h = prop.h || 4;
      const s = prop.s || 0.45;
      return [{ x: 0, y: h / 2, z: 0, w: s, h, d: s }];
    }
    default:
      return [];
  }
}

function applyRot(c, rot, px, py, pz) {
  const theta = rot * Math.PI / 2;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const nx = c.x * cos + c.z * sin;
  const nz = -c.x * sin + c.z * cos;
  let w = c.w;
  let d = c.d;
  if (rot % 2) {
    w = c.d;
    d = c.w;
  }
  return {
    x: px + nx,
    y: py + c.y,
    z: pz + nz,
    w,
    h: c.h,
    d,
  };
}
