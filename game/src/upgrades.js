// ABYSSAL — upgrades: the pool offered between waves.
// Each upgrade is data: an id, a name, a one-line description, a glyph drawn
// by the renderer, and an apply() that mutates the player's stats.
// The world picks three distinct ones at random after every cleared wave.

import { shuffled } from './random.js';

export const UPGRADES = [
  {
    id: 'pulse-wide',
    name: 'Wide Pulse',
    desc: '+45% pulse range, +1 damage',
    glyph: 'ring',
    apply(stats) {
      stats.pulseRange *= 1.45;
      stats.pulseDamage += 1;
    },
  },
  {
    id: 'pulse-quick',
    name: 'Rapid Pulse',
    desc: 'Pulse recharges 35% faster',
    glyph: 'bolt',
    apply(stats) {
      stats.pulseCooldown *= 0.65;
    },
  },
  {
    id: 'swift-fins',
    name: 'Swift Fins',
    desc: '+18% move speed',
    glyph: 'fin',
    apply(stats) {
      stats.maxSpeed *= 1.18;
    },
  },
  {
    id: 'dash-flow',
    name: 'Dash Flow',
    desc: 'Dash recharges 35% faster',
    glyph: 'dash',
    apply(stats) {
      stats.dashCooldown *= 0.65;
    },
  },
  {
    id: 'vitality',
    name: 'Vitality',
    desc: '+1 max heart, heal 1 heart',
    glyph: 'heart',
    apply(stats) {
      stats.maxHp += 1;
      stats.hp = Math.min(stats.maxHp, stats.hp + 1);
    },
  },
  {
    id: 'energy-core',
    name: 'Energy Core',
    desc: '+30 max energy, faster regen',
    glyph: 'core',
    apply(stats) {
      stats.maxEnergy += 30;
      stats.energy = stats.maxEnergy;
      stats.energyRegen += 3;
    },
  },
  {
    id: 'magnet',
    name: 'Lure Light',
    desc: 'Orbs drift toward you from farther',
    glyph: 'magnet',
    apply(stats) {
      stats.magnetRadius *= 1.6;
    },
  },
  {
    id: 'echo-pulse',
    name: 'Echo Pulse',
    desc: 'Pulse fires a second ring behind it',
    glyph: 'echo',
    apply(stats) {
      stats.echoPulses += 1;
    },
  },
  {
    id: 'thorn-skin',
    name: 'Thorn Skin',
    desc: 'Attackers take 1 damage on contact',
    glyph: 'thorn',
    apply(stats) {
      stats.thorns += 1;
    },
  },
  {
    id: 'orb-greed',
    name: 'Greed of Light',
    desc: 'Orbs are worth +8 score each',
    glyph: 'orb',
    apply(stats) {
      stats.orbValue += 8;
    },
  },
  {
    id: 'adrenal-dash',
    name: 'Adrenal Dash',
    desc: 'Dashing through enemies hurts them',
    glyph: 'slash',
    apply(stats) {
      stats.dashDamage += 1;
    },
  },
  {
    id: 'second-wind',
    name: 'Second Wind',
    desc: 'Regain 1 heart at the start of each wave',
    glyph: 'wind',
    apply(stats) {
      stats.waveHeal += 1;
    },
  },
];

/** Roll `count` distinct upgrades with the given RNG. */
export function rollChoices(rng, count = 3) {
  return shuffled(rng, UPGRADES).slice(0, count);
}

/** Default player stats. Upgrades mutate a copy of this. */
export function defaultStats() {
  return {
    maxSpeed: 330,
    accel: 1500,
    maxHp: 3,
    hp: 3,
    maxEnergy: 100,
    energy: 100,
    energyRegen: 6,
    pulseCost: 22,
    pulseRange: 270,
    pulseArc: 1.9,
    pulseDamage: 1,
    pulseCooldown: 0.55,
    dashCooldown: 1.15,
    dashDamage: 0,
    magnetRadius: 90,
    echoPulses: 0,
    thorns: 0,
    orbValue: 10,
    waveHeal: 0,
  };
}
