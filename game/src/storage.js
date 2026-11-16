// ABYSSAL — persistence: best score and settings in localStorage.
// Every call is guarded: in sandboxes or private modes storage may throw,
// and the game must keep working without it.

const BEST_KEY = 'abyssal-best-score';
const RUNS_KEY = 'abyssal-runs';

export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

/** Save `score` as the new best when it beats the stored one. Returns the best. */
export function saveBest(score) {
  const best = Math.max(loadBest(), score);
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch (e) {
    // Ignore storage failures.
  }
  return best;
}

/** How many runs have been played (shown on the title screen). */
export function loadRuns() {
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

const WAVE_KEY = 'abyssal-best-wave';

/** Deepest wave reached, for the title screen's records line. */
export function loadBestWave() {
  try {
    const raw = localStorage.getItem(WAVE_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch (e) {
    return 0;
  }
}

export function saveBestWave(wave) {
  const best = Math.max(loadBestWave(), wave);
  try {
    localStorage.setItem(WAVE_KEY, String(best));
  } catch (e) {
    // Ignore storage failures.
  }
  return best;
}

export function countRun() {
  const runs = loadRuns() + 1;
  try {
    localStorage.setItem(RUNS_KEY, String(runs));
  } catch (e) {
    // Ignore storage failures.
  }
  return runs;
}
