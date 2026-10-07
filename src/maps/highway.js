import { PAL } from '../content.js';
import { box } from '../builders.js';

export function highwayMap() {
  const boxes = [];
  const minZ = -88;
  const maxZ = 48;
  boxes.push(box(-16, 1.6, (minZ + maxZ) / 2, 1.2, 3.2, maxZ - minZ, 'concrete', 0x4a4038));
  boxes.push(box(16, 1.6, (minZ + maxZ) / 2, 1.2, 3.2, maxZ - minZ, 'concrete', 0x4a4038));
  boxes.push(box(0, 2.4, -86, 28, 4.8, 3, 'concrete', 0x2a241e));
  boxes.push(box(-10, 1.2, -78, 6, 2.4, 1.2, 'concrete', 0x3a342c));
  boxes.push(box(10, 1.2, -78, 6, 2.4, 1.2, 'concrete', 0x3a342c));

  const props = [];
  for (let i = 0; i < 8; i++) {
    const z = 30 - i * 13;
    props.push({ t: 'barrier', x: i % 2 ? 6.5 : -6.5, z, rot: 0 });
    props.push({ t: 'car', x: i % 2 ? -7.2 : 7.4, z: z - 4, rot: 0, color: i % 2 ? 0x1c1a18 : 0x3a1814 });
  }
  props.push(
    { t: 'rock', x: -9, z: 8 },
    { t: 'rock', x: 9, z: -18 },
    { t: 'barrel', x: 5, z: 16, explosive: true },
    { t: 'barrel', x: -5, z: -8, explosive: true },
    { t: 'barrel', x: 4, z: -36, explosive: true },
    { t: 'lamp', x: -12, z: 20 },
    { t: 'lamp', x: 12, z: 0 },
    { t: 'lamp', x: -12, z: -24 },
    { t: 'lamp', x: 12, z: -48 },
    { t: 'billboard', x: 0, z: 36, rot: 0, text: 'RIDGE ROAD', color: '#ffb070' },
    { t: 'med', x: -4, z: 28 },
    { t: 'armor', x: 5, z: -2 },
    { t: 'ammo', x: -5, z: -28 },
    { t: 'van', x: -9, z: -80, rot: 1, color: 0x14201c },
  );

  const enemies = [
    { id: 'h1', type: 'soldier', x: -4, z: 22, patrol: [[-4, 22], [4, 14]] },
    { id: 'h2', type: 'soldier', x: 5, z: 8 },
    { id: 'h3', type: 'rusher', x: -5, z: -4 },
    { id: 'h4', type: 'soldier', x: 4, z: -16 },
    { id: 'h5', type: 'soldier', x: -3, z: -30, patrol: [[-3, -30], [3, -38]] },
    { id: 'h6', type: 'sniper', x: 7, z: -46, yaw: Math.PI, hold: true },
    { id: 'g1', type: 'soldier', x: 0, z: 0, y: 1.55, truckGunner: true, lx: 0.55, lz: 0.4 },
    { id: 'g2', type: 'soldier', x: 0, z: 0, y: 1.55, truckGunner: true, lx: -0.55, lz: 1.1 },
  ];

  return {
    id: 'highway',
    sky: 'dusk',
    bounds: { minX: -14, maxX: 14, minZ: -84, maxZ: 46 },
    player: { x: -5, y: 0, z: 40, yaw: 0 },
    boxes,
    buildings: [],
    props,
    enemies,
    truck: {
      id: 'convoy',
      hp: 320,
      speed: 4.15,
      path: [
        { x: 1.5, z: 16 },
        { x: 0, z: -4 },
        { x: -1.5, z: -24 },
        { x: 1, z: -46 },
        { x: 0, z: -78 },
      ],
    },
    zones: {
      loot: { x: 0, z: 0, r: 3.2, followTruck: true },
      extract: { x: -6, z: -74, r: 3.4 },
    },
    checks: [
      { x: -5, z: 40, label: 'spawn' },
      { x: 0, z: 10, label: 'road' },
      { x: -6, z: -74, label: 'extract' },
    ],
  };
}
