// ABYSSAL — particles and floating text.
// One fixed-size pool: dead particles are reused, nothing is allocated per
// frame during play, and the pool is capped so memory stays flat.

import { TAU } from './random.js';

const MAX_PARTICLES = 420;
const MAX_TEXTS = 24;

export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      this.list.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', drag: 0.9, glow: false, shrink: true });
    }
    for (let i = 0; i < MAX_TEXTS; i += 1) {
      this.texts.push({ alive: false, x: 0, y: 0, life: 0, max: 1, text: '', color: '#fff', size: 16 });
    }
  }

  _spawn() {
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      if (!this.list[i].alive) return this.list[i];
    }
    return null;
  }

  burst(x, y, color, count, speed, size = 3, life = 0.6, glow = true) {
    for (let n = 0; n < count; n += 1) {
      const p = this._spawn();
      if (!p) return;
      const a = Math.random() * TAU;
      const v = speed * (0.3 + Math.random() * 0.7);
      p.alive = true;
      p.ring = false;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * v;
      p.vy = Math.sin(a) * v;
      p.max = life * (0.6 + Math.random() * 0.7);
      p.life = p.max;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.color = color;
      p.drag = 0.88;
      p.glow = glow;
      p.shrink = true;
    }
  }

  trail(x, y, color, size = 4) {
    const p = this._spawn();
    if (!p) return;
    p.alive = true;
    p.ring = false;
    p.x = x + (Math.random() - 0.5) * 6;
    p.y = y + (Math.random() - 0.5) * 6;
    p.vx = (Math.random() - 0.5) * 20;
    p.vy = (Math.random() - 0.5) * 20;
    p.max = 0.5;
    p.life = 0.5;
    p.size = size;
    p.color = color;
    p.drag = 0.92;
    p.glow = true;
    p.shrink = true;
  }

  ring(x, y, color, maxRadius, life = 0.45, ageFrac = 0) {
    const p = this._spawn();
    if (!p) return;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.max = life;
    // Rings start at radius 0 and expand as they age; ageFrac pre-ages a
    // ring so a frozen frame (a screenshot) shows it mid-expansion.
    p.life = life * (1 - Math.min(0.9, Math.max(0, ageFrac)));
    p.size = maxRadius;
    p.color = color;
    p.drag = 1;
    p.glow = true;
    p.shrink = false;
    p.ring = true;
  }

  floatText(x, y, text, color = '#eaf6ff', size = 18) {
    for (let i = 0; i < MAX_TEXTS; i += 1) {
      const t = this.texts[i];
      if (t.alive) continue;
      t.alive = true;
      t.x = x;
      t.y = y;
      t.max = 0.9;
      t.life = 0.9;
      t.text = text;
      t.color = color;
      t.size = size;
      return;
    }
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const p = this.list[i];
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        p.ring = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
    }
    for (let i = 0; i < MAX_TEXTS; i += 1) {
      const t = this.texts[i];
      if (!t.alive) continue;
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) t.alive = false;
    }
  }

  /** Number of live particles, for diagnostics. */
  get aliveCount() {
    let n = 0;
    for (let i = 0; i < MAX_PARTICLES; i += 1) if (this.list[i].alive) n += 1;
    return n;
  }

  clear() {
    for (let i = 0; i < MAX_PARTICLES; i += 1) this.list[i].alive = false;
    for (let i = 0; i < MAX_TEXTS; i += 1) this.texts[i].alive = false;
  }
}
