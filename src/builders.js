import { PAL } from './content.js';

export function box(x, y, z, w, h, d, mat = 'concrete', color = PAL.concrete, extra = {}) {
  return { x, y, z, w, h, d, mat, color, ...extra };
}

export function building(opts) {
  const {
    x, z, w, d, h = 4.2, y = 0, t = 0.46,
    door = 's', doorW = 3.6, doorOff = {},
    mat = 'concrete', color = PAL.concrete,
    roof = true, roofColor = null, id = '', lit = true,
  } = opts;
  const doors = new Set([].concat(door).filter(Boolean));
  const boxes = [];
  const doorPts = [];
  const x0 = x - w / 2;
  const x1 = x + w / 2;
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  const cy = y + h / 2;

  const addSpanX = (zPos, side) => {
    if (!doors.has(side)) {
      boxes.push(box((x0 + x1) / 2, cy, zPos, w, h, t, mat, color));
      return;
    }
    const gc = x + (doorOff[side] || 0);
    const left0 = x0;
    const left1 = gc - doorW / 2;
    const right0 = gc + doorW / 2;
    const right1 = x1;
    if (left1 - left0 > 0.25) boxes.push(box((left0 + left1) / 2, cy, zPos, left1 - left0, h, t, mat, color));
    if (right1 - right0 > 0.25) boxes.push(box((right0 + right1) / 2, cy, zPos, right1 - right0, h, t, mat, color));
    doorPts.push({ x: gc, z: zPos, side });
  };
  const addSpanZ = (xPos, side) => {
    const span0 = z0 + t;
    const span1 = z1 - t;
    if (!doors.has(side)) {
      boxes.push(box(xPos, cy, (span0 + span1) / 2, t, h, span1 - span0, mat, color));
      return;
    }
    const gc = z + (doorOff[side] || 0);
    const a0 = span0;
    const a1 = Math.max(span0, gc - doorW / 2);
    const b0 = Math.min(span1, gc + doorW / 2);
    const b1 = span1;
    if (a1 - a0 > 0.25) boxes.push(box(xPos, cy, (a0 + a1) / 2, t, h, a1 - a0, mat, color));
    if (b1 - b0 > 0.25) boxes.push(box(xPos, cy, (b0 + b1) / 2, t, h, b1 - b0, mat, color));
    doorPts.push({ x: xPos, z: gc, side });
  };

  addSpanX(z0 + t / 2, 'n');
  addSpanX(z1 - t / 2, 's');
  addSpanZ(x0 + t / 2, 'w');
  addSpanZ(x1 - t / 2, 'e');

  if (roof) {
    boxes.push(box(x, y + h - 0.14, z, w, 0.28, d, 'metal', roofColor ?? 0x24282e));
  }

  return {
    boxes,
    doors: doorPts,
    meta: { id, x, z, w, d, h, y, color, lit, roof, doorPts },
  };
}

export function stairs(opts) {
  const {
    x, z, dir = 'n', steps = 8, stepH = 0.4, stepD = 0.48, width = 2.3, y = 0, id = 'stair',
    mat = 'metal', color = 0x5a636c,
  } = opts;
  const boxes = [];
  const nav = [];
  const forward = {
    n: [0, -1],
    s: [0, 1],
    e: [1, 0],
    w: [-1, 0],
  }[dir] || [0, -1];
  for (let i = 0; i < steps; i++) {
    const rise = (i + 1) * stepH;
    const along = (i + 0.5) * stepD;
    const px = x + forward[0] * along;
    const pz = z + forward[1] * along;
    const alongSize = stepD;
    const w = dir === 'n' || dir === 's' ? width : alongSize;
    const d = dir === 'n' || dir === 's' ? alongSize : width;
    boxes.push(box(px, y + rise / 2, pz, w, rise, d, mat, color));
    nav.push({
      x: px,
      y: y + rise,
      z: pz,
      tag: 'stair',
      tagId: id,
      stairI: i,
    });
  }
  return { boxes, nav };
}

export function slab(x, z, w, d, topY, thick = 0.26, mat = 'concrete', color = PAL.concreteDark) {
  return box(x, topY - thick / 2, z, w, thick, d, mat, color);
}

export function perimeter(opts) {
  const {
    minX, maxX, minZ, maxZ, h = 5.2, t = 0.8, gaps = [],
    mat = 'concrete', color = PAL.concreteDark,
  } = opts;
  const boxes = [];
  const y = h / 2;
  const sideWall = (side) => {
    const vertical = side === 'e' || side === 'w';
    const fixed = side === 'n' ? minZ : side === 's' ? maxZ : side === 'w' ? minX : maxX;
    const a0 = vertical ? minZ : minX;
    const a1 = vertical ? maxZ : maxX;
    const gap = gaps.find((g) => g.side === side);
    const push = (c0, c1) => {
      if (c1 - c0 < 0.3) return;
      const mid = (c0 + c1) / 2;
      const len = c1 - c0;
      if (vertical) boxes.push(box(fixed, y, mid, t, h, len, mat, color));
      else boxes.push(box(mid, y, fixed, len, h, t, mat, color));
    };
    if (!gap) {
      push(a0, a1);
      return;
    }
    const at = gap.at;
    const gw = gap.w;
    push(a0, at - gw / 2);
    push(at + gw / 2, a1);
  };
  sideWall('n');
  sideWall('s');
  sideWall('w');
  sideWall('e');
  return { boxes };
}

export function platform(x, z, w, d, topY, mat = 'metal', color = 0x4e575f) {
  return {
    boxes: [slab(x, z, w, d, topY, 0.28, mat, color)],
    nav: [{ x, y: topY, z, tag: 'extra' }],
  };
}
