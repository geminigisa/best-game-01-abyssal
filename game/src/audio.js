// ABYSSAL — audio: everything is synthesised with WebAudio, no sound assets.
// All effects are short oscillator/noise envelopes. The context is created on
// the first user gesture (browsers block audio before that); every call is
// safe to make before then — it simply does nothing.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.volume = 0.6;
    this.drone = null;
    this._loadSettings();
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('abyssal-settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.muted === 'boolean') this.muted = s.muted;
        if (typeof s.volume === 'number') this.volume = s.volume;
      }
    } catch (e) {
      // No storage available: keep defaults.
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('abyssal-settings', JSON.stringify({
        muted: this.muted,
        volume: this.volume,
      }));
    } catch (e) {
      // Ignore storage failures.
    }
  }

  /** Create the context after a user gesture. Safe to call repeatedly. */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : this.volume;
    this.saveSettings();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    this.saveSettings();
  }

  _tone(freq, freqEnd, dur, type, gain, when = 0) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, gain, filterFreq) {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  pickup(combo) {
    const base = 620 + Math.min(combo, 8) * 45;
    this._tone(base, base * 1.6, 0.12, 'sine', 0.16);
  }

  pulse() {
    this._tone(320, 70, 0.22, 'sawtooth', 0.2);
    this._noise(0.14, 0.12, 1800);
  }

  dash() {
    this._noise(0.16, 0.14, 3200);
  }

  hit() {
    this._tone(140, 55, 0.28, 'square', 0.22);
    this._noise(0.2, 0.16, 700);
  }

  enemyDie() {
    this._tone(420, 90, 0.18, 'triangle', 0.16);
    this._noise(0.12, 0.1, 2400);
  }

  waveClear() {
    this._tone(523, 523, 0.14, 'sine', 0.16);
    this._tone(659, 659, 0.14, 'sine', 0.16, 0.12);
    this._tone(784, 784, 0.22, 'sine', 0.18, 0.24);
  }

  /** Low horn when a new wave begins. */
  waveStart() {
    this._tone(196, 196, 0.3, 'triangle', 0.18);
    this._tone(147, 147, 0.4, 'triangle', 0.16, 0.12);
  }

  upgrade() {
    this._tone(880, 1320, 0.2, 'sine', 0.16);
    this._tone(1174, 1568, 0.26, 'sine', 0.12, 0.08);
  }

  click() {
    this._tone(700, 900, 0.06, 'sine', 0.1);
  }

  gameOver() {
    this._tone(392, 392, 0.3, 'triangle', 0.18);
    this._tone(311, 311, 0.3, 'triangle', 0.18, 0.28);
    this._tone(233, 180, 0.6, 'triangle', 0.2, 0.56);
  }

  /** Low ambient drone: two detuned sines + slow LFO. Call once per game. */
  startDrone() {
    if (!this.ctx || !this.master || this.drone) return;
    try {
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      const o1 = this.ctx.createOscillator();
      o1.type = 'sine';
      o1.frequency.value = 55;
      const o2 = this.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = 55.7;
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.07;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      o1.connect(g);
      o2.connect(g);
      g.connect(this.master);
      o1.start();
      o2.start();
      lfo.start();
      this.drone = { o1, o2, lfo, g };
    } catch (e) {
      this.drone = null;
    }
  }

  stopDrone() {
    if (!this.drone) return;
    try {
      this.drone.o1.stop();
      this.drone.o2.stop();
      this.drone.lfo.stop();
      this.drone.g.disconnect();
    } catch (e) {
      // Already stopped.
    }
    this.drone = null;
  }
}
