let boxSeq = 1;

export class CollisionWorld {
  constructor(cell = 8) {
    this.cell = cell;
    this.aabbs = [];
    this.grid = new Map();
  }

  addCenterBox(x, y, z, w, h, d, meta = null) {
    const box = {
      id: boxSeq++,
      minx: x - w / 2,
      maxx: x + w / 2,
      miny: y - h / 2,
      maxy: y + h / 2,
      minz: z - d / 2,
      maxz: z + d / 2,
      meta,
      dead: false,
    };
    this.aabbs.push(box);
    this.indexBox(box);
    return box;
  }

  indexBox(box) {
    const cs = this.cell;
    const ix0 = Math.floor(box.minx / cs);
    const ix1 = Math.floor(box.maxx / cs);
    const iz0 = Math.floor(box.minz / cs);
    const iz1 = Math.floor(box.maxz / cs);
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const k = `${ix},${iz}`;
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(box);
      }
    }
  }

  remove(box) {
    if (box) box.dead = true;
  }

  queryCells(minx, minz, maxx, maxz, out = []) {
    const cs = this.cell;
    const ix0 = Math.floor(minx / cs);
    const ix1 = Math.floor(maxx / cs);
    const iz0 = Math.floor(minz / cs);
    const iz1 = Math.floor(maxz / cs);
    const seen = new Set();
    for (let ix = ix0; ix <= ix1; ix++) {
      for (let iz = iz0; iz <= iz1; iz++) {
        const arr = this.grid.get(`${ix},${iz}`);
        if (!arr) continue;
        for (const b of arr) {
          if (b.dead || seen.has(b.id)) continue;
          seen.add(b.id);
          out.push(b);
        }
      }
    }
    return out;
  }

  overlapsAABB(a) {
    const list = this.queryCells(a.minx, a.minz, a.maxx, a.maxz, []);
    for (const b of list) {
      if (a.maxx > b.minx && a.minx < b.maxx && a.maxy > b.miny && a.miny < b.maxy && a.maxz > b.minz && a.minz < b.maxz) {
        return true;
      }
    }
    return false;
  }

  raycast(ox, oy, oz, dx, dy, dz, maxDist) {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    const cs = this.cell;
    let ix = Math.floor(ox / cs);
    let iz = Math.floor(oz / cs);
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
    const tDeltaX = dx !== 0 ? Math.abs(cs / dx) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(cs / dz) : Infinity;
    let tMaxX;
    let tMaxZ;
    if (dx > 0) tMaxX = ((ix + 1) * cs - ox) / dx;
    else if (dx < 0) tMaxX = (ix * cs - ox) / dx;
    else tMaxX = Infinity;
    if (dz > 0) tMaxZ = ((iz + 1) * cs - oz) / dz;
    else if (dz < 0) tMaxZ = (iz * cs - oz) / dz;
    else tMaxZ = Infinity;
    const seen = new Set();
    let best = null;
    let traveled = 0;
    for (let n = 0; n < 80 && traveled <= maxDist + cs; n++) {
      const arr = this.grid.get(`${ix},${iz}`);
      if (arr) {
        for (const b of arr) {
          if (b.dead || seen.has(b.id)) continue;
          seen.add(b.id);
          const hit = rayBox(ox, oy, oz, dx, dy, dz, b, maxDist);
          if (hit && (!best || hit.t < best.t)) best = { ...hit, box: b };
        }
      }
      if (tMaxX < tMaxZ) {
        traveled = tMaxX;
        tMaxX += tDeltaX;
        ix += stepX;
      } else {
        traveled = tMaxZ;
        tMaxZ += tDeltaZ;
        iz += stepZ;
      }
      if (!stepX && !stepZ) break;
    }
    return best;
  }
}

