// ABYSSAL — entry point: game loop, screens, and event wiring.
// The world is stepped at a fixed 1/60 s so live play and staged screenshots
// behave the same. All rendering goes through render.js; all sound through
// audio.js; this file only owns screens, timing, and input routing.

import { VIEW, PLAYER, SHAKE, WAVE_BANNER_TIME } from './config.js';
import { World, EVENT_OVER } from './world.js';
import { Input } from './input.js';
import { AudioManager } from './audio.js';
import { Particles } from './particles.js';
import { Effects } from './effects.js';
import { Renderer } from './render.js';
import { stageShot } from './shots.js';
import { UPGRADES, rollChoices } from './upgrades.js';
import { loadBest, saveBest, countRun, loadRuns } from './storage.js';
import { angleTo, clamp } from './random.js';

const STEP = 1 / 60;
const SCREENS = ['title', 'howto', 'settings', 'play', 'upgrade', 'pause', 'over'];

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const audio = new AudioManager();
const particles = new Particles();
const fx = new Effects();

let screen = 'title';
let world = new World(5);
let demoWorld = new World(5);
let time = 0;
let best = loadBest();
let runs = loadRuns();
let isNewBest = false;
let upgradeChoices = [];
let upgradeHover = -1;
let clearTimer = 0;
let overTime = 0;
let settings = { muted: audio.muted, volume: audio.volume, shake: true };
try {
  const raw = localStorage.getItem('abyssal-shake');
  if (raw !== null) settings.shake = raw === '1';
} catch (e) {
  // Keep default.
}
let titleButtons = null;
let overButtons = null;

function saveShake() {
  try {
    localStorage.setItem('abyssal-shake', settings.shake ? '1' : '0');
  } catch (e) {
    // Ignore storage failures.
  }
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'pickup':
      particles.burst(ev.x, ev.y, '#22e6ff', 10, 130, 3, 0.5);
      particles.floatText(ev.x, ev.y - 14, `+${ev.gained}`, '#7df3ff', 16);
      audio.pickup(ev.combo);
      break;
    case 'pulse': {
      particles.ring(ev.x, ev.y, '#22e6ff', ev.range, 0.45);
      const segs = 14;
      for (let i = 0; i < segs; i += 1) {
        const a = ev.angle + (i / segs - 0.5) * 1.9;
        particles.burst(ev.x + Math.cos(a) * ev.range * 0.7, ev.y + Math.sin(a) * ev.range * 0.7, '#7df3ff', 1, 60, 3, 0.4);
      }
      if (settings.shake) fx.shake(SHAKE.pulse, 0.18);
      audio.pulse();
      break;
    }
    case 'echo':
      particles.ring(ev.x, ev.y, '#8b5cf6', ev.range, 0.4);
      break;
    case 'dash':
      for (let i = 0; i < 8; i += 1) {
        particles.trail(ev.x, ev.y, '#22e6ff', 5);
      }
      audio.dash();
      break;
    case 'hit':
      if (settings.shake) fx.shake(SHAKE.hit, 0.35);
      fx.flash('255,84,112', 0.3);
      particles.burst(ev.x, ev.y, '#f472b6', 16, 200, 3, 0.6);
      audio.hit();
      break;
    case 'enemyDie':
      particles.burst(ev.x, ev.y, ev.elite ? '#fbbf24' : '#8b5cf6', ev.elite ? 26 : 14, 220, 3, 0.7);
      particles.floatText(ev.x, ev.y - 16, `+${ev.gained}`, '#eaf6ff', 17);
      if (ev.kind === 'leviathan' && settings.shake) fx.shake(SHAKE.death, 0.4);
      audio.enemyDie();
      break;
    case 'waveClear':
      fx.showBanner(`WAVE ${ev.wave} CLEARED`, `BONUS +${ev.bonus}`, WAVE_BANNER_TIME);
      fx.flash('34,230,255', 0.2);
      audio.waveClear();
      clearTimer = WAVE_BANNER_TIME;
      break;
    case 'waveStart':
      fx.showBanner(`WAVE ${ev.wave}`, ev.wave === 1 ? 'Survive the dark' : 'It gets deeper', 1.6);
      break;
    case 'waveStart':
      fx.showBanner(`WAVE ${ev.wave}`, ev.wave === 1 ? 'Survive the dark' : 'It gets deeper', 1.6);
      audio.waveStart();
      break;
    case 'upgrade':
      audio.upgrade();
      break;
    case 'gameOver':
      isNewBest = ev.score > best && ev.score > 0;
      best = saveBest(ev.score);
      runs = countRun();
      overTime = 0;
      audio.gameOver();
      audio.stopDrone();
      screen = 'over';
      announce(`Game over. Score ${ev.score}. Best ${best}.`);
      break;
    default:
      break;
  }
}

