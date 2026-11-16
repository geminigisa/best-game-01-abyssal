// ABYSSAL — input: keyboard, mouse, and aim.
// Tracks held keys, edge-triggered presses, and the mouse position in logical
// canvas coordinates. Also offers a simple touch fallback (drag to move).

/** Key codes the game listens to. */
const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = { up: false, down: false, left: false, right: false };
    this.mouse = { x: 0, y: 0, down: false };
    this.pressed = new Set();
    this.clicks = [];
    this.touch = { active: false, x: 0, y: 0 };
    this.onPause = null;
    this.onAnyKey = null;
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      const dir = MOVE_KEYS[event.code];
      if (dir) {
        this.held[dir] = true;
        event.preventDefault();
      }
      if (event.code === 'Space') {
        this.pressed.add('dash');
        event.preventDefault();
      }
      if (event.code === 'Escape') {
        this.pressed.add('pause');
      }
      if (event.code === 'Enter') {
        this.pressed.add('confirm');
      }
      if (event.code === 'KeyM') {
        this.pressed.add('mute');
      }
      if (event.code === 'Digit1') {
        this.pressed.add('one');
      }
      if (event.code === 'Digit2') {
        this.pressed.add('two');
      }
      if (event.code === 'Digit3') {
        this.pressed.add('three');
      }
      if (event.code === 'KeyR') {
        this.pressed.add('restart');
      }
      if (event.code === 'KeyQ') {
        this.pressed.add('quit');
      }
      if (event.code === 'KeyS') {
        this.pressed.add('shake');
      }
      if (event.code === 'BracketLeft') {
        this.pressed.add('volDown');
      }
      if (event.code === 'BracketRight') {
        this.pressed.add('volUp');
      }
      if (this.onAnyKey) this.onAnyKey(event.code);
    });
    window.addEventListener('keyup', (event) => {
      const dir = MOVE_KEYS[event.code];
      if (dir) this.held[dir] = false;
    });
    window.addEventListener('blur', () => {
      this.held.up = false;
      this.held.down = false;
      this.held.left = false;
      this.held.right = false;
      this.mouse.down = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mouse.x = (event.clientX - rect.left) * scaleX;
      this.mouse.y = (event.clientY - rect.top) * scaleY;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.pressed.add('pulse');
        this.clicks.push({ x: this.mouse.x, y: this.mouse.y });
      }
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('touchstart', (event) => {
      const t = event.touches[0];
      this.touch.active = true;
      this.touch.x = t.clientX;
      this.touch.y = t.clientY;
      event.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (event) => {
      const t = event.touches[0];
      this.touch.x = t.clientX;
      this.touch.y = t.clientY;
      event.preventDefault();
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => {
      this.touch.active = false;
    });
  }

  /** Movement vector from held keys, normalised. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held.left) x -= 1;
    if (this.held.right) x += 1;
    if (this.held.up) y -= 1;
    if (this.held.down) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Was `action` pressed since the last consume? */
  take(action) {
    if (this.pressed.has(action)) {
      this.pressed.delete(action);
      return true;
    }
    return false;
  }

  /** Drop all pending presses (used when changing screens). */
  clearPresses() {
    this.pressed.clear();
    this.clicks.length = 0;
  }

  /** Take the oldest queued click {x, y} in logical coordinates, or null. */
  takeClick() {
    return this.clicks.length > 0 ? this.clicks.shift() : null;
  }

  /** True while the left mouse button is held down. */
  get mouseHeld() {
    return this.mouse.down;
  }
}
