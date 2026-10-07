import { PAL } from '../content.js';
import { building, stairs, slab, box } from '../builders.js';

export function officeMap() {
  const boxes = [];
  const buildings = [];
  const navExtra = [];
  const add = (r) => {
    if (Array.isArray(r)) boxes.push(...r);
    else if (r.boxes || r.meta || r.nav) {
      if (r.boxes) boxes.push(...r.boxes);
      if (r.meta) buildings.push(r.meta);
      if (r.nav) navExtra.push(...r.nav);
    } else boxes.push(r);
  };

  add(building({
    x: 0, z: 0, w: 36, d: 28, h: 7.3, door: ['s', 'e'], doorW: 4, doorOff: { s: -4 },
    color: 0x6e787f, id: 'meridian',
  }));

  const floorY = 3.25;
  add(slab(-6, 4, 20, 16, floorY, 0.24, 'concrete', 0x4a525c));
  add(slab(10, 2, 12, 20, floorY, 0.24, 'concrete', 0x4a525c));
  add(slab(-4, -9, 24, 8, floorY, 0.24, 'concrete', 0x4a525c));

  add(box(2, 1.6, -2, 0.4, 3.2, 10, 'concrete', 0x5c656e));
  add(box(-6, 1.6, 4, 10, 3.2, 0.4, 'concrete', 0x5c656e));
  add(box(8, 4.85, 4, 0.4, 3.1, 12, 'concrete', 0x5a636c));
  add(box(2, 4.85, -2, 12, 3.1, 0.4, 'concrete', 0x5a636c));

  add(stairs({
    x: -14, z: 2, dir: 'n', steps: 8, stepH: 0.4, stepD: 0.5, width: 2.4, id: 'office-stair',
  }));

  add(box(12, 0.55, 8, 4.2, 1.1, 0.8, 'metal', 0x3e4650));
  add(box(-8, 0.55, -6, 3.4, 1.1, 0.8, 'metal', 0x3e4650));

  const props = [
    { t: 'crate', x: 6, z: 6, s: 1.05 },
    { t: 'crate', x: -4, z: 8, s: 1.1 },
    { t: 'crate', x: 12, z: -4, s: 1 },
    { t: 'crate', x: 4, z: 6, y: 3.25, s: 1 },
    { t: 'desk', x: 12, z: 6, y: 3.25 },
    { t: 'barrel', x: -10, z: -8, explosive: true },
    { t: 'lamp', x: -16, z: 16 },
    { t: 'lamp', x: 16, z: 16 },
    { t: 'med', x: 0, z: 8 },
    { t: 'med', x: 10, z: 8, y: 3.25 },
    { t: 'armor', x: -8, z: 2 },
    { t: 'ammo', x: 8, z: -6 },
    { t: 'van', x: -12, z: 20, rot: 0, color: 0x163028 },
    { t: 'car', x: 8, z: 20, rot: 1, color: 0x1a1c22 },
    { t: 'dumpster', x: 16, z: 18, rot: 0 },
    { t: 'neon', x: 0, y: 3.4, z: 14.2, rot: 0, text: 'MERIDIAN', color: '#d8e4ee' },
  ];

  const enemies = [
    { id: 'l1', type: 'soldier', x: -2, z: 8, patrol: [[-2, 8], [4, 6]] },
    { id: 'l2', type: 'soldier', x: 8, z: 4 },
    { id: 'l3', type: 'soldier', x: -8, z: -4 },
    { id: 'l4', type: 'rusher', x: 12, z: -6 },
    { id: 'l5', type: 'soldier', x: 4, z: -8 },
    { id: 'u1', type: 'soldier', x: 6, z: 6, y: 3.25 },
    { id: 'u2', type: 'soldier', x: 12, z: 2, y: 3.25, patrol: [[12, 2, 3.25], [14, 8, 3.25]] },
    { id: 'u3', type: 'sniper', x: 14, z: -6, y: 3.25, hold: true, yaw: Math.PI },
    { id: 'l6', type: 'heavy', x: -12, z: 6 },
  ];

  const hostages = [
    { id: 'ana', name: 'ANA', x: 13, z: -8, y: 0 },
    { id: 'bor', name: 'BOR', x: 10, z: 8, y: 3.25 },
  ];

  return {
    id: 'office',
    sky: 'night',
    bounds: { minX: -22, maxX: 22, minZ: -16, maxZ: 24 },
    player: { x: 0, y: 0, z: 20, yaw: 0 },
    boxes, buildings, navExtra, props, enemies, hostages,
    navFloors: [
      { y: 0 },
      { y: 3.25, area: { minX: -16, maxX: 16, minZ: -12, maxZ: 12 } },
    ],
    navLinks: [
      { a: { x: -14, y: 0, z: 4 }, b: { x: -14, y: 0.4, z: 1.6 } },
      { a: { x: -14, y: 3.2, z: -2.2 }, b: { x: -8, y: 3.25, z: 2 } },
    ],
    zones: {
      door: { x: -4, z: 13.2, r: 3 },
      extract: { x: -12, z: 20, r: 3.5 },
    },
    checks: [
      { x: 0, z: 20, label: 'spawn' },
      { x: -4, z: 13.2, label: 'door' },
      { x: 13, z: -8, label: 'hostage A' },
      { x: 10, z: 8, y: 3.25, label: 'hostage B' },
    ],
  };
}
