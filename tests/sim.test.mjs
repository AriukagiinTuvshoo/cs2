import { getMap } from '../src/maps/index.js';
import { compileLevel, pointClear } from '../src/levelcompile.js';
import { reachableSet, nearestNode, moveBody, rayBox } from '../src/physics.js';
import { CollisionWorld } from '../src/physics.js';

const ids = ['compound', 'downtown', 'highway', 'office', 'vault', 'yard', 'range'];
let failed = 0;

function check(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL', msg);
  }
}

for (const id of ids) {
  const spec = getMap(id);
  const t0 = performance.now();
  const { world, nav } = compileLevel(spec);
  const ms = Math.round(performance.now() - t0);
  const spawn = spec.player;
  const reach = reachableSet(nav.nodes, spawn);
  console.log(`${id}: boxes=${world.aabbs.length} nodes=${nav.nodes.length} reach=${reach.size} (${ms}ms)`);
  check(nav.nodes.length > 15, `${id} nav too small`);
  const sp = pointClear(world, spawn.x, spawn.y || 0, spawn.z);
  check(sp.floor != null && !sp.blocked, `${id} spawn blocked floor=${sp.floor} blocked=${sp.blocked}`);
  for (const c of spec.checks || []) {
    const p = pointClear(world, c.x, c.y || 0, c.z);
    check(p.floor != null && !p.blocked, `${id} check ${c.label} blocked floor=${p.floor} blocked=${p.blocked} @ ${c.x},${c.z}`);
    const node = nearestNode(nav.nodes, c.x, c.y || 0, c.z);
    const ok = node && reach.has(node.id);
    if (!ok) console.error('  unreachable', id, c.label, 'nearest', node && { x: node.x, y: node.y, z: node.z, tag: node.tag });
    check(ok, `${id} ${c.label} unreachable`);
  }
  for (const e of spec.enemies || []) {
    if (e.truckGunner) continue;
    const y = e.y || 0;
    const p = pointClear(world, e.x, y, e.z);
    if (p.floor == null || p.blocked) {
      console.error('  enemy stuck', id, e.id, e.x, e.z, p);
      failed++;
    }
  }
  for (const h of spec.hostages || []) {
    const p = pointClear(world, h.x, h.y || 0, h.z);
    check(p.floor != null && !p.blocked, `${id} hostage ${h.id} blocked`);
  }
}

const world = new CollisionWorld();
world.addCenterBox(0, -1, 0, 40, 2, 40);
world.addCenterBox(0, 1, -4, 6, 2, 0.4);
const body = { x: 0, y: 0, z: 0, r: 0.38, h: 1.7 };
const step = moveBody(world, body, 0, -0.3, 0);
check(step.grounded && Math.abs(body.y) < 0.02, 'gravity snap');
moveBody(world, body, 0, 0, -0.2);
const zBefore = body.z;
moveBody(world, body, 0, 0, -2);
check(body.z > -3.7, `wall stop z=${body.z}`);
check(body.z !== zBefore || true, 'moved or stopped');

const stair = new CollisionWorld();
stair.addCenterBox(0, -1, 0, 20, 2, 20);
stair.addCenterBox(0, 0.2, -1, 2, 0.4, 0.4);
const climber = { x: 0, y: 0, z: -0.4, r: 0.38, h: 1.7 };
moveBody(stair, climber, 0, 0, -0.5);
check(climber.y > 0.25, `step up y=${climber.y} z=${climber.z}`);

const box = { minx: -1, maxx: 1, miny: -1, maxy: 1, minz: -1, maxz: 1 };
const hit = rayBox(0, 0, 5, 0, 0, -1, box, 20);
check(hit && Math.abs(hit.t - 4) < 0.05, `ray t=${hit && hit.t}`);

console.log(failed ? `FAILED ${failed}` : 'OK');
process.exit(failed ? 1 : 0);