function startRun() {
  world = new World((Math.random() * 1e9) | 0);
  particles.clear();
  fx.clear();
  input.clearPresses();
  screen = 'play';
  audio.ensure();
  audio.startDrone();
  fx.showBanner('WAVE 1', 'Survive the dark', 1.6);
  announce('Wave 1. Collect orbs, avoid predators.');
}

function showTitle() {
  screen = 'title';
  demoWorld = new World(5);
  input.clearPresses();
  announce('ABYSSAL: Echoes of the Last Light. Main menu.');
}

function openUpgrade() {
  upgradeChoices = rollChoices(world.rng);
  upgradeHover = -1;
  screen = 'upgrade';
  input.clearPresses();
  announce('Wave cleared. Choose an upgrade.');
}

function chooseUpgrade(index) {
  const up = upgradeChoices[index];
  if (!up) return;
  world.applyUpgrade(up.id, UPGRADES);
  world.nextWave();
  screen = 'play';
  input.clearPresses();
  announce(`Upgrade: ${up.name}. Wave ${world.wave}.`);
}

function inRect(click, r) {
  return click && click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h;
}

function stepPlay(dt) {
  const mv = input.moveVector();
  const p = world.player;
  let aim = p.angle;
  if (input.touch.active) {
    const rect = canvas.getBoundingClientRect();
    const tx = ((input.touch.x - rect.left) * canvas.width) / rect.width;
    const ty = ((input.touch.y - rect.top) * canvas.height) / rect.height;
    aim = angleTo(p.x, p.y, tx, ty);
  } else {
    aim = angleTo(p.x, p.y, input.mouse.x, input.mouse.y);
  }
  const controls = {
    moveX: mv.x,
    moveY: mv.y,
    aim,
    pulse: input.mouseHeld || input.take('pulse'),
    dash: input.take('dash'),
  };
  const mask = world.step(dt, controls);
  for (const ev of world.events) handleEvent(ev);
  if (world.waveState === 'cleared') {
    clearTimer -= dt;
    if (clearTimer <= 0) openUpgrade();
  }
  return mask;
}

function stepDemo(dt) {
  // The title screen's living backdrop: a world playing itself.
  const p = demoWorld.player;
  let orb = null;
  let orbD = Infinity;
  for (const o of demoWorld.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < orbD) {
      orbD = d;
      orb = o;
    }
  }
  let foe = null;
  let foeD = Infinity;
  for (const e of demoWorld.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < foeD) {
      foeD = d;
      foe = e;
    }
  }
  let mx = 0;
  let my = 0;
  if (orb) {
    mx += (orb.x - p.x) / Math.max(1, orbD);
    my += (orb.y - p.y) / Math.max(1, orbD);
  }
  if (foe && foeD < 170) {
    mx += ((p.x - foe.x) / foeD) * 1.6;
    my += ((p.y - foe.y) / foeD) * 1.6;
  }
  const len = Math.hypot(mx, my) || 1;
  const aim = foe ? angleTo(p.x, p.y, foe.x, foe.y) : p.angle;
  const mask = demoWorld.step(dt, {
    moveX: mx / len,
    moveY: my / len,
    aim,
    pulse: !!foe && foeD < 240,
    dash: false,
  });
  for (const ev of demoWorld.events) {
    if (ev.type === 'pickup') particles.burst(ev.x, ev.y, '#22e6ff', 6, 100, 3, 0.5);
    if (ev.type === 'pulse') particles.ring(ev.x, ev.y, '#22e6ff', 200, 0.4);
    if (ev.type === 'enemyDie') particles.burst(ev.x, ev.y, '#8b5cf6', 10, 180, 3, 0.6);
  }
  if (mask & EVENT_OVER) demoWorld = new World(5);
}

