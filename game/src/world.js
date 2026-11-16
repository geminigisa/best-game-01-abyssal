// ABYSSAL — world: entities, waves, combat, collision, score.
// Pure game logic: no drawing, no audio, no DOM. It emits events each step
// (pickup, pulse, hit, enemyDie, waveClear, gameOver) and the caller turns
// them into particles and sound. All randomness comes from a seeded RNG so
// staged screenshots and replays are deterministic.

import {
  VIEW, PLAYER, ORB, ENEMIES,
  waveBudget, spawnInterval, speedScale,
  COMBO_WINDOW, COMBO_MAX, waveClearBonus, LEVIATHAN_FROM_WAVE,
} from './config.js';
import { mulberry32, range, int, pick, clamp, dist, angleTo, angleDiff, chance } from './random.js';
import { defaultStats } from './upgrades.js';

export const EVENT_OVER = 1;

/** Spawn weights per wave: [drifter, gnasher, lurker, leviathan]. */
function spawnTable(wave) {
  if (wave <= 1) return [['drifter', 5], ['gnasher', 3]];
  if (wave === 2) return [['drifter', 4], ['gnasher', 4], ['lurker', 2]];
  if (wave === 3) return [['drifter', 3], ['gnasher', 5], ['lurker', 3]];
  if (wave >= LEVIATHAN_FROM_WAVE) return [['drifter', 2], ['gnasher', 5], ['lurker', 3], ['leviathan', 1]];
  return [['drifter', 3], ['gnasher', 5], ['lurker', 3]];
}

function weightedPick(rng, table) {
  let total = 0;
  for (const [, w] of table) total += w;
  let roll = rng() * total;
  for (const [kind, w] of table) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return table[0][0];
}

export class World {
  constructor(seed = 1) {
    this.rng = mulberry32(seed);
    this.events = [];
    this.reset(seed);
  }

  reset(seed = 1) {
    this.rng = mulberry32(seed);
    this.time = 0;
    this.wave = 1;
    this.score = 0;
    this.kills = 0;
    this.orbsCollected = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.stats = defaultStats();
    this.player = {
      x: VIEW.width / 2,
      y: VIEW.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      hp: this.stats.maxHp,
      energy: this.stats.maxEnergy,
      pulseCd: 0,
      dashCd: 0,
      dashTime: 0,
      invuln: 0,
      dashX: 0,
      dashY: 0,
    };
    this.orbs = [];
    this.enemies = [];
    this.spawnLeft = waveBudget(1);
    this.spawnTimer = 1.2;
    this.orbTimer = 0.4;
    this.waveState = 'fight';
    this.waveStateTime = 0;
    this.echoQueue = [];
    this.over = false;
    this.events = [];
    for (let i = 0; i < 6; i += 1) this._spawnOrb(true);
  }

  /** Score multiplier from the current combo (1.0 .. 2.75). */
  get multiplier() {
    return 1 + (this.combo - 1) * 0.25;
  }

  _score(value) {
    this.combo = Math.min(COMBO_MAX, this.combo + 1);
    this.comboTimer = COMBO_WINDOW;
    const gained = Math.round(value * this.multiplier);
    this.score += gained;
    return gained;
  }

  _spawnOrb(anywhere = false) {
    if (this.orbs.length >= ORB.maxAlive) return;
    const margin = 40;
    this.orbs.push({
      x: anywhere ? range(this.rng, margin, VIEW.width - margin) : this._edgeX(),
      y: anywhere ? range(this.rng, margin, VIEW.height - margin) : this._edgeY(),
      phase: this.rng() * Math.PI * 2,
      vx: range(this.rng, -12, 12),
      vy: range(this.rng, -12, 12),
    });
  }

  _edgeX() {
    return this.rng() < 0.5 ? range(this.rng, 30, 90) : range(this.rng, VIEW.width - 90, VIEW.width - 30);
  }

  _edgeY() {
    return this.rng() < 0.5 ? range(this.rng, 30, 90) : range(this.rng, VIEW.height - 90, VIEW.height - 30);
  }

