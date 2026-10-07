import { PAL } from '../content.js';
import { building, box } from '../builders.js';

export function vaultMap() {
  const boxes = [];
  const buildings = [];
  const add = (r) => {
    if (r.boxes) boxes.push(...r.boxes);
    if (r.meta) buildings.push(r.meta);
  };

  add(building({
    x: -22, z: -6, w: 16, d: 14, h: 4.2, door: ['e', 's'], doorW: 3.8,
    color: PAL.stucco, roofColor: 0xc4a06a, id: 'siteA', lit: false,
  }));
  add(building({
    x: 8, z: 16, w: 12, d: 8, h: 3.6, door: 's',
    color: PAL.stuccoDark, id: 'midhut', lit: false,
  }));
  boxes.push(box(0, 0.7, 2, 6, 1.4, 1.1, 'concrete', 0xb7a888));
  boxes.push(box(-4, 0.55, 8, 2.2, 1.1, 2.2, 'concrete', 0xcbb892));
  boxes.push(box(18, 0.9, -4, 8, 1.8, 1.2, 'metal', 0x8a8172));

  const props = [
    { t: 'crate', x: -2, z: 4, s: 1.15 },
    { t: 'crate', x: 2, z: 6, s: 1.05 },
    { t: 'crate', x: -18, z: -8, s: 1.1 },
    { t: 'crate', x: -24, z: -2, s: 1 },
    { t: 'sandbag', x: 16, z: -8, rot: 0 },
    { t: 'sandbag', x: 22, z: -2, rot: 1 },
    { t: 'sandbag', x: 24, z: -10, rot: 0 },
    { t: 'barrier', x: 4, z: -6, rot: 1 },
    { t: 'barrel', x: 14, z: -6, explosive: true },
    { t: 'barrel', x: -16, z: 2, explosive: true },
    { t: 'truck', x: 22, z: -12, rot: 1, color: 0x6a5a3a },
    { t: 'car', x: -8, z: 18, rot: 0, color: 0xc4b49a },
    { t: 'device', x: -22, z: -8, id: 'bombA' },
    { t: 'device', x: 20, z: -8, id: 'bombB' },
    { t: 'med', x: 0, z: 12 },
    { t: 'armor', x: -6, z: 4 },
    { t: 'ammo', x: 6, z: -2 },
    { t: 'lamp', x: -8, z: 6 },
    { t: 'lamp', x: 12, z: 4 },
  ];

  const enemies = [
    { id: 'm1', type: 'soldier', x: 0, z: 6, patrol: [[0, 6], [4, 0], [-4, 2]] },
    { id: 'm2', type: 'soldier', x: -8, z: 2 },
    { id: 'a1', type: 'soldier', x: -18, z: -2 },
    { id: 'a2', type: 'soldier', x: -24, z: -10 },
    { id: 'a3', type: 'rusher', x: -16, z: -10 },
    { id: 'b1', type: 'soldier', x: 10, z: -8 },
    { id: 'b2', type: 'soldier', x: 24, z: -6 },
    { id: 'b3', type: 'heavy', x: 14, z: -14 },
    { id: 'n1', type: 'soldier', x: 4, z: -16, patrol: [[4, -16], [-6, -14]] },
    { id: 'n2', type: 'sniper', x: 26, z: -18, yaw: Math.PI, hold: true },
    { id: 'n3', type: 'rusher', x: -2, z: -18 },
  ];

  return {
    id: 'vault',
    sky: 'day',
    bounds: { minX: -38, maxX: 36, minZ: -28, maxZ: 30 },
    player: { x: 0, y: 0, z: 24, yaw: 0 },
    boxes, buildings, props, enemies,
    zones: {
      bombA: { x: -22, z: -8, r: 2.2 },
      bombB: { x: 20, z: -8, r: 2.2 },
    },
    spawnPoints: [
      { x: 0, z: -22 }, { x: -30, z: -16 }, { x: 30, z: -16 }, { x: 28, z: 8 },
    ],
    checks: [
      { x: 0, z: 24, label: 'spawn' },
      { x: -13.6, z: -6, label: 'site A door' },
      { x: -22, z: -8, label: 'bomb A' },
      { x: 20, z: -8, label: 'bomb B' },
    ],
  };
}