function update(dt) {
  time += dt;
  fx.update(dt);
  particles.update(dt);
  if (input.take('mute')) {
    audio.ensure();
    audio.setMuted(!audio.muted);
    settings.muted = audio.muted;
  }
  if (screen === 'play') {
    if (input.take('pause')) {
      screen = 'pause';
      input.clearPresses();
      announce('Paused.');
      return;
    }
    stepPlay(dt);
    // Touch drag moves the player toward the touch point.
    if (input.touch.active) {
      const rect = canvas.getBoundingClientRect();
      const tx = ((input.touch.x - rect.left) * canvas.width) / rect.width;
      const ty = ((input.touch.y - rect.top) * canvas.height) / rect.height;
      const p = world.player;
      const d = Math.hypot(tx - p.x, ty - p.y);
      if (d > 24) {
        p.vx += ((tx - p.x) / d) * 1500 * dt;
        p.vy += ((ty - p.y) / d) * 1500 * dt;
      }
    }
  } else if (screen === 'title') {
    stepDemo(dt);
    const click = input.takeClick();
    if (click && titleButtons) {
      if (inRect(click, titleButtons.play)) {
        audio.ensure();
        audio.click();
        startRun();
      } else if (inRect(click, titleButtons.howto)) {
        audio.ensure();
        audio.click();
        screen = 'howto';
        input.clearPresses();
      } else if (inRect(click, titleButtons.settings)) {
        audio.ensure();
        audio.click();
        screen = 'settings';
        input.clearPresses();
      }
    }
    if (input.take('confirm')) {
      audio.ensure();
      startRun();
    }
  } else if (screen === 'howto' || screen === 'settings') {
    if (input.takeClick() || input.take('pause') || input.take('confirm')) {
      screen = 'title';
      input.clearPresses();
    }
    if (screen === 'settings') {
      if (input.take('shake')) {
        settings.shake = !settings.shake;
        saveShake();
      }
      if (input.take('volDown')) {
        audio.ensure();
        audio.setVolume(audio.volume - 0.1);
        settings.volume = audio.volume;
      }
      if (input.take('volUp')) {
        audio.ensure();
        audio.setVolume(audio.volume + 0.1);
        settings.volume = audio.volume;
      }
    }
  } else if (screen === 'pause') {
    if (input.take('pause') || input.take('confirm') || input.take('dash')) {
      screen = 'play';
      input.clearPresses();
    }
    if (input.take('restart')) {
      startRun();
    }
    if (input.take('quit')) {
      showTitle();
    }
  } else if (screen === 'upgrade') {
    const click = input.takeClick();
    if (click) {
      const cw = 300;
      const ch = 300;
      const gap = 28;
      const total = cw * 3 + gap * 2;
      const x0 = VIEW.width / 2 - total / 2;
      const y0 = 230;
      for (let i = 0; i < 3; i += 1) {
        const r = { x: x0 + i * (cw + gap), y: y0, w: cw, h: ch };
        if (inRect(click, r)) {
          chooseUpgrade(i);
          break;
        }
      }
    }
    // Keyboard: 1/2/3 pick a card, Enter picks the hovered card (or the
    // first). Note: a mouse click also sets the 'pulse' pressed flag, so a
    // click must NOT be read as a keyboard choice here — that would apply
    // two upgrades and skip a wave.
    if (input.take('one')) chooseUpgrade(0);
    if (input.take('two')) chooseUpgrade(1);
    if (input.take('three')) chooseUpgrade(2);
    if (input.take('confirm')) chooseUpgrade(upgradeHover >= 0 ? upgradeHover : 0);
    upgradeHover = -1;
    if (input.mouse.x && input.mouse.y) {
      const cw = 300;
      const gap = 28;
      const total = cw * 3 + gap * 2;
      const x0 = VIEW.width / 2 - total / 2;
      for (let i = 0; i < 3; i += 1) {
        if (input.mouse.x >= x0 + i * (cw + gap) && input.mouse.x <= x0 + i * (cw + gap) + cw && input.mouse.y >= 230 && input.mouse.y <= 530) {
          upgradeHover = i;
        }
      }
    }
  } else if (screen === 'over') {
    overTime += dt;
    const click = input.takeClick();
    if (click && overButtons) {
      if (inRect(click, overButtons.again)) startRun();
      else if (inRect(click, overButtons.menu)) showTitle();
    }
    if (input.take('dash')) startRun();
    if (input.take('confirm')) startRun();
    if (input.take('restart')) startRun();
    if (input.take('quit')) showTitle();
  }
}