  _spawnEnemy() {
    const kind = weightedPick(this.rng, spawnTable(this.wave));
    const def = ENEMIES[kind];
    const scale = speedScale(this.wave);
    const elite = this.wave >= 5 && chance(this.rng, 0.12);
    const side = int(this.rng, 0, 3);
    let x;
    let y;
    if (side === 0) { x = range(this.rng, 0, VIEW.width); y = -30; }
    else if (side === 1) { x = VIEW.width + 30; y = range(this.rng, 0, VIEW.height); }
    else if (side === 2) { x = range(this.rng, 0, VIEW.width); y = VIEW.height + 30; }
    else { x = -30; y = range(this.rng, 0, VIEW.height); }
    this.enemies.push({
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: def.hp + (elite ? 2 : 0),
      maxHp: def.hp + (elite ? 2 : 0),
      radius: def.radius * (elite ? 1.25 : 1),
      speed: def.speed * scale * (elite ? 1.15 : 1),
      score: def.score * (elite ? 2 : 1),
      contact: def.contact,
      elite,
      state: 'chase',
      stateTime: 0,
      phase: this.rng() * Math.PI * 2,
      flash: 0,
      lungeX: 0,
      lungeY: 0,
    });
  }

  /** Fire a pulse toward `aim`. Shared by the player and echo rings. */
  _firePulse(aim, rangeMul = 1) {
    const s = this.stats;
    const reach = s.pulseRange * rangeMul;
    const halfArc = s.pulseArc / 2;
    let hits = 0;
    for (const e of this.enemies) {
      const d = dist(this.player.x, this.player.y, e.x, e.y);
      if (d > reach + e.radius) continue;
      const a = angleTo(this.player.x, this.player.y, e.x, e.y);
      if (Math.abs(angleDiff(aim, a)) > halfArc + Math.atan2(e.radius, Math.max(1, d))) continue;
      this._damageEnemy(e, s.pulseDamage, aim);
      const kb = 420;
      const ka = angleTo(this.player.x, this.player.y, e.x, e.y);
      e.vx += Math.cos(ka) * kb;
      e.vy += Math.sin(ka) * kb;
      hits += 1;
    }
    return hits;
  }

  _damageEnemy(e, dmg, fromAngle = null) {
    e.hp -= dmg;
    e.flash = 0.12;
    if (e.hp <= 0) {
      const gained = this._score(e.score);
      this.kills += 1;
      this.events.push({ type: 'enemyDie', x: e.x, y: e.y, kind: e.kind, elite: e.elite, gained });
      e.dead = true;
    }
  }

  _hurtPlayer(dmg, fromX, fromY) {
    const p = this.player;
    if (p.invuln > 0 || p.dashTime > 0 || this.over) return;
    p.hp -= dmg;
    p.invuln = PLAYER.invulnTime;
    const ka = angleTo(fromX, fromY, p.x, p.y);
    p.vx += Math.cos(ka) * 380;
    p.vy += Math.sin(ka) * 380;
    this.combo = 0;
    this.comboTimer = 0;
    this.events.push({ type: 'hit', x: p.x, y: p.y, hp: p.hp });
    if (p.hp <= 0) {
      this.over = true;
      this.events.push({ type: 'gameOver', score: this.score, wave: this.wave, kills: this.kills });
    }
  }