export function rayBox(ox, oy, oz, dx, dy, dz, box, maxT) {
  let tmin = 0;
  let tmax = maxT;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  const dims = [
    ['x', ox, dx, box.minx, box.maxx],
    ['y', oy, dy, box.miny, box.maxy],
    ['z', oz, dz, box.minz, box.maxz],
  ];
  for (const [axis, o, d, min, max] of dims) {
    if (Math.abs(d) < 1e-8) {
      if (o < min || o > max) return null;
      continue;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    let nSign = -1;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
      nSign = 1;
    }
    if (t1 > tmin) {
      tmin = t1;
      nx = 0;
      ny = 0;
      nz = 0;
      if (axis === 'x') nx = nSign;
      else if (axis === 'y') ny = nSign;
      else nz = nSign;
    }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || tmin > maxT) return null;
  return { t: tmin, nx, ny, nz };
}

export function bodyAABB(b, x = b.x, y = b.y, z = b.z) {
  const skin = 0.015;
  return {
    minx: x - b.r + skin,
    maxx: x + b.r - skin,
    miny: y + 0.02,
    maxy: y + b.h - 0.01,
    minz: z - b.r + skin,
    maxz: z + b.r - skin,
  };
}

export function overlapsAt(world, b, x, y, z) {
  return world.overlapsAABB(bodyAABB(b, x, y, z));
}

export function findFloor(world, b, x, z, feetY) {
  const r = b.r - 0.02;
  const list = world.queryCells(x - r, z - r, x + r, z + r, []);
  let best = null;
  for (const box of list) {
    if (x + r <= box.minx || x - r >= box.maxx || z + r <= box.minz || z - r >= box.maxz) continue;
    const top = box.maxy;
    if (top <= feetY + 0.36 && top >= feetY - 0.7) {
      if (best == null || top > best) best = top;
    }
  }
  return best;
}

export function moveBody(world, b, dx, dy, dz, stepH = 0.46) {
  let grounded = false;
  let hitHead = false;
  const free = (x, y, z) => !overlapsAt(world, b, x, y, z);

  if (dx || dz) {
    if (free(b.x + dx, b.y, b.z + dz)) {
      b.x += dx;
      b.z += dz;
    } else {
      let stepped = false;
      if (dy <= 0.001) {
        for (let s = 0.1; s <= stepH + 0.001; s += 0.1) {
          if (free(b.x, b.y + s, b.z) && free(b.x + dx, b.y + s, b.z + dz)) {
            b.y += s;
            b.x += dx;
            b.z += dz;
            stepped = true;
            break;
          }
        }
      }
      if (!stepped) {
        if (dx && free(b.x + dx, b.y, b.z)) b.x += dx;
        else if (dx && dy <= 0.001) {
          for (let s = 0.1; s <= stepH + 0.001; s += 0.1) {
            if (free(b.x, b.y + s, b.z) && free(b.x + dx, b.y + s, b.z)) {
              b.y += s;
              b.x += dx;
              break;
            }
          }
        }
        if (dz && free(b.x, b.y, b.z + dz)) b.z += dz;
        else if (dz && dy <= 0.001) {
          for (let s = 0.1; s <= stepH + 0.001; s += 0.1) {
            if (free(b.x, b.y + s, b.z) && free(b.x, b.y + s, b.z + dz)) {
              b.y += s;
              b.z += dz;
              break;
            }
          }
        }
      }
    }
  }

  if (dy > 0) {
    if (free(b.x, b.y + dy, b.z)) b.y += dy;
    else {
      hitHead = true;
      let lo = 0;
      let hi = dy;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (free(b.x, b.y + mid, b.z)) lo = mid;
        else hi = mid;
      }
      b.y += lo;
    }
  } else if (dy < 0) {
    if (free(b.x, b.y + dy, b.z)) b.y += dy;
    else {
      let lo = dy;
      let hi = 0;
      for (let i = 0; i < 8; i++) {
        const mid = (lo + hi) / 2;
        if (free(b.x, b.y + mid, b.z)) hi = mid;
        else lo = mid;
      }
      b.y += hi;
      grounded = true;
    }
  }

  if (dy <= 0) {
    const floor = findFloor(world, b, b.x, b.z, b.y);
    if (floor != null && b.y >= floor - 0.55 && b.y <= floor + 0.08) {
      b.y = floor;
      grounded = true;
    }
  }

  return { grounded, hitHead };
}

