// ABYSSAL — rendering: background, entities, HUD, and every screen.
// Canvas 2D only, no assets. Palette is limited to cyan / violet / magenta on
// deep blue so the frame reads at thumbnail size. All text uses system fonts
// (nothing is fetched over the network).

import { VIEW, PALETTE, ENEMIES, PLAYER, ORB } from './config.js';
import { mulberry32, range, TAU, clamp } from './random.js';

const TITLE_FONT = (size, weight = 700) => `${weight} ${size}px Georgia, 'Times New Roman', serif`;
const UI_FONT = (size, weight = 600) => `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = VIEW.width;
    this.canvas.height = VIEW.height;
    const rng = mulberry32(1234);
    this.rocks = [];
    for (let i = 0; i < 9; i += 1) {
      this.rocks.push({ x: range(rng, -60, VIEW.width + 60), y: VIEW.height - range(rng, 0, 70), w: range(rng, 90, 260), h: range(rng, 40, 130), shade: range(rng, 0.5, 1) });
    }
    this.kelp = [];
    for (let i = 0; i < 14; i += 1) {
      this.kelp.push({ x: range(rng, 0, VIEW.width), base: VIEW.height + 10, h: range(rng, 90, 260), sway: range(rng, 0.4, 1.1), phase: range(rng, 0, TAU), hue: pick(rng, ['#0b3b52', '#123a5c', '#1a2b5e']) });
    }
    this.bokeh = [];
    for (let i = 0; i < 42; i += 1) {
      this.bokeh.push({ x: range(rng, 0, VIEW.width), y: range(rng, 0, VIEW.height), r: range(rng, 2, 9), speed: range(rng, 4, 18), alpha: range(rng, 0.05, 0.22), color: pick(rng, [PALETTE.cyan, PALETTE.violet, PALETTE.magenta, '#9fd8ff']) });
    }
    this.rays = [];
    for (let i = 0; i < 5; i += 1) {
      this.rays.push({ x: range(rng, 80, VIEW.width - 80), w: range(rng, 60, 150), phase: range(rng, 0, TAU), speed: range(rng, 0.05, 0.14) });
    }
    function pick(r, list) { return list[Math.floor(r() * list.length)]; }
  }

  clear() {
    this.ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  }

  drawBackground(time, px = 0, py = 0) {
    const { ctx } = this;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    g.addColorStop(0, PALETTE.waterTop);
    g.addColorStop(0.55, '#04122e');
    g.addColorStop(1, PALETTE.waterBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    // God rays from the surface.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const ray of this.rays) {
      const sway = Math.sin(time * ray.speed + ray.phase) * 40;
      const x = ray.x + sway;
      const grad = ctx.createLinearGradient(x, 0, x + ray.w * 0.4, VIEW.height);
      grad.addColorStop(0, 'rgba(125,243,255,0.10)');
      grad.addColorStop(1, 'rgba(125,243,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - ray.w / 2, 0);
      ctx.lineTo(x + ray.w / 2, 0);
      ctx.lineTo(x + ray.w, VIEW.height);
      ctx.lineTo(x - ray.w * 0.4, VIEW.height);
      ctx.closePath();
      ctx.fill();
    }
    // Rising bokeh motes.
    for (const b of this.bokeh) {
      const y = ((b.y - time * b.speed) % (VIEW.height + 40) + VIEW.height + 40) % (VIEW.height + 40) - 20;
      ctx.globalAlpha = b.alpha * (0.7 + 0.3 * Math.sin(time * 0.8 + b.x));
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(time * 0.3 + b.y) * 8, y, b.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Far rock silhouettes (parallax 0.2) and kelp (parallax 0.5).
    ctx.save();
    ctx.translate(-px * 0.2, -py * 0.1);
    for (const rock of this.rocks) {
      ctx.fillStyle = `rgba(6,18,40,${0.55 * rock.shade})`;
      ctx.beginPath();
      ctx.moveTo(rock.x - rock.w / 2, VIEW.height + 20);
      ctx.lineTo(rock.x - rock.w * 0.2, rock.y - rock.h);
      ctx.lineTo(rock.x + rock.w * 0.25, rock.y - rock.h * 0.7);
      ctx.lineTo(rock.x + rock.w / 2, VIEW.height + 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(-px * 0.5, 0);
    for (const k of this.kelp) {
      const sway = Math.sin(time * k.sway + k.phase) * 22;
      ctx.strokeStyle = k.hue;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(k.x, k.base);
      ctx.quadraticCurveTo(k.x + sway * 0.4, k.base - k.h * 0.55, k.x + sway, k.base - k.h);
      ctx.stroke();
      ctx.fillStyle = 'rgba(34,230,255,0.5)';
      ctx.beginPath();
      ctx.arc(k.x + sway, k.base - k.h, 3.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Vignette.
    const v = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.35, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(1,4,14,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  drawOrb(ctx, o, time) {
    const bob = Math.sin(o.phase * 2) * ORB.bobAmp * 0.15;
    glowCircle(ctx, o.x, o.y + bob, 26, 'rgba(34,230,255,0.55)', 0.8);
    ctx.fillStyle = PALETTE.cyanSoft;
    ctx.beginPath();
    ctx.arc(o.x, o.y + bob, ORB.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(o.x - 2.5, o.y + bob - 2.5, 3, 0, TAU);
    ctx.fill();
  }

  drawEnemy(ctx, e, time) {
    const def = ENEMIES[e.kind];
    ctx.save();
    ctx.translate(e.x, e.y);
    const flash = e.flash > 0;
    const telegraph = e.kind === 'lurker' && e.state === 'telegraph';
    const pulse = telegraph ? 0.6 + 0.4 * Math.sin(time * 26) : 1;
    glowCircle(ctx, 0, 0, e.radius * 2.6, def.color, (e.elite ? 0.5 : 0.34) * pulse);
    ctx.rotate(e.angle);
    ctx.fillStyle = flash ? '#ffffff' : def.color;
    ctx.strokeStyle = def.glow;
    ctx.lineWidth = 2;
    if (e.kind === 'gnasher') {
      ctx.beginPath();
      ctx.moveTo(e.radius, 0);
      ctx.quadraticCurveTo(e.radius * 0.4, -e.radius * 0.9, -e.radius * 0.7, -e.radius * 0.55);
      ctx.quadraticCurveTo(-e.radius * 1.1, 0, -e.radius * 0.7, e.radius * 0.55);
      ctx.quadraticCurveTo(e.radius * 0.4, e.radius * 0.9, e.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(e.radius * 0.55 + i * 3, -6 + i * 6);
        ctx.lineTo(e.radius * 0.3 + i * 3, -2 + i * 6);
        ctx.lineTo(e.radius * 0.55 + i * 3, 2 + i * 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.radius * 0.25, -e.radius * 0.32, 3.4, 0, TAU);
      ctx.arc(e.radius * 0.25, e.radius * 0.32, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(e.radius * 0.25, -e.radius * 0.32, 1.6, 0, TAU);
      ctx.arc(e.radius * 0.25, e.radius * 0.32, 1.6, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'drifter') {
      const spikes = 8;
      ctx.beginPath();
      for (let i = 0; i <= spikes * 2; i += 1) {
        const a = (i / (spikes * 2)) * TAU;
        const r = i % 2 === 0 ? e.radius : e.radius * 0.62;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.glow;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.34, 0, TAU);
      ctx.fill();
    } else if (e.kind === 'lurker') {
      ctx.beginPath();
      ctx.moveTo(e.radius * 1.3, 0);
      ctx.quadraticCurveTo(0, -e.radius * 0.85, -e.radius * 0.9, -e.radius * 0.3);
      ctx.quadraticCurveTo(-e.radius * 0.5, 0, -e.radius * 0.9, e.radius * 0.3);
      ctx.quadraticCurveTo(0, e.radius * 0.85, e.radius * 1.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.radius * 0.45, 0, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(e.radius * 0.45, 0, 2, 0, TAU);
      ctx.fill();
    } else {
      // Leviathan: big jawed silhouette with fins.
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * 1.35, e.radius * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a0512';
      ctx.beginPath();
      ctx.ellipse(e.radius * 0.55, 0, e.radius * 0.5, e.radius * 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i += 1) {
        const x = e.radius * 0.15 + i * e.radius * 0.18;
        ctx.beginPath();
        ctx.moveTo(x, -e.radius * 0.3);
        ctx.lineTo(x + e.radius * 0.09, -e.radius * 0.08);
        ctx.lineTo(x, e.radius * 0.12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.radius * 0.5, -e.radius * 0.42, 5, 0, TAU);
      ctx.arc(e.radius * 0.5, e.radius * 0.42, 5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(e.radius * 0.5, -e.radius * 0.42, 2.4, 0, TAU);
      ctx.arc(e.radius * 0.5, e.radius * 0.42, 2.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // Elite crown + hp bar for tough enemies.
    if (e.elite) {
      ctx.fillStyle = PALETTE.amber;
      ctx.font = UI_FONT(13);
      ctx.textAlign = 'center';
      ctx.fillText('ELITE', e.x, e.y - e.radius - 14);
    }
    if (e.maxHp > 1 && e.hp < e.maxHp) {
      const w = e.radius * 1.6;
      ctx.fillStyle = 'rgba(2,6,23,0.7)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w, 4);
      ctx.fillStyle = PALETTE.danger;
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w * (e.hp / e.maxHp), 4);
    }
  }

  drawPlayer(ctx, p, stats, time) {
    const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Trail tentacles.
    ctx.strokeStyle = 'rgba(34,230,255,0.55)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i += 1) {
      const base = p.angle + Math.PI + i * 0.28;
      const sway = Math.sin(time * 6 + i * 1.3) * 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(base) * 10, Math.sin(base) * 10);
      ctx.quadraticCurveTo(
        Math.cos(base) * 26 + Math.cos(base + Math.PI / 2) * sway * 0.4,
        Math.sin(base) * 26 + Math.sin(base + Math.PI / 2) * sway * 0.4,
        Math.cos(base) * 40 + Math.cos(base + Math.PI / 2) * sway,
        Math.sin(base) * 40 + Math.sin(base + Math.PI / 2) * sway,
      );
      ctx.stroke();
    }
    glowCircle(ctx, 0, 0, 64, 'rgba(34,230,255,0.5)', blink ? 0.35 : 0.85);
    ctx.fillStyle = blink ? '#9fd8ff' : PALETTE.cyan;
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#06233f';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 5, Math.sin(p.angle) * 5, 4.5, 0, TAU);
    ctx.fill();
    // HP ring around the player (readable at a glance, no corner bar).
    const ringR = PLAYER.radius + 10;
    ctx.lineWidth = 4;
    for (let i = 0; i < stats.maxHp; i += 1) {
      const a0 = -Math.PI / 2 + i * (TAU / stats.maxHp) + 0.06;
      const a1 = -Math.PI / 2 + (i + 1) * (TAU / stats.maxHp) - 0.06;
      ctx.strokeStyle = i < p.hp ? PALETTE.magenta : 'rgba(244,114,182,0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, ringR, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawParticles(ctx, particles) {
    ctx.save();
    for (const p of particles.list) {
      if (!p.alive) continue;
      const t = p.life / p.max;
      if (p.ring) {
        const r = p.size * (1 - t);
        ctx.globalAlpha = t * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * t + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
      } else {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        const s = p.shrink ? p.size * t : p.size;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, s), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    for (const t of particles.texts) {
      if (!t.alive) continue;
      ctx.globalAlpha = t.life / t.max;
      ctx.font = UI_FONT(t.size, 700);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  drawHUD(ctx, world, time) {
    const s = world.stats;
    const p = world.player;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = UI_FONT(15);
    ctx.fillStyle = 'rgba(234,246,255,0.75)';
    ctx.fillText(`WAVE ${world.wave}`, 28, 40);
    ctx.font = TITLE_FONT(34);
    ctx.fillStyle = PALETTE.white;
    ctx.textAlign = 'center';
    ctx.fillText(String(world.score).padStart(6, '0'), VIEW.width / 2, 44);
    ctx.font = UI_FONT(14);
    ctx.fillStyle = world.combo > 1 ? PALETTE.amber : 'rgba(234,246,255,0.55)';
    ctx.fillText(world.combo > 1 ? `COMBO x${world.multiplier.toFixed(2)}` : 'ABYSSAL', VIEW.width / 2, 66);
    // Energy bar, bottom centre.
    const bw = 260;
    const bx = VIEW.width / 2 - bw / 2;
    const by = VIEW.height - 34;
    ctx.fillStyle = 'rgba(2,6,23,0.65)';
    roundRect(ctx, bx - 2, by - 2, bw + 4, 16, 8);
    ctx.fill();
    const eFrac = clamp(p.energy / s.maxEnergy, 0, 1);
    const eg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    eg.addColorStop(0, PALETTE.cyan);
    eg.addColorStop(1, PALETTE.violet);
    ctx.fillStyle = eg;
    if (eFrac > 0.01) {
      roundRect(ctx, bx, by, bw * eFrac, 12, 6);
      ctx.fill();
    }
    ctx.font = UI_FONT(12);
    ctx.fillStyle = 'rgba(234,246,255,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('ENERGY  •  CLICK: PULSE', VIEW.width / 2, by + 30);
    // Dash pip, bottom right.
    const dFrac = clamp(1 - p.dashCd / s.dashCooldown, 0, 1);
    ctx.textAlign = 'right';
    ctx.font = UI_FONT(13);
    ctx.fillStyle = dFrac >= 1 ? PALETTE.cyan : 'rgba(234,246,255,0.5)';
    ctx.fillText(dFrac >= 1 ? 'DASH READY  [SPACE]' : 'DASH…', VIEW.width - 28, VIEW.height - 24);
    // Hearts, top left under the wave label.
    ctx.textAlign = 'left';
    for (let i = 0; i < s.maxHp; i += 1) {
      ctx.fillStyle = i < p.hp ? PALETTE.magenta : 'rgba(244,114,182,0.25)';
      ctx.beginPath();
      ctx.arc(34 + i * 26, 62, 8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBanner(ctx, banner) {
    ctx.save();
    ctx.globalAlpha = banner.alpha;
    ctx.textAlign = 'center';
    ctx.font = TITLE_FONT(54);
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = 'rgba(34,230,255,0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText(banner.text, VIEW.width / 2, VIEW.height / 2 - 70);
    ctx.shadowBlur = 0;
    ctx.font = UI_FONT(20);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.fillText(banner.sub, VIEW.width / 2, VIEW.height / 2 - 34);
    ctx.restore();
  }

  drawTitle(ctx, time, best, runs) {
    ctx.save();
    const breathe = 0.75 + 0.25 * Math.sin(time * 1.6);
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.9;
    ctx.font = UI_FONT(20, 700);
    ctx.fillStyle = PALETTE.cyanSoft;
    ctx.fillText('A B Y S S A L', VIEW.width / 2, 178);
    ctx.globalAlpha = 1;
    ctx.font = TITLE_FONT(64);
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = `rgba(34,230,255,${0.55 * breathe})`;
    ctx.shadowBlur = 34;
    ctx.fillText('Echoes of the Last Light', VIEW.width / 2, 248);
    ctx.shadowBlur = 0;
    ctx.font = UI_FONT(19);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.fillText('The last light in the deep. Gather energy. Outlive the dark.', VIEW.width / 2, 292);
    this._button(ctx, VIEW.width / 2 - 130, 340, 260, 58, '▶  PLAY', true, time);
    this._button(ctx, VIEW.width / 2 - 130, 412, 126, 46, 'HOW TO PLAY', false, time);
    this._button(ctx, VIEW.width / 2 + 4, 412, 126, 46, 'SETTINGS', false, time);
    ctx.font = UI_FONT(15);
    ctx.fillStyle = 'rgba(234,246,255,0.6)';
    ctx.fillText(best > 0 ? `BEST  ${best.toLocaleString()}   •   ${runs} RUN${runs === 1 ? '' : 'S'}` : 'WASD move  •  Mouse aim  •  Click pulse  •  Space dash  •  ESC pause', VIEW.width / 2, 500);
    ctx.fillStyle = 'rgba(234,246,255,0.4)';
    ctx.font = UI_FONT(13);
    ctx.fillText('An original game — art, sound and code made for this bounty.', VIEW.width / 2, VIEW.height - 26);
    ctx.restore();
    return {
      play: { x: VIEW.width / 2 - 130, y: 340, w: 260, h: 58 },
      howto: { x: VIEW.width / 2 - 130, y: 412, w: 126, h: 46 },
      settings: { x: VIEW.width / 2 + 4, y: 412, w: 126, h: 46 },
    };
  }

  _button(ctx, x, y, w, h, label, primary, time) {
    ctx.save();
    const hover = false;
    if (primary) {
      const g = ctx.createLinearGradient(x, y, x + w, y);
      g.addColorStop(0, '#0ea5c4');
      g.addColorStop(1, '#7c3aed');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(34,230,255,0.6)';
      ctx.shadowBlur = 18;
    } else {
      ctx.fillStyle = 'rgba(6,35,63,0.85)';
      ctx.strokeStyle = 'rgba(125,243,255,0.5)';
      ctx.lineWidth = 1.5;
    }
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    if (!primary) ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = UI_FONT(primary ? 21 : 15, 700);
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + (primary ? 7 : 5));
    ctx.restore();
    return { x, y, w, h, label };
  }

  drawHowTo(ctx) {
    this._panel(ctx, 'HOW TO PLAY');
    const lines = [
      ['MOVE', 'WASD or Arrow Keys — glide through the deep'],
      ['AIM', 'Mouse — your light faces the cursor'],
      ['PULSE', 'Left Click — a blast of light that hurts and shoves enemies (costs energy)'],
      ['DASH', 'Space — a fast burst, briefly untouchable'],
      ['SURVIVE', 'Collect glowing orbs for score and energy'],
      ['WAVES', 'Clear a wave, pick 1 of 3 upgrades, face a harder wave'],
      ['PAUSE', 'ESC pauses  •  M mutes  •  R restarts when the run ends'],
    ];
    ctx.save();
    ctx.textAlign = 'left';
    let y = 250;
    for (const [k, v] of lines) {
      ctx.font = UI_FONT(17, 700);
      ctx.fillStyle = PALETTE.cyan;
      ctx.fillText(k, 330, y);
      ctx.font = UI_FONT(17);
      ctx.fillStyle = PALETTE.white;
      ctx.fillText(v, 460, y);
      y += 42;
    }
    ctx.textAlign = 'center';
    ctx.font = UI_FONT(15);
    ctx.fillStyle = 'rgba(234,246,255,0.6)';
    ctx.fillText('Click anywhere or press ESC to go back', VIEW.width / 2, 590);
    ctx.restore();
  }

  drawSettings(ctx, settings) {
    this._panel(ctx, 'SETTINGS');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = UI_FONT(19);
    ctx.fillStyle = PALETTE.white;
    ctx.fillText(`Sound: ${settings.muted ? 'MUTED (M to unmute)' : 'ON'}`, VIEW.width / 2, 300);
    ctx.fillText(`Volume: ${Math.round(settings.volume * 100)}%  ( [ / ] to change )`, VIEW.width / 2, 344);
    ctx.fillText(`Screen shake: ${settings.shake ? 'ON' : 'OFF'}  ( S to toggle )`, VIEW.width / 2, 388);
    ctx.font = UI_FONT(15);
    ctx.fillStyle = 'rgba(234,246,255,0.6)';
    ctx.fillText('Click anywhere or press ESC to go back', VIEW.width / 2, 590);
    ctx.restore();
  }

  drawPause(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.font = TITLE_FONT(52);
    ctx.fillStyle = PALETTE.white;
    ctx.fillText('Paused', VIEW.width / 2, 300);
    ctx.font = UI_FONT(18);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.fillText('ESC to resume  •  R to restart  •  Q for main menu', VIEW.width / 2, 352);
    ctx.restore();
  }

  drawUpgrade(ctx, choices, hoverIndex) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.66)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.font = TITLE_FONT(44);
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = 'rgba(34,230,255,0.7)';
    ctx.shadowBlur = 20;
    ctx.fillText('Choose an upgrade', VIEW.width / 2, 150);
    ctx.shadowBlur = 0;
    ctx.font = UI_FONT(17);
    ctx.fillStyle = 'rgba(234,246,255,0.8)';
    ctx.fillText('Click a card, or press 1 / 2 / 3', VIEW.width / 2, 188);
    const cw = 300;
    const ch = 300;
    const gap = 28;
    const total = cw * 3 + gap * 2;
    const x0 = VIEW.width / 2 - total / 2;
    const y0 = 230;
    choices.forEach((up, i) => {
      const x = x0 + i * (cw + gap);
      const hover = i === hoverIndex;
      ctx.fillStyle = hover ? 'rgba(14,60,96,0.95)' : 'rgba(6,35,63,0.9)';
      ctx.strokeStyle = hover ? PALETTE.cyan : 'rgba(125,243,255,0.35)';
      ctx.lineWidth = hover ? 2.5 : 1.5;
      roundRect(ctx, x, y0, cw, ch, 16);
      ctx.fill();
      ctx.stroke();
      this._glyph(ctx, up.glyph, x + cw / 2, y0 + 78, hover);
      ctx.fillStyle = PALETTE.white;
      ctx.font = TITLE_FONT(25);
      ctx.fillText(up.name, x + cw / 2, y0 + 152);
      ctx.font = UI_FONT(16);
      ctx.fillStyle = 'rgba(234,246,255,0.85)';
      this._wrapText(ctx, up.desc, x + cw / 2, y0 + 192, cw - 44, 24);
      ctx.font = UI_FONT(14, 700);
      ctx.fillStyle = PALETTE.cyanSoft;
      ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + ch - 26);
    });
    ctx.restore();
  }

  _glyph(ctx, glyph, x, y, active) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = active ? PALETTE.cyan : 'rgba(125,243,255,0.8)';
    ctx.fillStyle = active ? PALETTE.cyan : 'rgba(125,243,255,0.8)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    if (glyph === 'ring') {
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
    } else if (glyph === 'bolt') {
      ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(-12, 4); ctx.lineTo(-1, 4); ctx.lineTo(-6, 28); ctx.lineTo(14, -6); ctx.lineTo(2, -6); ctx.closePath(); ctx.fill();
    } else if (glyph === 'fin') {
      ctx.beginPath(); ctx.moveTo(-22, 18); ctx.quadraticCurveTo(0, -30, 22, 18); ctx.quadraticCurveTo(0, 2, -22, 18); ctx.fill();
    } else if (glyph === 'dash') {
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath(); ctx.moveTo(-24 + i * 4, -16 + i * 16); ctx.lineTo(18 - i * 4, -16 + i * 16); ctx.stroke();
      }
    } else if (glyph === 'heart') {
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-26, 0, -20, -24, 0, -10); ctx.bezierCurveTo(20, -24, 26, 0, 0, 22); ctx.fill();
    } else if (glyph === 'core') {
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      for (let i = 0; i < 6; i += 1) { const a = (i / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.stroke(); }
    } else if (glyph === 'magnet') {
      ctx.beginPath(); ctx.arc(0, -4, 22, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-22, 14); ctx.lineTo(-10, 14); ctx.lineTo(-10, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, -4); ctx.lineTo(22, 14); ctx.lineTo(10, 14); ctx.lineTo(10, -4); ctx.stroke();
    } else if (glyph === 'echo') {
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
    } else if (glyph === 'thorn') {
      for (let i = 0; i < 5; i += 1) { const a = -Math.PI / 2 + (i - 2) * 0.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26); ctx.stroke(); }
    } else if (glyph === 'orb') {
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -4, 4, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
    } else if (glyph === 'slash') {
      ctx.beginPath(); ctx.moveTo(-24, 20); ctx.lineTo(24, -20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-14, 24); ctx.lineTo(24, -10); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -14); ctx.stroke();
    }
    ctx.restore();
  }

  _wrapText(ctx, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, yy);
        line = w;
        yy += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, cx, yy);
  }

  _panel(ctx, title) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.font = TITLE_FONT(46);
    ctx.fillStyle = PALETTE.white;
    ctx.shadowColor = 'rgba(34,230,255,0.7)';
    ctx.shadowBlur = 18;
    ctx.fillText(title, VIEW.width / 2, 160);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawGameOver(ctx, score, best, isNewBest, wave, kills, time) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,4,12,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    const fade = clamp((time - 0.2) / 0.8, 0, 1);
    ctx.globalAlpha = fade;
    ctx.font = UI_FONT(19, 700);
    ctx.fillStyle = PALETTE.magenta;
    ctx.fillText('T H E   L I G H T   F A D E S', VIEW.width / 2, 190);
    ctx.font = TITLE_FONT(56);
    ctx.fillStyle = PALETTE.white;
    ctx.fillText('Game Over', VIEW.width / 2, 258);
    if (isNewBest) {
      ctx.font = UI_FONT(22, 700);
      ctx.fillStyle = PALETTE.amber;
      ctx.shadowColor = 'rgba(251,191,36,0.8)';
      ctx.shadowBlur = 18;
      ctx.fillText('★  NEW BEST  ★', VIEW.width / 2, 306);
      ctx.shadowBlur = 0;
    }
    ctx.font = TITLE_FONT(72);
    ctx.fillStyle = PALETTE.cyan;
    ctx.shadowColor = 'rgba(34,230,255,0.7)';
    ctx.shadowBlur = 26;
    ctx.fillText(score.toLocaleString(), VIEW.width / 2, 396);
    ctx.shadowBlur = 0;
    ctx.font = UI_FONT(18);
    ctx.fillStyle = 'rgba(234,246,255,0.85)';
    ctx.fillText(`BEST  ${best.toLocaleString()}    •    WAVE ${wave}    •    ${kills} KILLS`, VIEW.width / 2, 440);
    this._button(ctx, VIEW.width / 2 - 220, 490, 200, 54, '↻  PLAY AGAIN', true, time);
    this._button(ctx, VIEW.width / 2 + 20, 490, 200, 54, 'MAIN MENU', false, time);
    ctx.font = UI_FONT(15);
    ctx.fillStyle = 'rgba(234,246,255,0.6)';
    ctx.fillText('Press R to restart, or Q for the main menu', VIEW.width / 2, 590);
    ctx.restore();
    return {
      again: { x: VIEW.width / 2 - 220, y: 490, w: 200, h: 54 },
      menu: { x: VIEW.width / 2 + 20, y: 490, w: 200, h: 54 },
    };
  }

  drawFlash(ctx, color, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${color})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.restore();
  }
}