  /** Apply one upgrade by id (called by the upgrade screen). */
  applyUpgrade(id, upgrades) {
    const up = upgrades.find((u) => u.id === id);
    if (!up) return false;
    up.apply(this.stats);
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp);
    this.events.push({ type: 'upgrade', id });
    return true;
  }

  /** Begin the next wave after an upgrade was chosen. */
  nextWave() {
    this.wave += 1;
    if (this.stats.waveHeal > 0) {
      this.player.hp = Math.min(this.stats.maxHp, this.player.hp + this.stats.waveHeal);
    }
    this.spawnLeft = waveBudget(this.wave);
    this.spawnTimer = 0.8;
    this.waveState = 'fight';
    this.waveStateTime = 0;
    this.events.push({ type: 'waveStart', wave: this.wave });
  }

  /**
   * Advance the world by dt seconds.
   * controls: { moveX, moveY, aim, pulse, dash }
   * Returns a bitmask (EVENT_OVER when the run ended this step).
   */
  step(dt, controls) {
    this.events = [];
    if (this.over) return EVENT_OVER;
    this.time += dt;
    const p = this.player;
    const s = this.stats;

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    p.energy = Math.min(s.maxEnergy, p.energy + s.energyRegen * dt);
    if (p.pulseCd > 0) p.pulseCd -= dt;
    if (p.dashCd > 0) p.dashCd -= dt;
    if (p.invuln > 0) p.invuln -= dt;

    // Movement: acceleration toward input, friction when idle.
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashX * PLAYER.dashSpeed;
      p.vy = p.dashY * PLAYER.dashSpeed;
    } else {
      p.vx += controls.moveX * s.accel * dt;
      p.vy += controls.moveY * s.accel * dt;
      const f = Math.pow(PLAYER.friction, dt * 60);
      p.vx *= f;
      p.vy *= f;
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > s.maxSpeed) {
        p.vx = (p.vx / speed) * s.maxSpeed;
        p.vy = (p.vy / speed) * s.maxSpeed;
      }
    }
    p.x = clamp(p.x + p.vx * dt, PLAYER.radius, VIEW.width - PLAYER.radius);
    p.y = clamp(p.y + p.vy * dt, PLAYER.radius, VIEW.height - PLAYER.radius);
    p.angle = controls.aim;

    // Dash.
    if (controls.dash && p.dashCd <= 0 && p.dashTime <= 0) {
      let dx = controls.moveX;
      let dy = controls.moveY;
      if (dx === 0 && dy === 0) {
        dx = Math.cos(p.angle);
        dy = Math.sin(p.angle);
      }
      const len = Math.hypot(dx, dy) || 1;
      p.dashX = dx / len;
      p.dashY = dy / len;
      p.dashTime = PLAYER.dashTime;
      p.dashCd = s.dashCooldown;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.1);
      this.events.push({ type: 'dash', x: p.x, y: p.y });
    }

    // Pulse.
    if (controls.pulse && p.pulseCd <= 0 && p.energy >= s.pulseCost) {
      p.energy -= s.pulseCost;
      p.pulseCd = s.pulseCooldown;
      const hits = this._firePulse(p.angle);
      this.events.push({ type: 'pulse', x: p.x, y: p.y, angle: p.angle, range: s.pulseRange, hits });
      for (let i = 0; i < s.echoPulses; i += 1) {
        this.echoQueue.push({ t: 0.18 * (i + 1), angle: p.angle });
      }
    }
    for (let i = this.echoQueue.length - 1; i >= 0; i -= 1) {
      const echo = this.echoQueue[i];
      echo.t -= dt;
      if (echo.t <= 0) {
        this.echoQueue.splice(i, 1);
        this._firePulse(echo.angle, 0.8);
        this.events.push({ type: 'echo', x: p.x, y: p.y, angle: echo.angle, range: s.pulseRange * 0.8 });
      }
    }

    // Orbs: drift, magnet, collect.
    this.orbTimer -= dt;
    if (this.orbTimer <= 0) {
      this.orbTimer = ORB.spawnEvery;
      this._spawnOrb();
    }
    for (let i = this.orbs.length - 1; i >= 0; i -= 1) {
      const o = this.orbs[i];
      o.phase += dt;
      const d = dist(p.x, p.y, o.x, o.y);
      if (d < s.magnetRadius) {
        const a = angleTo(o.x, o.y, p.x, p.y);
        const pull = 260 * (1 - d / s.magnetRadius) + 60;
        o.vx += Math.cos(a) * pull * dt;
        o.vy += Math.sin(a) * pull * dt;
      }
      o.x += o.vx * dt;
      o.y += o.vy * dt + Math.sin(o.phase * 2) * 6 * dt;
      o.vx *= 0.98;
      o.vy *= 0.98;
      if (d < PLAYER.radius + ORB.radius + 6) {
        this.orbs.splice(i, 1);
        const gained = this._score(s.orbValue);
        this.orbsCollected += 1;
        p.energy = Math.min(s.maxEnergy, p.energy + ORB.energy);
        this.events.push({ type: 'pickup', x: o.x, y: o.y, gained, combo: this.combo });
      }
    }

    // Spawning.
    if (this.waveState === 'fight') {
      if (this.spawnLeft > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnTimer = spawnInterval(this.wave);
          this._spawnEnemy();
          this.spawnLeft -= 1;
        }
      } else if (this.enemies.length === 0) {
        const bonus = waveClearBonus(this.wave);
        this.score += bonus;
        this.waveState = 'cleared';
        this.waveStateTime = 0;
        this.events.push({ type: 'waveClear', wave: this.wave, bonus });
      }
    }

    // Enemies: behaviour, movement, contact.
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      if (e.dead) {
        this.enemies.splice(i, 1);
        continue;
      }
      if (e.flash > 0) e.flash -= dt;
      e.stateTime += dt;
      const def = ENEMIES[e.kind];
      const dPlayer = dist(e.x, e.y, p.x, p.y);
      const aPlayer = angleTo(e.x, e.y, p.x, p.y);
      if (e.kind === 'gnasher' || e.kind === 'leviathan') {
        const wobble = Math.sin(this.time * 2 + e.phase) * 0.35;
        const a = aPlayer + wobble;
        e.vx += Math.cos(a) * e.speed * 2.4 * dt;
        e.vy += Math.sin(a) * e.speed * 2.4 * dt;
        e.angle = aPlayer;
      } else if (e.kind === 'drifter') {
        e.vx += Math.cos(e.angle) * e.speed * 0.9 * dt;
        e.vy += Math.sin(e.angle) * e.speed * 0.9 * dt;
        e.angle += angleDiff(e.angle, aPlayer) * 0.35 * dt + Math.sin(this.time * 1.4 + e.phase) * 0.6 * dt;
      } else if (e.kind === 'lurker') {
        if (e.state === 'chase') {
          e.vx += Math.cos(aPlayer) * e.speed * 2.2 * dt;
          e.vy += Math.sin(aPlayer) * e.speed * 2.2 * dt;
          e.angle = aPlayer;
          if (dPlayer < 240 && e.stateTime > 0.8) {
            e.state = 'telegraph';
            e.stateTime = 0;
          }
        } else if (e.state === 'telegraph') {
          e.vx *= 0.9;
          e.vy *= 0.9;
          if (e.stateTime > 0.45) {
            e.state = 'lunge';
            e.stateTime = 0;
            e.lungeX = p.x;
            e.lungeY = p.y;
            e.angle = angleTo(e.x, e.y, e.lungeX, e.lungeY);
          }
        } else if (e.state === 'lunge') {
          e.vx = Math.cos(e.angle) * def.lungeSpeed;
          e.vy = Math.sin(e.angle) * def.lungeSpeed;
          if (e.stateTime > 0.32) {
            e.state = 'recover';
            e.stateTime = 0;
          }
        } else {
          e.vx *= 0.92;
          e.vy *= 0.92;
          if (e.stateTime > 0.9) {
            e.state = 'chase';
            e.stateTime = 0;
          }
        }
      }
      const drag = Math.pow(0.9, dt * 60);
      e.vx *= drag;
      e.vy *= drag;
      const esp = Math.hypot(e.vx, e.vy);
      const maxSp = e.kind === 'lurker' && e.state === 'lunge' ? def.lungeSpeed : e.speed * 1.6;
      if (esp > maxSp) {
        e.vx = (e.vx / esp) * maxSp;
        e.vy = (e.vy / esp) * maxSp;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.radius) { e.x = e.radius; e.vx = Math.abs(e.vx) * 0.5; }
      if (e.x > VIEW.width - e.radius) { e.x = VIEW.width - e.radius; e.vx = -Math.abs(e.vx) * 0.5; }
      if (e.y < e.radius) { e.y = e.radius; e.vy = Math.abs(e.vy) * 0.5; }
      if (e.y > VIEW.height - e.radius) { e.y = VIEW.height - e.radius; e.vy = -Math.abs(e.vy) * 0.5; }

      // Contact with the player.
      if (dPlayer < e.radius + PLAYER.radius - 2) {
        if (p.dashTime > 0 && s.dashDamage > 0) {
          this._damageEnemy(e, s.dashDamage, p.angle);
        } else {
          this._hurtPlayer(e.contact, e.x, e.y);
          if (s.thorns > 0) this._damageEnemy(e, s.thorns, aPlayer);
          const ka = angleTo(p.x, p.y, e.x, e.y);
          e.vx += Math.cos(ka) * 260;
          e.vy += Math.sin(ka) * 260;
        }
      }
    }
    // Dead enemies were already spliced out inside the loop above.

    if (this.waveState === 'cleared') {
      this.waveStateTime += dt;
    }

    return this.over ? EVENT_OVER : 0;
  }
}
