// ABYSSAL — staged screenshot scenes.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so every screenshot is a
// frame a short game really produced — and the same seed always gives the
// same frame. The caller passes an `emit` callback that turns world events
// into particles and effects, exactly as live play does.

import { VIEW, PLAYER, SHOT_SEEDS } from './config.js';
import { World, EVENT_OVER } from './world.js';
import { UPGRADES, rollChoices } from './upgrades.js';
import { dist, angleTo, clamp } from './random.js';

const STEP = 1 / 60;
const HERO_SECONDS = 14;
const COMBAT_SECONDS = 60;
const OVER_LIMIT_SECONDS = 600;

/** Controls for one step, from the autopilot's view of the world. */
function autopilot(world, caution, centerPull = 0) {
  const p = world.player;
  const avoidR = 150 * caution;
  let mx = 0;
  let my = 0;
  let pulse = false;
  let dash = false;
  let aim = p.angle;

  // Nearest orb: the pull target.
  let orb = null;
  let orbD = Infinity;
  for (const o of world.orbs) {
    const d = dist(p.x, p.y, o.x, o.y);
    if (d < orbD) {
      orbD = d;
      orb = o;
    }
  }
  // Nearest enemy: the threat.
  let foe = null;
  let foeD = Infinity;
  for (const e of world.enemies) {
    const d = dist(p.x, p.y, e.x, e.y);
    if (d < foeD) {
      foeD = d;
      foe = e;
    }
  }
  if (orb) {
    const a = angleTo(p.x, p.y, orb.x, orb.y);
    mx += Math.cos(a);
    my += Math.sin(a);
  }
  if (foe && foeD < avoidR) {
    const a = angleTo(foe.x, foe.y, p.x, p.y);
    const w = (avoidR - foeD) / avoidR;
    mx += Math.cos(a) * w * 2.2;
    my += Math.sin(a) * w * 2.2;
    if (foeD < 80) dash = true;
  }
  // Optional pull toward the arena centre (used for the combat shot so the
  // action ends up in the middle of the frame, not in a corner).
  if (centerPull > 0) {
    const dC = dist(p.x, p.y, VIEW.width / 2, VIEW.height / 2);
    const aC = angleTo(p.x, p.y, VIEW.width / 2, VIEW.height / 2);
    const wC = centerPull * clamp(dC / 300, 0, 1);
    mx += Math.cos(aC) * wC;
    my += Math.sin(aC) * wC;
  }
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  // Aim at the nearest enemy; pulse when one is in range and roughly ahead.
  if (foe) {
    aim = angleTo(p.x, p.y, foe.x, foe.y);
    if (foeD < world.stats.pulseRange * 0.9) pulse = true;
  } else if (orb) {
    aim = angleTo(p.x, p.y, orb.x, orb.y);
  }
  return { moveX: mx, moveY: my, aim, pulse, dash };
}

function idleControls(world) {
  return { moveX: 0, moveY: 0, aim: world.player.angle, pulse: false, dash: false };
}

function runSteps(world, seconds, controlsFn, emit, finalBurst = false) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    let controls = controlsFn(world);
    if (finalBurst && i > steps - 30) {
      controls = { ...controls, pulse: true };
      if (i === steps - 48) controls = { ...controls, dash: true };
    }
    const mask = world.step(STEP, controls);
    if (emit) {
      for (const ev of world.events) emit(ev, world);
    }
    if (mask & EVENT_OVER) return true;
  }
  return false;
}

/**
 * Stage the named scene on a fresh world.
 * Returns { world, screen, choices, best } for the caller to draw.
 * screen is one of 'title' | 'play' | 'upgrade' | 'over'.
 */
export function stageShot(name, emit, seedOverride = 0) {
  const seed = seedOverride || SHOT_SEEDS[name] || 7;
  if (name === 'hero') {
    const world = new World(seed);
    runSteps(world, HERO_SECONDS, (w) => autopilot(w, 1.0), emit);
    return { world, screen: 'title', choices: null, best: 0 };
  }
  if (name === 'combat') {
    const world = new World(seed);
    // Play in 1 s chunks so a cleared wave rolls straight into the next
    // one — the frame ends dense with enemies instead of nearly empty.
    // Caution 0.6: the pilot fights instead of fleeing, so wave 1 clears.
    // Last 8 s the pilot stops pulsing and only dodges, so the next wave's
    // spawns pile up around the player for a crowded final frame.
    for (let s = 0; s < COMBAT_SECONDS; s += 1) {
      const lastStretch = s >= COMBAT_SECONDS - 8;
      runSteps(world, 1, (w) => {
        // In the last stretch the pilot also drifts to the arena centre so
        // the action ends up in the middle of the frame.
        const c = autopilot(w, 0.6, lastStretch ? 0.9 : 0);
        return lastStretch ? { ...c, pulse: false } : c;
      }, emit);
      if (world.over) return { world, screen: 'play', choices: null, best: 0 };
      if (world.waveState === 'cleared') {
        const choices = rollChoices(world.rng);
        world.applyUpgrade(choices[0].id, UPGRADES);
        world.nextWave();
      }
    }
    // Final burst: top the energy up so the pulse is guaranteed, dash once,
    // then freeze on the ring.
    world.player.energy = world.stats.maxEnergy;
    world.player.pulseCd = 0;
    world.player.dashCd = 0;
    const p = world.player;
    let nearest = null;
    let nearestD = Infinity;
    for (const e of world.enemies) {
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < nearestD) {
        nearestD = d;
        nearest = e;
      }
    }
    const aim = nearest ? angleTo(p.x, p.y, nearest.x, nearest.y) : p.angle;
    for (let i = 0; i < 30; i += 1) {
      const mask = world.step(STEP, { moveX: 0, moveY: 0, aim, pulse: true, dash: i === 0 });
      if (emit) for (const ev of world.events) emit(ev, world);
      if (mask & EVENT_OVER) break;
    }
    return { world, screen: 'play', choices: null, best: 0 };
  }
  if (name === 'upgrade') {
    // Cautious autopilot; retry more cautiously if the run dies.
    for (const caution of [1.0, 1.5, 2.2]) {
      const world = new World(seed);
      let cleared = false;
      for (let t = 0; t < 240 && !cleared; t += 1) {
        runSteps(world, 1, (w) => autopilot(w, caution), emit);
        if (world.waveState === 'cleared') cleared = true;
        if (world.over) break;
      }
      if (cleared) {
        const choices = rollChoices(world.rng);
        return { world, screen: 'upgrade', choices, best: 0 };
      }
    }
    // Fallback: show the upgrade screen on a fresh wave-2 world.
    const world = new World(seed);
    world.wave = 2;
    const choices = rollChoices(world.rng);
    return { world, screen: 'upgrade', choices, best: 0 };
  }
  // 'over': play well for a while to earn a real score, then stop moving —
  // the dark catches a still player.
  const world = new World(seed);
  runSteps(world, 18, (w) => autopilot(w, 1.0), emit);
  if (!world.over) runSteps(world, OVER_LIMIT_SECONDS, idleControls, emit);
  const score = world.score;
  return { world, screen: 'over', choices: null, best: score };
}

/** Clamp helper kept local so this module stays self-contained. */
export function shotNames() {
  return Object.keys(SHOT_SEEDS);
}