function render() {
  const ctx = renderer.ctx;
  renderer.clear();
  const shake = settings.shake ? fx.offset() : { x: 0, y: 0 };
  ctx.save();
  ctx.translate(shake.x, shake.y);
  if (screen === 'title' || screen === 'howto' || screen === 'settings') {
    renderer.drawBackground(time, demoWorld.player.x - VIEW.width / 2, demoWorld.player.y - VIEW.height / 2);
    for (const o of demoWorld.orbs) renderer.drawOrb(ctx, o, time);
    for (const e of demoWorld.enemies) renderer.drawEnemy(ctx, e, time);
    renderer.drawPlayer(ctx, demoWorld.player, demoWorld.stats, time);
    renderer.drawParticles(ctx, particles);
    if (screen === 'title') {
      titleButtons = renderer.drawTitle(ctx, time, best, runs);
    } else if (screen === 'howto') {
      renderer.drawHowTo(ctx);
    } else {
      renderer.drawSettings(ctx, settings);
    }
  } else {
    renderer.drawBackground(time, world.player.x - VIEW.width / 2, world.player.y - VIEW.height / 2);
    for (const o of world.orbs) renderer.drawOrb(ctx, o, time);
    for (const e of world.enemies) renderer.drawEnemy(ctx, e, time);
    renderer.drawPlayer(ctx, world.player, world.stats, time);
    renderer.drawParticles(ctx, particles);
    if (screen === 'play' || screen === 'pause') {
      renderer.drawHUD(ctx, world, time);
      const banner = fx.currentBanner();
      if (banner) renderer.drawBanner(ctx, banner);
      if (screen === 'pause') renderer.drawPause(ctx);
    } else if (screen === 'upgrade') {
      renderer.drawHUD(ctx, world, time);
      renderer.drawUpgrade(ctx, upgradeChoices, upgradeHover);
    } else if (screen === 'over') {
      overButtons = renderer.drawGameOver(ctx, world.score, best, isNewBest, world.wave, world.kills, overTime);
    }
  }
  ctx.restore();
  renderer.drawFlash(ctx, fx.flashColor, fx.flashAlpha());
}

// ---- Screenshot staging mode: ?shot=hero|combat|upgrade|over ----
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const shotSeed = Number.parseInt(params.get('seed') || '0', 10);

