export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.music = null;
    this.vol = 0.85;
    this.musicVol = 0.32;
    this.buffers = {};
    this.pad = [];
    this.pulse = null;
    this.heartbeat = null;
    this.rain = null;
    this.mood = 'menu';
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = this.vol;
    this.sfx.connect(this.master);
    this.music = this.ctx.createGain();
    this.music.gain.value = this.musicVol * 0.45;
    this.music.connect(this.master);
    this.buffers.noise = this.makeNoise(1.2);
    this.startPad();
  }

  setVolumes(vol, music) {
    this.vol = vol;
    this.musicVol = music;
    if (this.sfx) this.sfx.gain.value = vol;
    if (this.music) this.music.gain.value = music * 0.45;
  }

  makeNoise(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  tone(freq, dur, type, gain, dest, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseBurst(dur, freq, q, gain) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffers.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur);
  }

  gun(kind, dist = 0) {
    this.ensure();
    if (!this.ctx) return;
    const atten = dist > 0 ? Math.max(0.08, 1 - dist / 62) : 1;
    const table = {
      rifle: [0.13, 980, 140, 0.55],
      smg: [0.07, 1400, 180, 0.38],
      pistol: [0.09, 1600, 200, 0.42],
      shotgun: [0.22, 420, 90, 0.7],
      sniper: [0.32, 360, 70, 0.8],
      enemy: [0.1, 800, 150, 0.4],
    };
    const spec = table[kind] || table.rifle;
    this.noiseBurst(spec[0], spec[1], 0.7, spec[3] * atten * this.vol);
    this.tone(spec[2], 0.12, 'sine', 0.5 * atten, this.sfx, -80);
  }

  impact(flesh = false) {
    this.ensure();
    if (!this.ctx) return;
    if (flesh) this.noiseBurst(0.08, 300, 0.6, 0.28);
    else this.noiseBurst(0.05, 2200, 1.2, 0.18);
  }

  explode(dist = 0) {
    this.ensure();
    if (!this.ctx) return;
    const atten = Math.max(0.15, 1 - dist / 40);
    this.noiseBurst(0.45, 180, 0.5, 0.8 * atten);
    this.tone(70, 0.4, 'sine', 0.7 * atten, this.sfx, -30);
  }

  click() {
    this.tone(1800, 0.03, 'square', 0.08);
  }

  empty() {
    this.tone(420, 0.04, 'square', 0.12);
  }

  reload() {
    this.noiseBurst(0.08, 900, 2, 0.15);
    setTimeout(() => this.noiseBurst(0.06, 1400, 2, 0.12), 180);
  }

  step() {
    this.noiseBurst(0.04, 180, 0.8, 0.08);
  }

  hurt() {
    this.tone(140, 0.18, 'sawtooth', 0.08, this.sfx, -60);
  }

  objective() {
    this.tone(660, 0.08, 'sine', 0.12);
    setTimeout(() => this.tone(880, 0.12, 'sine', 0.12), 90);
  }

  sting(kind) {
    this.ensure();
    if (!this.ctx) return;
    if (kind === 'win') {
      [523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sine', 0.1), i * 90));
    } else {
      this.tone(110, 0.4, 'sawtooth', 0.12, this.sfx, -40);
    }
  }

  ui() {
    this.tone(520, 0.04, 'square', 0.04);
  }

  startPad() {
    const notes = [110, 164.8, 130.8];
    notes.forEach((freq, i) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      o.type = 'sine';
      o.frequency.value = freq;
      f.type = 'lowpass';
      f.frequency.value = 400;
      g.gain.value = 0.08;
      o.connect(f);
      f.connect(g);
      g.connect(this.music);
      o.start();
      this.pad.push({ o, g, f });
    });
    this.pulse = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    this.pulse.type = 'triangle';
    this.pulse.frequency.value = 55;
    pg.gain.value = 0;
    this.pulse.connect(pg);
    pg.connect(this.music);
    this.pulse.start();
    this.pulseGain = pg;
  }

  setMood(mood) {
    this.mood = mood;
    if (!this.pulseGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    const target = mood === 'combat' ? 0.06 : mood === 'win' ? 0.02 : 0;
    this.pulseGain.gain.cancelScheduledValues(t);
    this.pulseGain.gain.linearRampToValueAtTime(target, t + 0.4);
    if (this.pad[0]) {
      this.pad[0].o.frequency.setTargetAtTime(mood === 'win' ? 130.8 : 110, t, 0.3);
    }
  }

  setHeartbeat(on) {
    if (!this.ctx) return;
    if (on && !this.heartbeat) {
      const tick = () => {
        if (!this.heartbeat) return;
        this.tone(58, 0.12, 'sine', 0.16);
        this.heartTimer = setTimeout(tick, 700);
      };
      this.heartbeat = true;
      tick();
    } else if (!on && this.heartbeat) {
      this.heartbeat = false;
      clearTimeout(this.heartTimer);
    }
  }

  setRain(on) {
    this.ensure();
    if (!this.ctx) return;
    if (on && !this.rain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers.noise;
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0.04 * this.vol;
      src.connect(f);
      f.connect(g);
      g.connect(this.sfx);
      src.start();
      this.rain = { src, g };
    } else if (!on && this.rain) {
      this.rain.src.stop();
      this.rain = null;
    }
  }
}
