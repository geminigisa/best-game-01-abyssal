// ABYSSAL — tuning, palette, and shared constants.
// Every number here is the game's own tuning; nothing is borrowed.

/** Logical playfield size. The canvas scales this to the window. */
export const VIEW = { width: 1280, height: 720 };

/** Palette: at most three dominant hues (cyan, violet, magenta) on deep blue. */
export const PALETTE = {
  deep: '#040b1e',
  waterTop: '#06233f',
  waterBottom: '#020617',
  cyan: '#22e6ff',
  cyanSoft: '#7df3ff',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  magenta: '#f472b6',
  amber: '#fbbf24',
  white: '#eaf6ff',
  danger: '#ff5470',
  foam: '#9fd8ff',
};

/** Player tuning. */
export const PLAYER = {
  radius: 16,
  accel: 1500,
  maxSpeed: 330,
  friction: 0.86,
  maxHp: 3,
  maxEnergy: 100,
  energyRegen: 6,
  pulseCost: 22,
  pulseRange: 270,
  pulseArc: 1.9,
  pulseDamage: 1,
  pulseCooldown: 0.55,
  dashSpeed: 900,
  dashTime: 0.16,
  dashCooldown: 1.15,
  invulnTime: 1.1,
  magnetRadius: 90,
};

/** Orb tuning. */
export const ORB = {
  radius: 8,
  value: 10,
  energy: 8,
  maxAlive: 26,
  spawnEvery: 0.9,
  bobAmp: 6,
};

/** Enemy kinds. Each has its own behaviour, shape, colour, and threat. */
export const ENEMIES = {
  gnasher: {
    name: 'Gnasher',
    radius: 20,
    hp: 2,
    speed: 118,
    score: 25,
    color: '#8b5cf6',
    glow: '#c4b5fd',
    contact: 1,
  },
  drifter: {
    name: 'Drifter',
    radius: 17,
    hp: 1,
    speed: 52,
    score: 15,
    color: '#3b82f6',
    glow: '#93c5fd',
    contact: 1,
  },
  lurker: {
    name: 'Lurker',
    radius: 15,
    hp: 1,
    speed: 70,
    lungeSpeed: 520,
    score: 35,
    color: '#f472b6',
    glow: '#fbcfe8',
    contact: 1,
  },
  leviathan: {
    name: 'Leviathan',
    radius: 34,
    hp: 6,
    speed: 62,
    score: 120,
    color: '#ff5470',
    glow: '#fda4af',
    contact: 2,
  },
};

/** Wave budget: how many spawn points each wave may spend. */
export function waveBudget(wave) {
  return 6 + wave * 4;
}

/** How fast waves spawn (seconds between spawns), tightening with the wave. */
export function spawnInterval(wave) {
  return Math.max(0.55, 1.7 - wave * 0.09);
}

/** Enemy speed multiplier as waves climb. */
export function speedScale(wave) {
  return 1 + Math.min(0.8, (wave - 1) * 0.06);
}

/** Combo window in seconds: collecting inside it raises the multiplier. */
export const COMBO_WINDOW = 3.5;
export const COMBO_MAX = 8;

/** Bonus score for clearing a wave, scaled by the wave number. */
export function waveClearBonus(wave) {
  return 100 + wave * 50;
}

/** First wave a Leviathan may appear in. */
export const LEVIATHAN_FROM_WAVE = 4;

/** Seconds the "WAVE CLEARED" banner shows before the upgrade screen. */
export const WAVE_BANNER_TIME = 1.6;

/** Screen shake magnitudes. */
export const SHAKE = { hit: 9, death: 6, pulse: 3, wave: 4 };

/** Shot staging: fixed seeds so every screenshot is reproducible. */
export const SHOT_SEEDS = { hero: 7, combat: 7, upgrade: 42, over: 99 };
