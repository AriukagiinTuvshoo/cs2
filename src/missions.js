import { tl } from './i18n.js';
import { YARD_WAVES, WaveDirector } from './entities.js';

export const MISSIONS = [
  {
    id: 'nightfall',
    map: 'compound',
    type: { en: 'Raid', mn: 'Дайралт' },
    name: { en: 'Nightfall', mn: 'Шөнийн дайралт' },
    place: { en: 'Raven Compound', mn: 'Хэрээний бааз' },
    par: 420,
    suggest: { op: 'ghost', primary: 'vx4', secondary: 'm19' },
    briefing: {
      en: 'Raven Compound has gone dark. Cut their comms, pull the command intel, and burn the armory. A bird sits on the north pad. Do not miss it.',
      mn: 'Хэрээний бааз харанхуй болсон. Холбоог тасал, командын мэдээг ав, зэвсгийн агуулахыг шатаа. Нисдэг тэрэг хойд талбайд хүлээнэ. Хоцрох хэрэггүй.',
    },
    steps: [
      {
        type: 'goto', zone: 'gate',
        text: { en: 'Enter the compound', mn: 'Баз руу нэвтрэх' },
        onEnter(game) {
          game.say('CONTROL', { en: 'Gate is open. Walk in quiet, or don\'t.', mn: 'Хаалга нээлттэй. Чимээгүй ор, эсвэл бүү чимээгүй.' });
        },
      },
      {
        type: 'interact', zone: 'radio', time: 2.6,
        prompt: { en: 'Disable comms', mn: 'Холбоо таслах' },
        text: { en: 'Disable the comms shack', mn: 'Холбооны байрыг унтраах' },
      },
      {
        type: 'interact', zone: 'intel', time: 1.5,
        prompt: { en: 'Take intel', mn: 'Мэдээ авах' },
        text: { en: 'Take the command intel', mn: 'Командын мэдээг авах' },
        onEnter(game) {
          game.say('ECHO', { en: 'Case is in the east building. Red roof of a sort.', mn: 'Хайрцаг зүүн байранд. Улаавтар дээвэртэйдээ.' });
        },
      },
      {
        type: 'interact', zone: 'armory', time: 3.4, cancelOnHit: true,
        prompt: { en: 'Plant charge', mn: 'Цэнэг суулгах' },
        text: { en: 'Plant the armory charge', mn: 'Агуулахын цэнэгийг суулгах' },
        onDone(game) {
          game.explode(1, 1.2, -28, 7, 90);
          game.say('CONTROL', { en: 'Charge is live. Move.', mn: 'Цэнэг идэвхжлээ. Хөдлө.' });
        },
      },
      {
        type: 'survive', zone: 'extract', time: 16,
        text: { en: 'Hold the helipad', mn: 'Нисэх талбайг хамгаалах' },
        onEnter(game) {
          game.say('ECHO', { en: 'Bird inbound. Hold the pad.', mn: 'Нисдэг тэрэг ойртож байна. Талбайг барь.' });
          [[8, -28], [20, -30], [4, -24], [-4, -34]].forEach(([x, z], i) => {
            game.spawnEnemy({ type: i === 3 ? 'rusher' : 'soldier', x, z, id: `ex${i}` });
          });
        },
      },
      {
        type: 'interact', zone: 'extract', time: 1.6,
        prompt: { en: 'Extract', mn: 'Гарах' },
        text: { en: 'Board the extract', mn: 'Гарц руу суух' },
      },
    ],
  },
  {
    id: 'market',
    map: 'downtown',
    type: { en: 'Heist', mn: 'Хулгай' },
    name: { en: 'Black Market Run', mn: 'Хар захын гүйлт' },
    place: { en: 'Port Vesper', mn: 'Порт Веспер' },
    par: 480,
    suggest: { op: 'raven', primary: 'sting', secondary: 'm19' },
    briefing: {
      en: 'Sol is moving a case through the neon district. Meet the contact, take the case at the club, burn the evidence lockers if you can, and reach the van before the district locks.',
      mn: 'Сол гэрэлт хороололд хайрцаг зөөнө. Холбоотонтой уулз, клубээс хайрцгийг ав, чадвал нотлох шүүгээг шатаа, хороолол хаагдахаас өмнө фургонд хүр.',
    },
    optional: { ids: ['ev1', 'ev2', 'ev3'], text: { en: 'Burn 3 evidence lockers', mn: '3 нотлох шүүгээ шатаах' } },
    steps: [
      {
        type: 'goto', zone: 'contact',
        text: { en: 'Meet the contact in the garage', mn: 'Гарааш дахь холбоотонтой уулзах' },
        onEnter(game) {
          game.say('CONTROL', { en: 'Rain is on our side. The garage is north of the plaza.', mn: 'Бороо бидний талд. Гарааш талбайн хойд талд.' });
        },
      },
      {
        type: 'eliminate', ids: ['sol'],
        text: { en: 'Drop Sol', mn: 'Солыг унагах' },
        onEnter(game) {
          game.say('ECHO', { en: 'Club Sol. West door. He will not shake your hand.', mn: 'Клуб Сол. Баруун хаалга. Гар барихгүй.' });
        },
      },
      {
        type: 'interact', zone: 'club', time: 1.6,
        prompt: { en: 'Take the case', mn: 'Хайрцаг авах' },
        text: { en: 'Take Sol\'s case', mn: 'Солын хайрцгийг авах' },
        onDone(game) {
          game.say('CONTROL', { en: 'They know. Van is northeast. Run.', mn: 'Тэд мэдлээ. Фургон зүүн хойд талд. Гүй.' });
          const pts = game.spec.spawnPoints || [];
          for (let i = 0; i < 7; i++) {
            const p = pts[i % pts.length];
            game.spawnEnemy({ type: i % 3 === 0 ? 'rusher' : 'soldier', x: p.x, z: p.z, id: `esc${i}` });
          }
        },
      },
      {
        type: 'interact', zone: 'van', time: 1.8,
        prompt: { en: 'Get in the van', mn: 'Фургонд суух' },
        text: { en: 'Reach the getaway van', mn: 'Зугтах фургонд хүрэх' },
      },
    ],
  },
  {
    id: 'convoy',
    map: 'highway',
    type: { en: 'Convoy', mn: 'Цуваа' },
    name: { en: 'Ridge Intercept', mn: 'Нурууны отолт' },
    place: { en: 'Ridge Road', mn: 'Нурууны зам' },
    par: 200,
    suggest: { op: 'hawk', primary: 'kr762', secondary: 'm19' },
    briefing: {
      en: 'Their truck is running the ridge at dusk. Stop it before the tunnel. The cargo is the job. The escorts will disagree.',
      mn: 'Тэдний ачааны машин үдшийн нуруугаар давхина. Хонгилоос өмнө зогсоо. Ачаа бол ажил. Хамгаалагчид зөвшөөрөхгүй.',
    },
    steps: [
      {
        type: 'truck',
        text: { en: 'Stop the truck before the tunnel', mn: 'Хонгилоос өмнө машиныг зогсоо' },
        onEnter(game) {
          game.say('CONTROL', { en: 'Headlights on the ridge. Shoot the cab, not the sunset.', mn: 'Нуруун дээр гэрэл. Нар жаргахыг биш, бүхээгийг бууд.' });
        },
      },
      {
        type: 'interact', zone: 'loot', time: 2.2, followTruck: true,
        prompt: { en: 'Loot the cargo', mn: 'Ачаа авах' },
        text: { en: 'Take the cargo', mn: 'Ачааг авах' },
      },
      {
        type: 'interact', zone: 'extract', time: 1.5,
        prompt: { en: 'Extract', mn: 'Гарах' },
        text: { en: 'Reach the pullout van', mn: 'Хажуугийн фургонд хүрэх' },
        onEnter(game) {
          game.say('ECHO', { en: 'Pullout is south, left side. Move before the rest arrive.', mn: 'Гарц урагш, зүүн талд. Бусад ирэхээс өмнө хөдлө.' });
        },
      },
    ],
  },
  {
    id: 'extract',
    map: 'office',
    type: { en: 'Rescue', mn: 'Аврал' },
    name: { en: 'Safe Extract', mn: 'Аюулгүй гаргалт' },
    place: { en: 'Meridian Offices', mn: 'Меридиан оффис' },
    par: 380,
    suggest: { op: 'iron', primary: 'vx4', secondary: 'auto9' },
    briefing: {
      en: 'Two analysts are held in the Meridian block. Get them walking and keep them walking. The street team is parked out front. Stay close — strays and blasts still hurt them.',
      mn: 'Хоёр шинжээчийг Меридиан оффист хорьсон. Тэднийг алхуулж, алхалтыг нь бүү тасла. Гудамжны баг үүдэнд хүлээж байна. Ойр бай — тэнэмэл сум, дэлбэрэлт тэдэнд тусна.',
    },
    steps: [
      {
        type: 'goto', zone: 'door',
        text: { en: 'Enter Meridian', mn: 'Меридианд орох' },
        onEnter(game) {
          game.say('CONTROL', { en: 'Ana is on the ground floor, east. Bor is upstairs. Press E to make them follow.', mn: 'Ана нэгдүгээр давхарт, зүүн талд. Бор дээд давхарт. E дарж дагуул.' });
        },
      },
      {
        type: 'escort',
        text: { en: 'Get Ana and Bor to follow', mn: 'Ана, Бор хоёрыг дагуул' },
      },
      {
        type: 'hostages', zone: 'extract',
        text: { en: 'Escort both to the van', mn: 'Хоёуланг нь фургон руу дагуул' },
        onEnter(game) {
          game.say('ECHO', { en: 'Van is out front, left of the doors. Do not sprint off and leave them.', mn: 'Фургон үүдний зүүн талд. Тэднийг орхиод бүү гүй.' });
        },
      },
    ],
  },
  {
    id: 'defuse',
    map: 'vault',
    type: { en: 'Defuse', mn: 'Тайлалт' },
    name: { en: 'Sand Vault', mn: 'Элсний сан' },
    place: { en: 'Sand Vault', mn: 'Элсний сан' },
    par: 110,
    timer: 110,
    suggest: { op: 'raven', primary: 'vx4', secondary: 'm19' },
    briefing: {
      en: 'Two devices are live. You have until the clock dies. Defuse both. Taking a hit resets your hands — clear the room first.',
      mn: 'Хоёр төхөөрөмж идэвхтэй. Цаг дуусахаас өмнө хоёуланг нь тайл. Сум тусвал гар тасарна — эхлээд өрөөг цэвэрлэ.',
    },
    steps: [
      {
        type: 'bombs',
        text: { en: 'Defuse both devices', mn: 'Хоёр төхөөрөмжийг тайлах' },
        onEnter(game) {
          game.say('CONTROL', { en: 'Site A is the west building. Site B is the truck yard. Clock is already ugly.', mn: 'А цэг баруун байр. Б цэг ачааны талбай. Цаг аль хэдийн муухай.' });
        },
      },
    ],
  },
  {
    id: 'stand',
    map: 'yard',
    type: { en: 'Survival', mn: 'Тэсч үлдэх' },
    name: { en: 'Last Stand', mn: 'Сүүлчийн тулаан' },
    place: { en: 'Kestrel Yard', mn: 'Кестрелийн талбай' },
    par: 480,
    horde: true,
    suggest: { op: 'iron', primary: 'breach', secondary: 'auto9' },
    briefing: {
      en: 'No extract. Eight waves, one yard, whatever you can carry. Spend the cash between bells. Die and the wave resets — your guns stay.',
      mn: 'Гарц байхгүй. Найман давалгаа, нэг талбай, үүрч чадах бүхнээ ав. Хонхны хооронд мөнгөө зарцуул. Унвал давалгаа шинээр эхэлнэ — буу чинь үлдэнэ.',
    },
    steps: [
      {
        type: 'waves',
        text: { en: 'Survive eight waves', mn: 'Найман давалгааг давах' },
        onEnter(game) {
          game.cash = 200;
          game.waves = new WaveDirector(YARD_WAVES, game.spec.spawnPoints || []);
          game.say('CONTROL', { en: 'They want the yard back. It is not theirs.', mn: 'Тэд талбайгаа буцааж авна гэж бодож байна. Тэднийх биш.' });
        },
      },
    ],
  },
];

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

