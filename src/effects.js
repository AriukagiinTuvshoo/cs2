import * as THREE from 'three';

export class Effects {
  constructor(scene, textures) {
    this.scene = scene;
    this.textures = textures;
    this.decals = [];
    this.tracers = [];
    this.shells = [];
    this.floats = [];
    this.flash = new THREE.PointLight(0xfff1c4, 0, 7, 2);
    this.flash.layers.enable(1);
    scene.add(this.flash);
    const spriteMat = new THREE.SpriteMaterial({
      map: textures.radial, color: 0xfff1c4, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, depthTest: false,
    });
    this.muzzleSprite = new THREE.Sprite(spriteMat);
    this.muzzleSprite.scale.set(0.18, 0.18, 0.18);
    this.muzzleSprite.visible = false;
    this.muzzleSprite.layers.set(1);
    this.parts = [];
    const geo = new THREE.BufferGeometry();
    this.partPos = new Float32Array(600 * 3);
    this.partCol = new Float32Array(600 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.partPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.partCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    scene.add(this.points);
    this.partState = Array.from({ length: 600 }, () => ({ life: 0, vx: 0, vy: 0, vz: 0 }));
    this.beacon = this.makeBeacon();
    scene.add(this.beacon);
    this.rain = null;
  }

  makeBeacon() {
    const g = new THREE.Group();
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 24, 6, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xf0a202, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
    );
    pillar.position.y = 12;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 24),
      new THREE.MeshBasicMaterial({ color: 0xf0a202, side: THREE.DoubleSide, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    g.add(pillar, ring);
    g.visible = false;
    g.userData.ring = ring;
    g.userData.pillar = pillar;
    return g;
  }

  setBeacon(pos, color = 0xf0a202) {
    if (!pos) {
      this.beacon.visible = false;
      return;
    }
    this.beacon.visible = true;
    this.beacon.position.set(pos.x, 0.02, pos.z);
    this.beacon.userData.pillar.material.color.setHex(color);
    this.beacon.userData.ring.material.color.setHex(color);
  }

  burst(x, y, z, color, count = 10, speed = 3, life = 0.4) {
    const c = new THREE.Color(color);
    let n = 0;
    for (let i = 0; i < this.partState.length && n < count; i++) {
      const p = this.partState[i];
      if (p.life > 0) continue;
      p.life = life * (0.6 + Math.random() * 0.6);
      p.max = p.life;
      p.vx = (Math.random() - 0.5) * speed;
      p.vy = Math.random() * speed;
      p.vz = (Math.random() - 0.5) * speed;
      this.partPos[i * 3] = x;
      this.partPos[i * 3 + 1] = y;
      this.partPos[i * 3 + 2] = z;
      this.partCol[i * 3] = c.r;
      this.partCol[i * 3 + 1] = c.g;
      this.partCol[i * 3 + 2] = c.b;
      n++;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }

  tracer(x, y, z, tx, ty, tz, color = 0xffe7a8) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(tx, ty, tz),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.07 });
    if (this.tracers.length > 40) {
      const old = this.tracers.shift();
      this.scene.remove(old.line);
      old.line.geometry.dispose();
    }
  }

  decal(point, normal) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.12),
      new THREE.MeshBasicMaterial({ map: this.textures.decal, transparent: true, depthWrite: false }),
    );
    m.position.copy(point).addScaledVector(normal, 0.02);
    m.lookAt(point.clone().add(normal));
    this.scene.add(m);
    this.decals.push(m);
    if (this.decals.length > 50) {
      const old = this.decals.shift();
      this.scene.remove(old);
      old.geometry.dispose();
    }
  }

  shell(pos, dir) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.06), new THREE.MeshStandardMaterial({ color: 0xd4b46a, metalness: 0.8, roughness: 0.3 }));
    m.position.copy(pos);
    this.scene.add(m);
    this.shells.push({
      m,
      vx: dir.x * 1.5 + (Math.random() - 0.5),
      vy: 2 + Math.random(),
      vz: dir.z * 1.5 + (Math.random() - 0.5),
      life: 1.4,
    });
    if (this.shells.length > 24) {
      const old = this.shells.shift();
      this.scene.remove(old.m);
      old.m.geometry.dispose();
    }
  }

  muzzle(pos, viewParent) {
    this.flash.position.copy(pos);
    this.flash.intensity = 4.5;
    if (viewParent && !this.muzzleSprite.parent) viewParent.add(this.muzzleSprite);
    this.muzzleSprite.visible = true;
    this.muzzleSprite.material.opacity = 1;
  }

  shockwave(x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9944, transparent: true, opacity: 0.45, wireframe: true }),
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.floats.push({ mesh, life: 0.35, max: 0.35 });
  }

  enableRain(on) {
    if (on && !this.rain) {
      const n = 700;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 36;
        pos[i * 3 + 1] = Math.random() * 18;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xb7c3d4, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false }));
      this.scene.add(this.rain);
      this.rainVel = pos;
    } else if (!on && this.rain) {
      this.scene.remove(this.rain);
      this.rain.geometry.dispose();
      this.rain = null;
    }
  }

  update(dt, player) {
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 40);
    if (this.muzzleSprite.visible) {
      this.muzzleSprite.material.opacity -= dt * 18;
      if (this.muzzleSprite.material.opacity <= 0) this.muzzleSprite.visible = false;
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.07);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.life -= dt;
      s.vy -= 9 * dt;
      s.m.position.x += s.vx * dt;
      s.m.position.y += s.vy * dt;
      s.m.position.z += s.vz * dt;
      if (s.m.position.y < 0.05) { s.m.position.y = 0.05; s.vy *= -0.3; s.vx *= 0.6; s.vz *= 0.6; }
      if (s.life <= 0) {
        this.scene.remove(s.m);
        s.m.geometry.dispose();
        this.shells.splice(i, 1);
      }
    }
    let dirty = false;
    for (let i = 0; i < this.partState.length; i++) {
      const p = this.partState[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= 6 * dt;
      this.partPos[i * 3] += p.vx * dt;
      this.partPos[i * 3 + 1] += p.vy * dt;
      this.partPos[i * 3 + 2] += p.vz * dt;
      if (p.life <= 0) this.partPos[i * 3 + 1] = -999;
      dirty = true;
    }
    if (dirty) this.points.geometry.attributes.position.needsUpdate = true;
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt;
      const k = 1 - f.life / f.max;
      f.mesh.scale.setScalar(1 + k * 14);
      f.mesh.material.opacity = 0.4 * (1 - k);
      if (f.life <= 0) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        this.floats.splice(i, 1);
      }
    }
    if (this.beacon.visible) this.beacon.userData.ring.rotation.z += dt;
    if (this.rain && player) {
      this.rain.position.set(player.x, 0, player.z);
      const pos = this.rain.geometry.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i + 1] -= dt * 16;
        if (pos[i + 1] < 0) pos[i + 1] = 16;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
