import * as THREE from 'three';

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  return c;
}

function texFrom(c, rx = 1, ry = 1, linear = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = linear ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  t.userData.shared = true;
  return t;
}

function hash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function vnoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0);
  const b = hash(x0 + 1, y0);
  const c = hash(x0, y0 + 1);
  const d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x, y) {
  let v = 0;
  let a = 0.55;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    v += a * vnoise(x * f, y * f);
    f *= 2.05;
    a *= 0.5;
  }
  return v;
}

function heightField(w, h, fn) {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data[y * w + x] = fn(x / w, y / h, x, y);
  }
  return data;
}

function paint(w, h, height, colorAt) {
  return canvas(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let i = 0; i < height.length; i++) {
      const [r, gg, b] = colorAt(height[i], i % w, (i / w) | 0);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = gg;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
}

function normals(height, w, h, scale = 3.2) {
  return canvas(w, h, (g) => {
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const hl = height[y * w + ((x - 1 + w) % w)];
        const hr = height[y * w + ((x + 1) % w)];
        const hd = height[((y - 1 + h) % h) * w + x];
        const hu = height[((y + 1) % h) * w + x];
        let nx = (hl - hr) * scale;
        let ny = (hd - hu) * scale;
        let nz = 1;
        const len = Math.hypot(nx, ny, nz) || 1;
        nx /= len; ny /= len; nz /= len;
        const i = (y * w + x) * 4;
        img.data[i] = (nx * 0.5 + 0.5) * 255;
        img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
        img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}

function pair(height, w, h, colorAt, repeat = 2, nScale = 3) {
  return {
    map: texFrom(paint(w, h, height, colorAt), repeat, repeat),
    normal: texFrom(normals(height, w, h, nScale), repeat, repeat, true),
  };
}

let cache = null;

export function getTextures() {
  if (cache) return cache;
  const S = 512;
  const concreteH = heightField(S, S, (u, v) => {
    const slab = (Math.floor(u * 4) + Math.floor(v * 8)) % 2 ? 0.04 : 0;
    const seam = (Math.abs((u * 4) % 1 - 0.5) > 0.48 || Math.abs((v * 8) % 1 - 0.5) > 0.47) ? -0.18 : 0;
    return fbm(u * 6, v * 6) * 0.55 + slab + seam;
  });
  const concrete = pair(concreteH, S, S, (h) => {
    const n = 138 + h * 70;
    return [n + 6, n + 4, n];
  }, 2, 4.2);

  const asphaltH = heightField(S, S, (u, v) => fbm(u * 10, v * 10) * 0.7 + fbm(u * 40, v * 28) * 0.25);
  const asphalt = pair(asphaltH, S, S, (h) => {
    const n = 42 + h * 36;
    return [n, n + 1, n + 2];
  }, 5, 5);

  const sandH = heightField(S, S, (u, v) => fbm(u * 8, v * 8) * 0.8 + Math.sin(u * 40) * 0.04);
  const sand = pair(sandH, S, S, (h) => {
    const n = 168 + h * 50;
    return [n + 18, n - 4, n - 48];
  }, 4, 2.4);

  const dirtH = heightField(S, S, (u, v) => fbm(u * 7, v * 7) * 0.85);
  const dirt = pair(dirtH, S, S, (h) => {
    const n = 92 + h * 40;
    return [n + 8, n - 10, n - 28];
  }, 4, 3);

  const metalH = heightField(256, 256, (u, v) => {
    const rib = Math.sin(v * Math.PI * 48) * 0.08;
    return fbm(u * 4, v * 4) * 0.25 + rib;
  });
  const metal = pair(metalH, 256, 256, (h) => {
    const n = 150 + h * 40;
    return [n, n + 3, n + 6];
  }, 1, 2.2);

  const crateH = heightField(256, 256, (u, v) => {
    const edge = (u < 0.06 || u > 0.94 || v < 0.06 || v > 0.94) ? 0.25 : 0;
    const brace = (Math.abs(u - v) < 0.03 || Math.abs(u + v - 1) < 0.03) ? 0.15 : 0;
    return fbm(u * 5, v * 5) * 0.35 + edge + brace;
  });
  const crate = pair(crateH, 256, 256, (h) => {
    const n = 118 + h * 40;
    return [n + 10, n - 28, n - 62];
  }, 1, 3);

  const hazard = texFrom(canvas(128, 32, (g, w, h) => {
    g.fillStyle = '#111';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e2b000';
    for (let x = -h; x < w; x += 16) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 8, 0);
      g.lineTo(x + 16, 0);
      g.lineTo(x + 8, h);
      g.fill();
    }
  }), 2, 1);

  const radial = texFrom(canvas(64, 64, (g, w, h) => {
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }));

  const decal = texFrom(canvas(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,16,14,0.85)';
    g.beginPath();
    g.arc(32, 32, 10, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(32, 32, 16, 0, Math.PI * 2);
    g.stroke();
  }));

  const facades = new Map();
  function facade(seedX, seedZ, night) {
    const key = `${Math.round(seedX)}|${Math.round(seedZ)}|${night ? 1 : 0}`;
    if (facades.has(key)) return facades.get(key);
    const c = canvas(256, 256, (g, w, h) => {
      g.fillStyle = night ? '#1a1e26' : '#cbb892';
      g.fillRect(0, 0, w, h);
      const cols = 6;
      const rows = 8;
      const padX = 14;
      const padY = 10;
      const ww = (w - padX * 2) / cols;
      const hh = (h - padY * 2) / rows;
      let s = Math.abs(Math.sin(seedX * 12.1 + seedZ * 4.7)) * 10000;
      const rnd = () => {
        s = (s * 16807) % 2147483647;
        return (s % 1000) / 1000;
      };
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const lit = rnd() > (night ? 0.42 : 0.78);
          const palette = ['#ffd39a', '#9ad7ff', '#ff8ec8', '#fff1c9', '#c8b6ff'];
          g.fillStyle = lit ? palette[Math.floor(rnd() * palette.length)] : (night ? '#0c1016' : '#6d8294');
          g.fillRect(padX + x * ww + 3, padY + y * hh + 3, ww - 8, hh - 7);
          g.strokeStyle = 'rgba(0,0,0,0.45)';
          g.strokeRect(padX + x * ww + 2, padY + y * hh + 2, ww - 6, hh - 5);
        }
      }
    });
    const map = texFrom(c);
    const em = texFrom(c);
    map.userData.shared = true;
    em.userData.shared = true;
    const pairTex = { map, em };
    facades.set(key, pairTex);
    return pairTex;
  }

  function sign(text, color) {
    const c = canvas(512, 128, (g, w, h) => {
      g.fillStyle = '#07080c';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = color;
      g.lineWidth = 6;
      g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = color;
      g.font = '700 54px Oswald, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 2);
    });
    return texFrom(c);
  }

  cache = {
    concrete: concrete.map,
    concreteN: concrete.normal,
    asphalt: asphalt.map,
    asphaltN: asphalt.normal,
    sand: sand.map,
    sandN: sand.normal,
    dirt: dirt.map,
    dirtN: dirt.normal,
    metal: metal.map,
    metalN: metal.normal,
    crate: crate.map,
    crateN: crate.normal,
    hazard,
    radial,
    decal,
    facade,
    sign,
    owned: facades,
  };
  return cache;
}
