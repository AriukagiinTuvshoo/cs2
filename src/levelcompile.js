import { CollisionWorld, buildNav, blockedAt, hasFloor } from './physics.js';
import { collidersFor } from './propdata.js';

export function compileLevel(spec) {
  const world = new CollisionWorld(8);
  const bounds = spec.bounds;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const W = bounds.maxX - bounds.minX + 12;
  const D = bounds.maxZ - bounds.minZ + 12;
  world.addCenterBox(cx, -1, cz, W, 2, D, { kind: 'ground' });

  const t = 1.2;
  const h = 8;
  world.addCenterBox(cx, h / 2, bounds.minZ - t / 2, W, h, t, { kind: 'bound' });
  world.addCenterBox(cx, h / 2, bounds.maxZ + t / 2, W, h, t, { kind: 'bound' });
  world.addCenterBox(bounds.minX - t / 2, h / 2, cz, t, h, D, { kind: 'bound' });
  world.addCenterBox(bounds.maxX + t / 2, h / 2, cz, t, h, D, { kind: 'bound' });

  for (const b of spec.boxes || []) {
    world.addCenterBox(b.x, b.y, b.z, b.w, b.h, b.d, b);
  }
  for (const p of spec.props || []) {
    if (p.noCollide || p.t === 'target') continue;
    for (const c of collidersFor(p)) {
      world.addCenterBox(c.x, c.y, c.z, c.w, c.h, c.d, p);
    }
  }

  const nav = buildNav(world, spec);
  return { world, nav, spec };
}

export function pointClear(world, x, y, z) {
  const floor = hasFloor(world, x, z, y, 0.25);
  const blocked = blockedAt(world, x, (floor ?? y) + 0.9, z, 0.3);
  return { floor, blocked };
}