export class MissionRunner {
  constructor(def, game) {
    this.def = def;
    this.game = game;
    for (const step of def.steps) {
      step._in = false;
      step.progress = 0;
    }
    this.i = 0;
    this.time = 0;
    this.flags = { bombA: false, bombB: false };
    this.done = false;
    this.bombT = def.timer || 0;
  }

  current() {
    return this.def.steps[this.i] || null;
  }

  update(dt) {
    if (this.done) return;
    this.time += dt;
    if (this.def.timer) {
      this.bombT -= dt;
      if (this.bombT <= 0) {
        this.game.failMission('time');
        return;
      }
    }
    if (this.game.truck?.escaped && !this.game.truck.stopped && this.i === 0 && this.current()?.type === 'truck') {
      this.game.failMission('truck');
      return;
    }
    const step = this.current();
    if (!step) return;
    if (!step._in) {
      step._in = true;
      step.progress = 0;
      step.onEnter?.(this.game, this);
    }
    if (this.stepDone(step, dt)) {
      step.onDone?.(this.game, this);
      this.i++;
      this.game.audio.objective();
      this.game.checkpoint();
      this.game.uiToast('checkpoint');
      if (this.i >= this.def.steps.length) this.game.completeMission();
    }
  }

  stepDone(step, dt) {
    const game = this.game;
    if (step.type === 'goto') return game.playerInZone(step.zone);
    if (step.type === 'interact') return this.hold(step, dt);
    if (step.type === 'eliminate') {
      return step.ids.every((id) => game.enemies.some((e) => e.id === id && !e.alive));
    }
    if (step.type === 'survive') {
      if (!game.playerInZone(step.zone)) return false;
      step.progress += dt;
      return step.progress >= step.time;
    }
    if (step.type === 'truck') return !!game.truck?.stopped;
    if (step.type === 'escort') return game.hostages.length > 0 && game.hostages.every((h) => h.following && !h.downed && !h.dead);
    if (step.type === 'hostages') {
      return game.hostages.every((h) => !h.dead && !h.downed && h.following && game.posInZone(h.pos.x, h.pos.z, step.zone));
    }
    if (step.type === 'bombs') return this.flags.bombA && this.flags.bombB;
    if (step.type === 'waves') return !!game.waves?.finished;
    return false;
  }

