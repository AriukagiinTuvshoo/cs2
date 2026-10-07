import { box } from '../builders.js';

export function rangeMap() {
  const boxes = [
    box(0, 1.6, -62, 18, 3.2, 1, 'concrete', 0x6a7078),
    box(-8, 1.6, -30, 1, 3.2, 64, 'concrete', 0x5c656e),
    box(8, 1.6, -30, 1, 3.2, 64, 'concrete', 0x5c656e),
    box(0, 2.85, 6, 16, 0.2, 8, 'metal', 0x4a525c),
  ];
  const props = [
    { t: 'crate', x: -3, z: 4, s: 1 },
    { t: 'barrier', x: 3, z: 3, rot: 1 },
    { t: 'lamp', x: -6, z: 2 },
    { t: 'lamp', x: 6, z: 2 },
    { t: 'target', x: -2, z: -10 },
    { t: 'target', x: 2, z: -10 },
    { t: 'target', x: 0, z: -25 },
    { t: 'target', x: -3, z: -40 },
    { t: 'target', x: 3, z: -40 },
    { t: 'target', x: 0, z: -54 },
  ];
  return {
    id: 'range',
    sky: 'day',
    bounds: { minX: -7, maxX: 7, minZ: -60, maxZ: 8 },
    player: { x: 0, y: 0, z: 4, yaw: 0 },
    boxes,
    buildings: [],
    props,
    enemies: [],
    zones: {},
    checks: [
      { x: 0, z: 4, label: 'spawn' },
      { x: 0, z: -25, label: 'lane' },
    ],
  };
}
