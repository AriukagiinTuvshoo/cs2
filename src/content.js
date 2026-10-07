export const PAL = {
  concrete: 0x6a7078,
  concreteDark: 0x3a414c,
  concreteLite: 0x8b929c,
  metal: 0x5c656e,
  metalDark: 0x2c333b,
  sand: 0xc6ae78,
  stucco: 0xd8c6a2,
  stuccoDark: 0xb79b72,
  brick: 0x7c433c,
  asphalt: 0x2c3036,
  rust: 0x8a3e28,
  crate: 0x8a6a3a,
  containerRed: 0x8f2d2a,
  containerBlue: 0x1d4e70,
  containerGreen: 0x2a5a44,
  containerOrange: 0xb8612a,
  trim: 0x171b20,
  nightWall: 0x2a3140,
  nightWall2: 0x332833,
  nightWall3: 0x243238,
  nightWall4: 0x3a3028,
};

export const OPERATORS = [
  {
    id: 'raven',
    name: 'RAVEN',
    portrait: '/avatars/raven.png',
    role: { en: 'Assault', mn: 'Довтлогч' },
    blurb: {
      en: 'Faster feet, faster swaps. First through the door.',
      mn: 'Хөл хурдан, зэвсэг солих хурдан. Хаалгаар түрүүлж орно.',
    },
    perk: { en: '+12% speed, faster weapon swap', mn: '+12% хурд, зэвсэг хурдан солино' },
    color: '#e85d4c',
  },
  {
    id: 'ghost',
    name: 'GHOST',
    portrait: '/avatars/ghost.png',
    role: { en: 'Recon', mn: 'Тагнуул' },
    blurb: {
      en: 'The street hears everyone else first.',
      mn: 'Гудамж бусдыг эхэлж сонсдог.',
    },
    perk: { en: 'Quieter steps, later detection, wider radar', mn: 'Чимээгүй алхаа, хожуу илрэлт, өргөн радар' },
    color: '#3ecfbe',
  },
  {
    id: 'iron',
    name: 'IRON',
    portrait: '/avatars/iron.png',
    role: { en: 'Anchor', mn: 'Тулгуур' },
    blurb: {
      en: 'The wall that shoots back.',
      mn: 'Буцаад бууддаг хана.',
    },
    perk: { en: 'Starts armored, shrugs off blasts, slightly slower', mn: 'Хуягтай эхэлнэ, дэлбэрэлт бага тусна, арай удаан' },
    color: '#d7a15a',
  },
  {
    id: 'hawk',
    name: 'HAWK',
    portrait: '/avatars/hawk.png',
    role: { en: 'Marksman', mn: 'Мэргэн' },
    blurb: {
      en: 'One breath. One hole.',
      mn: 'Нэг амьсгал. Нэг нүх.',
    },
    perk: { en: 'Less recoil, faster aim, nastier headshots', mn: 'Бага хаялт, хурдан онилто, илүү хүчтэй толгойн онолт' },
    color: '#7eb6ff',
  },
];

export const WEAPONS = {
  vx4: {
    id: 'vx4', name: 'VX-4', slot: 'primary', kind: 'rifle', auto: true,
    rpm: 680, dmg: 26, hs: 2.4, mag: 30, reserve: 90, reload: 2.0,
    spread: 0.0065, spreadMove: 0.024, spreadAir: 0.046,
    recoil: 0.0092, recoilSide: 0.0036,
    falloff: [22, 62, 0.74], ads: 58, adsMul: 0.34, range: 140,
    desc: { en: 'Stable carbine. The honest tool.', mn: 'Тогтвортой карбин. Шударга хэрэгсэл.' },
    price: 0,
  },
  kr762: {
    id: 'kr762', name: 'KR-762', slot: 'primary', kind: 'rifle', auto: true,
    rpm: 520, dmg: 34, hs: 2.45, mag: 30, reserve: 90, reload: 2.35,
    spread: 0.009, spreadMove: 0.03, spreadAir: 0.055,
    recoil: 0.0155, recoilSide: 0.005,
    falloff: [18, 55, 0.7], ads: 56, adsMul: 0.38, range: 140,
    desc: { en: 'Heavy rifle. Three to the chest, if you can hold it.', mn: 'Хүнд буу. Цээжинд гурав, барьж чадвал.' },
    price: 900,
  },
  sting: {
    id: 'sting', name: 'STING-9', slot: 'primary', kind: 'smg', auto: true,
    rpm: 920, dmg: 17, hs: 2.05, mag: 32, reserve: 128, reload: 1.65,
    spread: 0.013, spreadMove: 0.032, spreadAir: 0.05,
    recoil: 0.0064, recoilSide: 0.004,
    falloff: [8, 28, 0.42], ads: 62, adsMul: 0.45, range: 70,
    desc: { en: 'Close streets. Long alleys will embarrass you.', mn: 'Ойрын гудамжинд. Урт гудамжинд ичих болно.' },
    price: 700,
  },
  breach: {
    id: 'breach', name: 'BREACH-12', slot: 'primary', kind: 'shotgun', auto: false,
    rpm: 68, dmg: 12, hs: 1.45, mag: 6, reserve: 24, reload: 2.55,
    spread: 0.075, spreadMove: 0.09, spreadAir: 0.11,
    recoil: 0.028, recoilSide: 0.01,
    falloff: [5, 16, 0.12], ads: 66, adsMul: 0.62, range: 28, pellets: 8,
    desc: { en: 'Doorways and bad decisions.', mn: 'Хаалга, муу шийдвэрт зориулав.' },
    price: 800,
  },
  longbow: {
    id: 'longbow', name: 'LONGBOW', slot: 'primary', kind: 'sniper', auto: false,
    rpm: 46, dmg: 96, hs: 2.15, mag: 5, reserve: 20, reload: 2.85,
    spread: 0.02, spreadMove: 0.06, spreadAir: 0.09,
    recoil: 0.04, recoilSide: 0.004,
    falloff: [40, 110, 0.9], ads: 24, adsMul: 0.08, range: 180,
    desc: { en: 'Bolt action. Aim like you mean it.', mn: 'Больттой. Үнэхээр онил.' },
    price: 1400,
  },
  m19: {
    id: 'm19', name: 'M19', slot: 'secondary', kind: 'pistol', auto: false,
    rpm: 420, dmg: 24, hs: 2.3, mag: 12, reserve: 48, reload: 1.45,
    spread: 0.0055, spreadMove: 0.018, spreadAir: 0.04,
    recoil: 0.012, recoilSide: 0.003,
    falloff: [12, 36, 0.62], ads: 60, adsMul: 0.4, range: 80,
    desc: { en: 'Sidearm. Still a gun.', mn: 'Нэмэлт буу. Гэсэн ч буу.' },
    price: 0,
  },
  auto9: {
    id: 'auto9', name: 'AUTO-9', slot: 'secondary', kind: 'smg', auto: true,
    rpm: 760, dmg: 15, hs: 1.9, mag: 18, reserve: 72, reload: 1.55,
    spread: 0.016, spreadMove: 0.034, spreadAir: 0.05,
    recoil: 0.007, recoilSide: 0.005,
    falloff: [7, 24, 0.4], ads: 64, adsMul: 0.5, range: 50,
    desc: { en: 'Machine pistol for when the room gets small.', mn: 'Өрөө жижгрэхэд зориулсан автомат гар буу.' },
    price: 500,
  },
  knife: {
    id: 'knife', name: 'KNIFE', slot: 'melee', kind: 'knife', auto: false,
    rpm: 110, dmg: 58, hs: 1, mag: 1, reserve: 0, reload: 0,
    spread: 0, spreadMove: 0, spreadAir: 0, recoil: 0, recoilSide: 0,
    falloff: [2.2, 2.2, 1], ads: 75, adsMul: 1, range: 2.25, melee: true, backstab: 2.6,
    desc: { en: 'Quiet, if you are behind them.', mn: 'Тэдний ард бол чимээгүй.' },
    price: 0,
  },
};

