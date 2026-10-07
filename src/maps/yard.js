import { PAL } from '../content.js';
import { box } from '../builders.js';

export function yardMap() {
  const boxes = [
    box(0, 2.2, -24, 48, 4.4, 1, 'concrete', 0x2a3038),
    box(0, 2.2, 24, 48, 4.4, 1, 'concrete', 0x2a3038),
    box(-24, 2.2, 0, 1, 4.4, 48, 'concrete', 0x2a3038),
    box(24, 2.2, 0, 1, 4.4, 48, 'concrete', 0x2a3038),
    box(0, 3.2, 0, 14, 0.3, 14, 'metal', 0x3a424c),
  ];
  // catwalk is visual-only collision removed? A floating slab at y=3.2 center would block jumps in the middle.
  // Don't add the center slab as collision. Visual only later. Remove it.
  boxes.pop();

  const props = [
    { t: 'container', x: -12, z: -8, rot: 0, color: PAL.containerRed },
    { t: 'container', x: 12, z: -10, rot: 1, color: PAL.containerBlue },
    { t: 'container', x: -10, z: 10, rot: 1, color: PAL.containerGreen },
    { t: 'container', x: 11, z: 9, rot: 0, color: PAL.containerOrange },
    { t: 'container', x: 0, z: -16, rot: 1, color: 0x5a4636 },
    { t: 'crate', x: -4, z: 2, s: 1.15 },
    { t: 'crate', x: 4, z: -2, s: 1.1 },
    { t: 'crate', x: 3, z: 3, s: 0.9 },
    { t: 'barrel', x: -6, z: -4, explosive: true },
    { t: 'barrel', x: 7, z: 5, explosive: true },
    { t: 'barrel', x: 0, z: 8, explosive: true },
    { t: 'lamp', x: -16, z: -16 },
    { t: 'lamp', x: 16, z: -16 },
    { t: 'lamp', x: -16, z: 16 },
    { t: 'lamp', x: 16, z: 16 },
    { t: 'lamp', x: 7, z: -7 },
    { t: 'ammo', x: 0, z: 0, respawn: true },
    { t: 'med', x: -2, z: -2 },
    { t: 'armor', x: 2, z: 2 },
    { t: 'generator', x: -18, z: 0 },
    { t: 'barrier', x: 0, z: 14, rot: 1 },
    { t: 'sandbag', x: -6, z: 6, rot: 0 },
  ];

  return {
    id: 'yard',
    sky: 'night',
    bounds: { minX: -22, maxX: 22, minZ: -22, maxZ: 22 },
    player: { x: 0, y: 0, z: 0, yaw: 0 },
    boxes,
    buildings: [],
    props,
    enemies: [],
    spawnPoints: [
      { x: -18, z: -18 }, { x: 18, z: -18 }, { x: -18, z: 18 }, { x: 18, z: 18 },
      { x: 0, z: -18 }, { x: 0, z: 18 }, { x: -18, z: 0 }, { x: 18, z: 0 },
    ],
    zones: { center: { x: 0, z: 0, r: 6 } },
    checks: [{ x: 0, z: 0, label: 'spawn' }],
  };
}
