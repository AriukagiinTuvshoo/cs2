export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.prev = new Set();
    this.mouse = new Set();
    this.prevMouse = new Set();
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.fallback = false;
    this.gp = { x: 0, y: 0, lx: 0, ly: 0, buttons: new Set(), prev: new Set() };
    this.touch = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, buttons: new Set() };
    this.cursor = { x: 0, y: 0, inside: false };
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.clear();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      this.mouse.add(e.button);
      if (this.fallback) {
        try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
    });
    window.addEventListener('mouseup', (e) => this.mouse.delete(e.button));
    window.addEventListener('mousemove', (e) => {
      const prevX = this.cursor.x;
      const prevY = this.cursor.y;
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
      if (this.locked) {
        this.dx += e.movementX || 0;
        this.dy += e.movementY || 0;
      } else if (this.fallback) {
        if (e.movementX || e.movementY) {
          this.dx += e.movementX || 0;
          this.dy += e.movementY || 0;
        } else if (this.mouse.size > 0) {
          this.dx += e.clientX - prevX;
          this.dy += e.clientY - prevY;
        }
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.fallback = true;
      this.onLockChange?.(false);
    });

    this.stickOrigin = null;
    canvas.addEventListener('touchstart', (e) => this.onTouch(e, 'start'), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouch(e, 'move'), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouch(e, 'end'), { passive: false });
  }

  onTouch(e, phase) {
    e.preventDefault();
    const w = window.innerWidth;
    for (const touch of e.changedTouches) {
      const left = touch.clientX < w * 0.42;
      if (phase === 'start' && left) this.stickOrigin = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
      if (phase === 'end' && this.stickOrigin && touch.identifier === this.stickOrigin.id) {
        this.stickOrigin = null;
        this.touch.moveX = 0;
        this.touch.moveY = 0;
      }
      if (!left && phase !== 'end') {
        this.touch.lookX += touch.clientX - (this.lastLookX ?? touch.clientX);
        this.touch.lookY += touch.clientY - (this.lastLookY ?? touch.clientY);
        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;
      }
      if (phase === 'end') {
        this.lastLookX = null;
        this.lastLookY = null;
      }
    }
    if (this.stickOrigin) {
      const t = [...e.touches].find((n) => n.identifier === this.stickOrigin.id);
      if (t) {
        this.touch.moveX = Math.max(-1, Math.min(1, (t.clientX - this.stickOrigin.x) / 50));
        this.touch.moveY = Math.max(-1, Math.min(1, (t.clientY - this.stickOrigin.y) / 50));
      }
    }
  }

  requestLock() {
    const p = this.canvas.requestPointerLock?.();
    if (p && p.catch) p.catch(() => { this.fallback = true; });
    setTimeout(() => {
      if (!this.locked) this.fallback = true;
    }, 450);
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(code) {
    return this.keys.has(code);
  }

  pressed(code) {
    return this.keys.has(code) && !this.prev.has(code);
  }

  mouseDown(btn) {
    return this.mouse.has(btn) || this.touch.buttons.has(btn);
  }

  mousePressed(btn) {
    return (this.mouse.has(btn) && !this.prevMouse.has(btn)) || false;
  }

  pollGamepad() {
    const pads = navigator.getGamepads?.();
    const gp = pads && pads[0];
    this.gp.prev = new Set(this.gp.buttons);
    this.gp.buttons.clear();
    this.gp.x = this.gp.y = this.gp.lx = this.gp.ly = 0;
    if (!gp) return;
    const dead = 0.18;
    const ax = (v) => (Math.abs(v) > dead ? v : 0);
    this.gp.x = ax(gp.axes[0] || 0);
    this.gp.y = ax(gp.axes[1] || 0);
    this.gp.lx = ax(gp.axes[2] || 0);
    this.gp.ly = ax(gp.axes[3] || 0);
    gp.buttons.forEach((b, i) => { if (b.pressed) this.gp.buttons.add(i); });
  }

  gpPressed(i) {
    return this.gp.buttons.has(i) && !this.gp.prev.has(i);
  }

  consumeLook() {
    const d = { x: this.dx + this.touch.lookX, y: this.dy + this.touch.lookY };
    this.dx = 0;
    this.dy = 0;
    this.touch.lookX = 0;
    this.touch.lookY = 0;
    return d;
  }

  endFrame() {
    this.prev = new Set(this.keys);
    this.prevMouse = new Set(this.mouse);
  }

  moveAxes() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA')) x -= 1;
    if (this.down('KeyD')) x += 1;
    if (this.down('KeyW')) y += 1;
    if (this.down('KeyS')) y -= 1;
    x += this.gp.x + this.touch.moveX;
    y += -this.gp.y - this.touch.moveY;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    return { x, y };
  }
}
