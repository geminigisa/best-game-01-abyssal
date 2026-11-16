# ABYSSAL: Echoes of the Last Light

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/geminigisa/best-game-01-abyssal/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/geminigisa/best-game-01-abyssal/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An original arcade survival game for the
[make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01)
(best-game-01, $1,000 prize pool).

You are the last luminous creature at the bottom of a mysterious ocean.
Gather life energy, outswim the dark, and survive as long as you can.

## How to play

| Input | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Mouse | Aim |
| Left click (hold) | Energy pulse — hurts and pushes back enemies in front of you |
| Space | Dash — a fast burst, briefly untouchable |
| ESC | Pause |
| 1 / 2 / 3 | Pick an upgrade card |
| R | Restart (game over / pause) |
| Q | Main menu (game over / pause) |
| M | Mute |

Collect glowing **energy orbs** to score and recharge. Every pickup feeds a
combo multiplier (up to ×8). Clear a wave and choose one of three upgrades —
wider pulses, faster fins, thorn skin, a second wind, and more. Four enemy
kinds hunt you, each with its own behaviour: **gnashers** chase,
**drifters** wander in sine waves, **lurkers** telegraph then lunge, and the
**leviathan** (from wave 4) takes six hits and hits back twice as hard.
Elites appear from wave 5. Your best score is saved in the browser.

## Run it

No build step, no network. Any static server works:

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

or:

```sh
npx serve game
python3 -m http.server --directory game
```

Open `http://localhost:8080/` in desktop Chrome and play. Node 22.18+
is required for the hand-in program (`main.ts`); the game itself only
needs a browser.

## Screenshots

Real renders of the game, staged deterministically with
`game/index.html?shot=hero|combat|upgrade|over` (fixed seeds, same frame
every run):

1. `1-hero.jpg` — title screen over a live demo world
2. `2-combat.jpg` — wave 2 combat: pulse ring, lurkers closing in
3. `3-upgrade.jpg` — upgrade choice after clearing wave 1
4. `4-gameover.jpg` — game over with a new best score

## Structure

```
game/
  index.html            page: canvas + module script, nothing else
  src/
    config.js           tuning, palette, enemy table, shot seeds
    random.js           seeded RNG (mulberry32)
    input.js            keyboard / mouse / touch
    world.js            pure game logic: physics, AI, combat, waves
    render.js           canvas drawing: background, entities, HUD, screens
    particles.js        fixed particle + floating-text pools
    effects.js          screen shake, flash, banners
    audio.js            WebAudio synth SFX + ambient drone (no assets)
    upgrades.js         the 12-upgrade pool
    storage.js          best score / runs / best wave (localStorage)
    shots.js            deterministic staged scenes for screenshots
    main.js             loop, screens, event wiring
main.ts                 hand-in program: copies game/ + screenshots/,
                        writes dossier.json via vendor/makefun-game.ts
vendor/makefun-game.ts  kit library, unchanged
serve.ts                tiny dev server (not part of the entry)
```

Everything is original: the art is drawn in code, the sounds are
synthesised with WebAudio, and no file is loaded from the network —
`game/` is fully offline. See [REQUIREMENTS.md](REQUIREMENTS.md) for the
bounty requirements and [TEST_REPORT.md](TEST_REPORT.md) for the QA
results.

## License

MIT — see [LICENSE](LICENSE).