export function hasFloor(world, x, z, feetY, r = 0.28) {
  const list = world.queryCells(x - r, z - r, x + r, z + r, []);
  for (const box of list) {
    if (x <= box.minx + 0.05 || x >= box.maxx - 0.05 || z <= box.minz + 0.05 || z >= box.maxz - 0.05) continue;
    if (Math.abs(box.maxy - feetY) <= 0.28) return box.maxy;
  }
  return null;
}

export function blockedAt(world, x, y, z, r = 0.32) {
  return world.overlapsAABB({
    minx: x - r,
    maxx: x + r,
    miny: y - 0.05,
    maxy: y + 0.7,
    minz: z - r,
    maxz: z + r,
  });
}

export function segmentClear(world, a, b, lift = 0.85) {
  const dx = b.x - a.x;
  const dy = (b.y || 0) - (a.y || 0);
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return true;
  const hit = world.raycast(a.x, (a.y || 0) + lift, a.z, dx / len, dy / len, dz / len, len - 0.15);
  return !hit || hit.t > len - 0.2;
}

function link(a, b) {
  if (!a.links.includes(b)) a.links.push(b);
  if (!b.links.includes(a)) b.links.push(a);
}

export function buildNav(world, spec) {
  const spacing = spec.navSpacing || 2.6;
  const bounds = spec.bounds;
  const floors = spec.navFloors || [{ y: 0 }];
  const nodes = [];
  const addNode = (x, y, z, tag = '', extra = {}) => {
    const n = {
      id: nodes.length, x, y, z, links: [], tag,
      tagId: extra.tagId || '', stairI: extra.stairI ?? 0,
    };
    nodes.push(n);
    return n;
  };

  for (const floor of floors) {
    const area = floor.area;
    for (let x = bounds.minX + 1.4; x <= bounds.maxX - 1.4; x += spacing) {
      for (let z = bounds.minZ + 1.4; z <= bounds.maxZ - 1.4; z += spacing) {
        if (area && (x < area.minX || x > area.maxX || z < area.minZ || z > area.maxZ)) continue;
        const top = hasFloor(world, x, z, floor.y);
        if (top == null) continue;
        if (blockedAt(world, x, top + 0.95, z, 0.34)) continue;
        addNode(x, top, z, 'grid');
      }
    }
  }

  for (const extra of spec.navExtra || []) {
    addNode(extra.x, extra.y, extra.z, extra.tag || 'extra', extra);
  }

  const map = new Map();
  for (const n of nodes) {
    n.ix = Math.round(n.x / spacing);
    n.iz = Math.round(n.z / spacing);
    n.iy = Math.round(n.y / 0.4);
    map.set(`${n.ix},${n.iz},${n.iy}`, n);
  }
  const neigh = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
    [2, 0], [-2, 0], [0, 2], [0, -2],
  ];
  for (const n of nodes) {
    if (n.tag === 'stair') continue;
    for (const [dx, dz] of neigh) {
      for (let iy = -2; iy <= 2; iy++) {
        const o = map.get(`${n.ix + dx},${n.iz + dz},${n.iy + iy}`);
        if (!o || o.id <= n.id || o.tag === 'stair') continue;
        const dist = Math.hypot(n.x - o.x, n.z - o.z);
        if (dist > spacing * 1.75) continue;
        if (Math.abs(n.y - o.y) > 0.55) continue;
        if (segmentClear(world, n, o, 0.7)) link(n, o);
      }
    }
  }

  const stairs = nodes.filter((n) => n.tag === 'stair');
  const groups = new Map();
  for (const n of stairs) {
    const id = n.tagId || 'stair';
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(n);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => a.stairI - b.stairI);
    for (let i = 1; i < group.length; i++) link(group[i - 1], group[i]);
    const ends = [group[0], group[group.length - 1]];
    for (const end of ends) {
      let best = null;
      let bestD = 4.2;
      for (const n of nodes) {
        if (n.tag === 'stair') continue;
        const d = Math.hypot(n.x - end.x, n.z - end.z) + Math.abs(n.y - end.y) * 0.8;
        if (d < bestD) {
          bestD = d;
          best = n;
        }
      }
      if (best) link(end, best);
    }
  }

  for (const extra of spec.navLinks || []) {
    const a = nearestNode(nodes, extra.a.x, extra.a.y || 0, extra.a.z);
    const b = nearestNode(nodes, extra.b.x, extra.b.y || 0, extra.b.z);
    if (a && b && a !== b) link(a, b);
  }

  return { nodes, spacing };
}