export const PRIMARY_IDS = ['vx4', 'kr762', 'sting', 'breach', 'longbow'];
export const SECONDARY_IDS = ['m19', 'auto9'];

export const DIFFICULTY = {
  easy: { dmg: 0.55, acc: 1.55, see: 0.78, hp: 0.85, react: 0.42, label: 'easy' },
  normal: { dmg: 1, acc: 1, see: 1, hp: 1, react: 0.28, label: 'normal' },
  hard: { dmg: 1.32, acc: 0.68, see: 1.18, hp: 1.22, react: 0.14, label: 'hard' },
};

export const ENEMY_TYPES = {
  soldier: { hp: 100, dmg: 8, rate: 0.48, speed: 3.35, see: 26, fov: 1.05, acc: 0.055, hear: 1, range: 42 },
  rusher: { hp: 78, dmg: 7, rate: 0.3, speed: 5.15, see: 22, fov: 1.2, acc: 0.075, hear: 1.1, range: 28 },
  sniper: { hp: 80, dmg: 27, rate: 1.38, speed: 0, see: 52, fov: 0.62, acc: 0.018, hear: 0.8, range: 70, hold: true },
  heavy: { hp: 250, dmg: 13, rate: 0.58, speed: 2.25, see: 24, fov: 1.0, acc: 0.06, hear: 1, range: 36, resist: 0.55 },
  boss: { hp: 170, dmg: 10, rate: 0.34, speed: 3.7, see: 30, fov: 1.15, acc: 0.042, hear: 1, range: 40 },
};

export const TIPS = {
  en: [
    'Tap the opposite strafe key to stop dead. Your first bullet gets honest.',
    'Crouch behind a crate. Stand up to shoot over it.',
    'Headshots end arguments.',
    'Red barrels are a plan, until you are standing next to one.',
    'GHOST is quieter. Guns are not.',
    'A knife in the back drops a standard guard.',
    'IRON walks into blasts that would fold anyone else.',
    'SMGs lie to you past twenty meters. Rifles do not.',
  ],
  mn: [
    'Эсрэг тийшээ товч дарж огцом зогс. Эхний сум шударга ононо.',
    'Хайрцгийн ард суу. Босоод дээгүүр нь бууд.',
    'Толгойн онолт маргааныг дуусгана.',
    'Улаан торх бол төлөвлөгөө. Хажууд нь зогсоогүй үед.',
    'GHOST чимээгүй. Буу чимээгүй биш.',
    'Ард нь хутгалбал энгийн харуул унана.',
    'IRON бусдыг унагах дэлбэрэлт рүү алхана.',
    'SMG хорин метрээс цааш худлаа ярина. Винтов үгүй.',
  ],
};

export const ENEMY_NAMES = [
  'RAIDER', 'VULTURE', 'KESTREL', 'NOMAD', 'BRICK', 'SABLE', 'WARD', 'HEX',
  'MOOR', 'PIKE', 'ASH', 'LANCE', 'CINDER', 'GRIT', 'BOLT', 'NYX', 'QUILL',
  'TORCH', 'REED', 'JUNK', 'HARK', 'VELT', 'OX', 'MARROW',
];