  hold(step, dt) {
    const game = this.game;
    const zone = step.followTruck && game.truck ? { x: game.truck.x, z: game.truck.z, r: 3.2 } : game.spec.zones[step.zone];
    const inside = zone && Math.hypot(game.player.x - zone.x, game.player.z - zone.z) <= zone.r;
    const holding = game.input.down('KeyE') || game.input.gp.buttons.has(2);
    if (!inside || !holding || (step.cancelOnHit && game.player.hurtLock > 0)) {
      step.progress = Math.max(0, (step.progress || 0) - dt * 1.4);
      game.holdPrompt = inside ? { p: step.progress / step.time, text: tl(step.prompt) } : null;
      return false;
    }
    step.progress += dt;
    game.holdPrompt = { p: Math.min(1, step.progress / step.time), text: tl(step.prompt) };
    return step.progress >= step.time;
  }

  beacon() {
    const step = this.current();
    if (!step) return null;
    const game = this.game;
    if (step.type === 'truck' && game.truck && !game.truck.stopped) return { x: game.truck.x, y: 2, z: game.truck.z, color: 0xff5544 };
    if (step.followTruck && game.truck) return { x: game.truck.x, y: 1.4, z: game.truck.z, color: 0xf0a202 };
    if (step.zone && game.spec.zones?.[step.zone]) {
      const z = game.spec.zones[step.zone];
      return { x: z.x, y: 0, z: z.z, color: step.zone === 'extract' || step.zone === 'van' ? 0x3ddea0 : 0xf0a202 };
    }
    if (step.type === 'eliminate') {
      const e = game.enemies.find((n) => step.ids.includes(n.id) && n.alive);
      if (e) return { x: e.pos.x, y: 0, z: e.pos.z, color: 0xff4455 };
    }
    if (step.type === 'escort' || step.type === 'hostages') {
      const h = game.hostages.find((n) => !n.following || n.downed) || game.hostages[0];
      if (h) return { x: h.pos.x, y: 0, z: h.pos.z, color: 0x3ddea0 };
    }
    if (step.type === 'bombs') {
      if (!this.flags.bombA) return { ...(game.spec.zones.bombA), y: 0, color: 0xff4455 };
      if (!this.flags.bombB) return { ...(game.spec.zones.bombB), y: 0, color: 0xff4455 };
    }
    return null;
  }

  objective() {
    const step = this.current();
    if (!step) return '';
    let text = tl(step.text);
    if (step.type === 'survive') text += `  ${Math.max(0, Math.ceil(step.time - (step.progress || 0)))}s`;
    if (step.type === 'eliminate') {
      const dead = step.ids.filter((id) => this.game.enemies.some((e) => e.id === id && !e.alive)).length;
      text += `  ${dead}/${step.ids.length}`;
    }
    if (step.type === 'waves' && this.game.waves) {
      const w = this.game.waves;
      text = `${tl({ en: 'Wave', mn: 'Давалгаа' })} ${Math.max(1, w.index + 1)}/8`;
    }
    return text;
  }
}