export function nearestNode(nodes, x, y, z) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2 + (n.y - y) ** 2 * 0.35;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

export function astar(start, goal) {
  if (!start || !goal) return [];
  if (start === goal) return [start];
  const open = [start];
  const came = new Map();
  const g = new Map([[start, 0]]);
  const f = new Map([[start, Math.hypot(goal.x - start.x, goal.z - start.z)]]);
  const inOpen = new Set([start]);
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (f.get(open[i]) < f.get(open[bi])) bi = i;
    const cur = open.splice(bi, 1)[0];
    inOpen.delete(cur);
    if (cur === goal) {
      const path = [cur];
      let c = cur;
      while (came.has(c)) {
        c = came.get(c);
        path.push(c);
      }
      path.reverse();
      return path;
    }
    for (const nb of cur.links) {
      const step = Math.hypot(nb.x - cur.x, nb.z - cur.z, nb.y - cur.y);
      const ng = g.get(cur) + step;
      if (ng + 0.001 < (g.get(nb) ?? Infinity)) {
        came.set(nb, cur);
        g.set(nb, ng);
        f.set(nb, ng + Math.hypot(goal.x - nb.x, goal.z - nb.z));
        if (!inOpen.has(nb)) {
          open.push(nb);
          inOpen.add(nb);
        }
      }
    }
  }
  return [];
}

export function reachableSet(nodes, origin) {
  const start = nearestNode(nodes, origin.x, origin.y || 0, origin.z);
  const seen = new Set();
  if (!start) return seen;
  const q = [start];
  seen.add(start.id);
  while (q.length) {
    const n = q.pop();
    for (const nb of n.links) {
      if (seen.has(nb.id)) continue;
      seen.add(nb.id);
      q.push(nb);
    }
  }
  return seen;
}

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function damp(current, target, speed, dt) {
  return current + (target - current) * (1 - Math.exp(-speed * dt));
}

export function dampAngle(current, target, speed, dt) {
  return current + normalizeAngle(target - current) * (1 - Math.exp(-speed * dt));
}

export function rayCapsule(ro, rd, a, b, radius) {
  const ba = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const oa = { x: ro.x - a.x, y: ro.y - a.y, z: ro.z - a.z };
  const baba = ba.x * ba.x + ba.y * ba.y + ba.z * ba.z || 1e-6;
  const bard = ba.x * rd.x + ba.y * rd.y + ba.z * rd.z;
  const baoa = ba.x * oa.x + ba.y * oa.y + ba.z * oa.z;
  const rdoa = rd.x * oa.x + rd.y * oa.y + rd.z * oa.z;
  const oaoa = oa.x * oa.x + oa.y * oa.y + oa.z * oa.z;
  const aa = baba - bard * bard;
  const bb = baba * rdoa - baoa * bard;
  const cc = baba * oaoa - baoa * baoa - radius * radius * baba;
  const h = bb * bb - aa * cc;
  if (aa > 1e-6 && h >= 0) {
    const t = (-bb - Math.sqrt(h)) / aa;
    const y = baoa + t * bard;
    if (t >= 0 && y > 0 && y < baba) return t;
  }
  const cap = (center) => {
    const oc = { x: ro.x - center.x, y: ro.y - center.y, z: ro.z - center.z };
    const b2 = oc.x * rd.x + oc.y * rd.y + oc.z * rd.z;
    const c = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - radius * radius;
    const disc = b2 * b2 - c;
    if (disc < 0) return null;
    const t = -b2 - Math.sqrt(disc);
    return t >= 0 ? t : null;
  };
  const tA = cap(a);
  const tB = cap(b);
  if (tA == null) return tB;
  if (tB == null) return tA;
  return Math.min(tA, tB);
}
