// ABYSSAL — screen effects: shake, hit flash, and banners.
// All effects decay on their own; the renderer reads them each frame.

export class Effects {
  constructor() {
    this.shakeTime = 0;
    this.shakeDur = 0.001;
    this.shakeMag = 0;
    this.flashTime = 0;
    this.flashDur = 0.001;
    this.flashColor = '255,84,112';
    this.banner = null;
    this.bannerTime = 0;
    this.bannerDur = 0;
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.bannerTime > 0) this.bannerTime -= dt;
  }

  /** Kick the camera. Magnitude in logical pixels, duration in seconds. */
  shake(mag, dur = 0.3) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
    this.shakeDur = Math.max(this.shakeDur, dur);
  }

  /** Full-screen colour flash (red on damage, cyan on wave clear). */
  flash(color, dur = 0.25) {
    this.flashColor = color;
    this.flashTime = dur;
    this.flashDur = dur;
  }

  /** Centre-screen banner text, e.g. "WAVE 2". */
  showBanner(text, sub, dur = 1.6) {
    this.banner = { text, sub };
    this.bannerTime = dur;
    this.bannerDur = dur;
  }

  /** Current shake offset, easing out as the shake decays. */
  offset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const k = this.shakeTime / this.shakeDur;
    const mag = this.shakeMag * k * k;
    return {
      x: (Math.random() - 0.5) * 2 * mag,
      y: (Math.random() - 0.5) * 2 * mag,
    };
  }

  /** Current flash alpha 0..1. */
  flashAlpha() {
    if (this.flashTime <= 0) return 0;
    return (this.flashTime / this.flashDur) * 0.28;
  }

  /** Current banner, or null when it has faded. */
  currentBanner() {
    if (this.bannerTime <= 0 || !this.banner) return null;
    const t = this.bannerTime / this.bannerDur;
    const alpha = t > 0.75 ? (1 - t) / 0.25 : t < 0.25 ? t / 0.25 : 1;
    return { text: this.banner.text, sub: this.banner.sub, alpha };
  }

  clear() {
    this.shakeTime = 0;
    this.flashTime = 0;
    this.bannerTime = 0;
    this.banner = null;
  }
}
