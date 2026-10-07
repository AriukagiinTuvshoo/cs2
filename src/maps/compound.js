import { PAL } from '../content.js';
import { building, perimeter, stairs, platform, box } from '../builders.js';

export function compoundMap() {
  const boxes = [];
  const buildings = [];
  const navExtra = [];
  const add = (r) => {
    if (!r) return;
    if (Array.isArray(r)) boxes.push(...r);
    else if (r.boxes || r.meta || r.nav) {
      if (r.boxes) boxes.push(...r.boxes);
      if (r.meta) buildings.push(r.meta);
      if (r.nav) navExtra.push(...r.nav);
    } else boxes.push(r);
  };

  add(perimeter({
    minX: -34, maxX: 34, minZ: -42, maxZ: 36, h: 5.4,
    gaps: [{ side: 's', at: 0, w: 8 }],
    color: 0x2e3540,
  }));

  add(building({
    x: 15, z: -6, w: 16, d: 13, h: 4.3, door: ['s', 'w'], color: 0x6d7580, id: 'command',
  }));
  add(building({
    x: -16, z: -8, w: 15, d: 14, h: 4.1, door: ['e', 'n'], color: 0x5e675f, id: 'barracks',
  }));
  add(building({
    x: 1, z: -27, w: 13, d: 11, h: 4.2, door: ['n', 'e'], color: 0x6a5c52, id: 'armory',
  }));
  add(building({
    x: -20, z: -32, w: 8, d: 7, h: 3.6, door: 's', color: 0x4d5964, id: 'comms',
  }));

  const nest = platform(-24, -30, 6.5, 6.5, 3.2);
  add(nest);
  add(stairs({ x: -24, z: -26.2, dir: 's', steps: 8, stepH: 0.4, stepD: 0.42, width: 2.2, id: 'nest' }));
  add(box(-27.2, 1.7, -30, 0.35, 3.4, 6.2, 'metal', 0x3c444c));
  add(box(-20.8, 1.7, -30, 0.35, 3.4, 6.2, 'metal', 0x3c444c));

  add(box(0, 0.55, 6, 3.2, 1.1, 1.2, 'concrete', 0x7d858e));
  add(box(-6, 0.9, 2, 1.4, 1.8, 1.4, 'concrete', 0x6a727c));

  const props = [
    { t: 'crate', x: 5, z: 18, s: 1.15 },
    { t: 'crate', x: 6.2, z: 18.2, s: 0.85 },
    { t: 'crate', x: -6, z: 16, s: 1.2 },
    { t: 'crate', x: 9, z: 8, s: 1.1 },
    { t: 'crate', x: -9, z: 6, s: 1.05 },
    { t: 'crate', x: 16, z: -12, s: 1.1 },
    { t: 'crate', x: -14, z: -14, s: 1 },
    { t: 'crate', x: 2, z: -30, s: 1.1 },
    { t: 'barrel', x: 7.2, z: 14, explosive: true },
    { t: 'barrel', x: -11, z: 11, explosive: true },
    { t: 'barrel', x: 8, z: -22, explosive: true },
    { t: 'barrel', x: -18, z: -4 },
    { t: 'lamp', x: 0, z: 22 },
    { t: 'lamp', x: -12, z: 8 },
    { t: 'lamp', x: 14, z: 8 },
    { t: 'lamp', x: 0, z: -16 },
    { t: 'lamp', x: 22, z: -16 },
    { t: 'lamp', x: -28, z: -16 },
    { t: 'dumpster', x: 24, z: 14, rot: 1 },
    { t: 'barrier', x: -3, z: 24, rot: 1 },
    { t: 'barrier', x: 3.2, z: 24, rot: 1 },
    { t: 'sandbag', x: -24, z: -27.6, rot: 0 },
    { t: 'sandbag', x: -22.2, z: -32.6, rot: 1 },
    { t: 'generator', x: -20, z: -29 },
    { t: 'antenna', x: -20, z: -34.2 },
    { t: 'helipad', x: 14, z: -35 },
    { t: 'van', x: 14, z: -35, rot: 0, color: 0x1c2420 },
    { t: 'car', x: 26, z: 6, rot: 0, color: 0x1a1c22 },
    { t: 'car', x: -28, z: 10, rot: 1, color: 0x3a201c },
    { t: 'med', x: -2, z: 10 },
    { t: 'med', x: 16, z: -10 },
    { t: 'armor', x: 0, z: -22 },
    { t: 'ammo', x: 10, z: 16 },
    { t: 'ammo', x: -16, z: -14 },
  ];

  const enemies = [
    { id: 'g1', type: 'soldier', x: -5, z: 22, yaw: 0, patrol: [[-5, 22], [5, 20], [0, 16]] },
    { id: 'g2', type: 'soldier', x: 8, z: 12, yaw: Math.PI, patrol: [[8, 12], [2, 8], [10, 6]] },
    { id: 'g3', type: 'soldier', x: -8, z: 4, patrol: [[-8, 4], [-2, 0], [-12, 2]] },
    { id: 'c1', type: 'soldier', x: 10, z: 2, patrol: [[10, 2], [6, -2]] },
    { id: 'c2', type: 'soldier', x: 16, z: -10, yaw: Math.PI },
    { id: 'b1', type: 'soldier', x: -8, z: -4, patrol: [[-8, -4], [-10, -8]] },
    { id: 'b2', type: 'rusher', x: -18, z: -12 },
    { id: 'b3', type: 'soldier', x: -14, z: -2 },
    { id: 'a1', type: 'soldier', x: 1, z: -20, patrol: [[1, -20], [6, -18]] },
    { id: 'a2', type: 'heavy', x: 2, z: -29, yaw: Math.PI },
    { id: 'sn', type: 'sniper', x: -24, z: -30, y: 3.2, yaw: 0, hold: true },
    { id: 'r1', type: 'soldier', x: -22, z: -32 },
    { id: 'e1', type: 'soldier', x: 22, z: -8, patrol: [[22, -8], [26, 2], [20, 8]] },
    { id: 'x1', type: 'soldier', x: 8, z: -34, patrol: [[8, -34], [18, -32]] },
  ];

  return {
    id: 'compound',
    sky: 'night',
    bounds: { minX: -34, maxX: 34, minZ: -42, maxZ: 36 },
    player: { x: 0, y: 0, z: 30, yaw: 0 },
    boxes, buildings, navExtra, props, enemies,
    zones: {
      gate: { x: 0, z: 24, r: 5 },
      radio: { x: -20, z: -32, r: 2.1 },
      intel: { x: 16, z: -9, r: 1.7 },
      armory: { x: 1, z: -28, r: 2.1 },
      extract: { x: 14, z: -35, r: 4.6 },
    },
    lights: [
      { x: -20, y: 2.4, z: -32, color: 0x7ec8ff, intensity: 1.4, distance: 10 },
    ],
    checks: [
      { x: 0, z: 30, label: 'spawn' },
      { x: 15, z: 1.2, label: 'command door' },
      { x: -8.2, z: -8, label: 'barracks door' },
      { x: 1, z: -21.2, label: 'armory door' },
      { x: -20, z: -28.2, label: 'comms door' },
      { x: 16, z: -9, label: 'intel' },
    ],
  };
}