// Shot mode only spawns particles — no floating score text, no audio, no
// banners — so the frame stays clean for the cover.
function shotFx(ev) {
  if (ev.type === 'pickup') particles.burst(ev.x, ev.y, '#22e6ff', 8, 120, 3, 0.5);
  else if (ev.type === 'pulse') particles.ring(ev.x, ev.y, '#22e6ff', ev.range, 0.45);
  else if (ev.type === 'echo') particles.ring(ev.x, ev.y, '#8b5cf6', ev.range, 0.4);
  else if (ev.type === 'enemyDie') particles.burst(ev.x, ev.y, ev.elite ? '#fbbf24' : '#8b5cf6', 14, 200, 3, 0.6);
  else if (ev.type === 'dash') { for (let i = 0; i < 6; i += 1) particles.trail(ev.x, ev.y, '#22e6ff', 5); }
}

if (shotName) {
  const staged = stageShot(shotName, (ev) => shotFx(ev), shotSeed);
  screen = staged.screen;
  if (staged.screen === 'title') {
    // The title screen draws the demo world, so stage into that one, then
    // park the hero creature in a clear spot with full health.
    demoWorld = staged.world;
    demoWorld.player.x = 300;
    demoWorld.player.y = 560;
    demoWorld.player.vx = 0;
    demoWorld.player.vy = 0;
    demoWorld.player.hp = demoWorld.stats.maxHp;
  } else {
    world = staged.world;
  }
  if (staged.screen === 'upgrade') {
    upgradeChoices = staged.choices;
    upgradeHover = 1;
  }
  if (staged.screen === 'over') {
    best = staged.best;
    isNewBest = true;
    overTime = 1.2;
  }
  time = 2.0;
  fx.clear();
  // The pool is full of frozen staging particles by now; rebuild a clean
  // final frame: one fresh pulse ring, sparks on nearby enemies, and a
  // short motion trail behind the player.
  particles.clear();
  const hero = staged.screen === 'title' ? demoWorld.player : world.player;
  const heroStats = staged.screen === 'title' ? demoWorld.stats : world.stats;
  if (staged.screen === 'play' || staged.screen === 'upgrade') {
    particles.ring(hero.x, hero.y, '#22e6ff', heroStats.pulseRange, 0.45, 0.5);
    for (const e of world.enemies) {
      if (Math.hypot(e.x - hero.x, e.y - hero.y) < 420) {
        particles.burst(e.x, e.y, '#8b5cf6', 8, 140, 3, 0.6);
      }
    }
    const trailAngle = Math.hypot(hero.vx, hero.vy) > 40 ? Math.atan2(hero.vy, hero.vx) : hero.angle;
    for (let i = 0; i < 12; i += 1) {
      particles.trail(hero.x - Math.cos(trailAngle) * (20 + i * 9), hero.y - Math.sin(trailAngle) * (20 + i * 9), '#22e6ff', 4);
    }
  } else if (staged.screen === 'title') {
    particles.burst(hero.x, hero.y, '#22e6ff', 10, 120, 3, 0.6);
    particles.ring(hero.x, hero.y, '#22e6ff', 120, 0.5, 0.5);
  }
  render();
  window.__shotReady = true;
  // The staged scene is a real playable state, not a still image: start
  // the loop so the shot page stays interactive (a card can be clicked,
  // R restarts the game-over scene). The screenshot is taken right after
  // __shotReady, so the captured frame is still the staged one.
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}

// The game loop: fixed 1/60 s steps, up to 4 per animation frame.
let last = performance.now();
let acc = 0;
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 4) {
    update(STEP);
    acc -= STEP;
    steps += 1;
  }
  if (steps === 4) acc = 0;
  render();
  requestAnimationFrame(frame);
}

// Diagnostics for automated tests (read-only state, no cheats).
window.__abyssal = {
  screen: () => screen,
  state: () => ({
    screen,
    score: world.score,
    wave: world.wave,
    hp: world.player.hp,
    energy: Math.round(world.player.energy),
    enemies: world.enemies.length,
    orbs: world.orbs.length,
    combo: world.combo,
    kills: world.kills,
    over: world.over,
  }),
  start: () => startRun(),
};
