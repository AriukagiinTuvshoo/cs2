const KEY = 'blackout-protocol-v1';

export const defaultSave = () => ({
  settings: {
    lang: 'mn',
    sens: 1,
    fov: 78,
    vol: 0.85,
    music: 0.32,
    invert: false,
    shake: true,
    numbers: true,
    shadows: true,
    quality: 'high',
    difficulty: 'normal',
  },
  xp: 0,
  stats: {
    kills: 0,
    shots: 0,
    hits: 0,
    headshots: 0,
    missions: 0,
    playTime: 0,
  },
  missions: {},
  loadout: { op: 'raven', primary: 'vx4', secondary: 'm19' },
  tutorial: true,
  seenSplash: false,
});

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    const base = defaultSave();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}) },
      loadout: { ...base.loadout, ...(parsed.loadout || {}) },
      missions: parsed.missions || {},
    };
  } catch {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* private mode */
  }
}
