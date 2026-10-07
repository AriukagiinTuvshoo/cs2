import { PAL } from '../content.js';
import { building, box } from '../builders.js';

export function downtownMap() {
  const boxes = [];
  const buildings = [];
  const add = (r) => {
    if (r.boxes) boxes.push(...r.boxes);
    if (r.meta) buildings.push(r.meta);
  };

  add(building({
    x: -28, z: 18, w: 20, d: 16, h: 5.2, door: ['s', 'e'], doorW: 4.2,
    color: PAL.nightWall, roof: false, id: 'garage',
  }));
  add(building({
    x: -28, z: -18, w: 20, d: 18, h: 6.4, door: ['e', 'n'],
    color: PAL.nightWall4, id: 'shops',
  }));
  add(building({
    x: 22, z: -16, w: 22, d: 20, h: 6.8, door: ['w', 'e'], doorW: 4,
    color: PAL.nightWall2, id: 'club',
  }));
  add(building({
    x: 22, z: 20, w: 22, d: 16, h: 11, door: ['s', 'w'],
    color: PAL.nightWall3, id: 'offices',
  }));
  add(building({
    x: 0, z: -34, w: 16, d: 10, h: 5, door: 'n',
    color: 0x322c34, id: 'motel',
  }));
  add(building({
    x: -4, z: 34, w: 14, d: 8, h: 4.4, door: 's',
    color: 0x2a3038, id: 'kiosk',
  }));

  boxes.push(box(-28, 2.6, 18, 0.45, 5.2, 0.45, 'concrete', 0x3a4250));
  boxes.push(box(-22, 2.6, 14, 0.45, 5.2, 0.45, 'concrete', 0x3a4250));
  boxes.push(box(-34, 2.6, 22, 0.45, 5.2, 0.45, 'concrete', 0x3a4250));
  boxes.push(box(22, 0.55, -16, 8.5, 1.1, 0.7, 'metal', 0x2a2428));

  const props = [
    { t: 'car', x: -8, z: 2, rot: 0, color: 0x14161c },
    { t: 'car', x: -10, z: -6, rot: 0, color: 0x4a1418 },
    { t: 'car', x: 6, z: 6, rot: 1, color: 0x102033 },
    { t: 'car', x: 8, z: -2, rot: 1, color: 0x2a2a28 },
    { t: 'car', x: -6, z: 22, rot: 1, color: 0x1a1c20 },
    { t: 'car', x: 6, z: -24, rot: 0, color: 0x3a2814 },
    { t: 'car', x: -40, z: 4, rot: 1, color: 0x181a20 },
    { t: 'car', x: 40, z: 8, rot: 1, color: 0x201418 },
    { t: 'car', x: -14, z: -30, rot: 0, color: 0x101820 },
    { t: 'car', x: 36, z: -8, rot: 0, color: 0x2c241c },
    { t: 'dumpster', x: -14, z: 8, rot: 1 },
    { t: 'dumpster', x: 8, z: 16, rot: 0 },
    { t: 'barrier', x: -2, z: 12, rot: 0 },
    { t: 'barrier', x: 2, z: -8, rot: 1 },
    { t: 'crate', x: -24, z: 12, s: 1.1 },
    { t: 'crate', x: 16, z: -12, s: 1.15 },
    { t: 'crate', x: 26, z: -20, s: 1 },
    { t: 'barrel', x: 12, z: -10, explosive: true },
    { t: 'barrel', x: 18, z: -22, explosive: true },
    { t: 'barrel', x: -18, z: -8, explosive: true },
    { t: 'lamp', x: -12, z: 0 },
    { t: 'lamp', x: 10, z: 0 },
    { t: 'lamp', x: 0, z: 12 },
    { t: 'lamp', x: 0, z: -12 },
    { t: 'lamp', x: -14, z: 28 },
    { t: 'lamp', x: 12, z: 30 },
    { t: 'lamp', x: 36, z: -20 },
    { t: 'lamp', x: -40, z: -10 },
    { t: 'lamp', x: 42, z: 24 },
    { t: 'neon', x: 10.7, y: 3.2, z: -16, rot: 1, text: 'CLUB SOL', color: '#ff2d8a' },
    { t: 'neon', x: -17.6, y: 3.1, z: -12, rot: 1, text: 'НЭЭЛТТЭЙ', color: '#39f0d0' },
    { t: 'neon', x: 0, y: 2.8, z: -28.6, rot: 0, text: 'ЗОЧИД БУУДАЛ', color: '#ffb020' },
    { t: 'neon', x: 10.6, y: 4.2, z: 16, rot: 1, text: 'METRO', color: '#7eb6ff' },
    { t: 'billboard', x: -6, z: 8, rot: 0, text: 'ASH', color: '#ff3355' },
    { t: 'counter', x: 24, z: -18, rot: 0, w: 7 },
    { t: 'locker', x: -18, z: -6, id: 'ev1' },
    { t: 'locker', x: 6, z: 14, id: 'ev2' },
    { t: 'locker', x: 32, z: 8, id: 'ev3' },
    { t: 'van', x: 40, z: 30, rot: 1, color: 0x101814 },
    { t: 'med', x: -4, z: 4 },
    { t: 'med', x: 28, z: -14 },
    { t: 'armor', x: 14, z: -14 },
    { t: 'ammo', x: -26, z: 14 },
    { t: 'ammo', x: 20, z: 8 },
    { t: 'generator', x: -34, z: 12 },
    { t: 'cone', x: 1, z: 1 },
    { t: 'cone', x: 2.2, z: -1 },
  ];

  const enemies = [
    { id: 'st1', type: 'soldier', x: -6, z: 4, patrol: [[-6, 4], [4, 2], [2, -4]] },
    { id: 'st2', type: 'soldier', x: 4, z: -10, patrol: [[4, -10], [-2, -14]] },
    { id: 'g4', type: 'soldier', x: -32, z: 20 },
    { id: 'c1', type: 'soldier', x: 14, z: -12 },
    { id: 'c2', type: 'soldier', x: 18, z: -20 },
    { id: 'c3', type: 'rusher', x: 28, z: -12 },
    { id: 'sol', type: 'boss', x: 28, z: -18, name: 'SOL', yaw: Math.PI / 2 },
    { id: 'c4', type: 'soldier', x: 24, z: -10 },
    { id: 'n1', type: 'sniper', x: 30, z: 24, yaw: Math.PI, hold: true },
    { id: 'sh1', type: 'soldier', x: -24, z: -14, patrol: [[-24, -14], [-20, -22]] },
  ];

  return {
    id: 'downtown',
    sky: 'storm',
    bounds: { minX: -48, maxX: 48, minZ: -42, maxZ: 42 },
    player: { x: -42, y: 0, z: 0, yaw: -Math.PI / 2 },
    boxes, buildings, props, enemies,
    navFloors: [{ y: 0 }],
    zones: {
      contact: { x: -26, z: 14, r: 2.4 },
      club: { x: 28, z: -18, r: 2.3 },
      van: { x: 36, z: 30, r: 3.2 },
    },
    spawnPoints: [
      { x: -44, z: 20 }, { x: -44, z: -20 }, { x: 0, z: 38 },
      { x: 44, z: -8 }, { x: 44, z: 16 }, { x: 8, z: -38 },
    ],
    checks: [
      { x: -42, z: 0, label: 'spawn' },
      { x: -28, z: 9.6, label: 'garage door' },
      { x: 10.6, z: -16, label: 'club door' },
      { x: 28, z: -18, label: 'case' },
      { x: 36, z: 30, label: 'van' },
    ],
  };
}
