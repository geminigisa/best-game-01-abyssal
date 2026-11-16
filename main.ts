// ABYSSAL — hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ into the output directory
// and writes dossier.json with the vendored make.fun library, so the judge
// can read the game. Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.
// The program refuses to hand in a package the scorer would refuse: more
// than four screenshots, a screenshot over 256 KiB, or a game/ tree over
// 993 entries / 48 MiB.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const SHOT_LIMIT = 4;
const SHOT_MAX_BYTES = 262144;
const GAME_MAX_ENTRIES = 993;
const GAME_MAX_BYTES = 50331648;

function fail(message) {
  console.error(`abyssal hand-in: ${message}`);
  process.exit(1);
}

function copyTree(source, target) {
  let entries = 0;
  let bytes = 0;
  const stack = [[source, target]];
  while (stack.length > 0) {
    const [from, to] = stack.pop();
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      const fromPath = join(from, name);
      const toPath = join(to, name);
      const info = statSync(fromPath);
      if (info.isDirectory()) {
        entries += 1;
        stack.push([fromPath, toPath]);
      } else if (info.isFile()) {
        entries += 1;
        bytes += info.size;
        copyFileSync(fromPath, toPath);
      } else {
        fail(`refusing ${fromPath}: not a plain file or directory`);
      }
    }
  }
  return { entries, bytes };
}

function checkShots(dir) {
  if (!existsSync(dir)) return;
  const names = readdirSync(dir).filter((n) => !n.startsWith('.')).sort();
  if (names.length > SHOT_LIMIT) fail(`${names.length} screenshots, at most ${SHOT_LIMIT} allowed`);
  for (const name of names) {
    const info = statSync(join(dir, name));
    if (!info.isFile()) fail(`screenshot ${name} is not a plain file`);
    if (info.size > SHOT_MAX_BYTES) fail(`screenshot ${name} is ${info.size} bytes, over the ${SHOT_MAX_BYTES} cap`);
  }
}

function main() {
  const gameSource = join(repoRoot, 'game');
  const shotsSource = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameSource, 'index.html'))) {
    fail('game/index.html is missing');
  }
  checkShots(shotsSource);
  mkdirSync(outputDir, { recursive: true });
  const gameStats = copyTree(gameSource, join(outputDir, 'game'));
  if (gameStats.entries > GAME_MAX_ENTRIES) {
    fail(`game/ holds ${gameStats.entries} entries, over the ${GAME_MAX_ENTRIES} cap`);
  }
  if (gameStats.bytes > GAME_MAX_BYTES) {
    fail(`game/ holds ${gameStats.bytes} bytes, over the ${GAME_MAX_BYTES} cap`);
  }
  if (existsSync(shotsSource)) {
    copyTree(shotsSource, join(outputDir, 'screenshots'));
  } else {
    mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: SHOT_LIMIT, max_bytes: SHOT_MAX_BYTES },
    game_max_files: GAME_MAX_ENTRIES,
    game_max_bytes: GAME_MAX_BYTES,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log(`abyssal hand-in: wrote ${basename(outputDir)} (game: ${gameStats.entries} entries, ${gameStats.bytes} bytes; dossier: ${dossier.length} bytes)`);
}

main();
