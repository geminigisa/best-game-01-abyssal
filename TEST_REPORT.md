# TEST REPORT — ABYSSAL: Echoes of the Last Light

Build: `~/workspace/makefun/best-game-01-abyssal/` (make.fun best-game-01).
QA harness: `~/workspace/makefun/abyssal-qa/qa.mjs` (Playwright +
chrome-headless-shell, viewport 1280×720) + `perf.mjs`, served locally
with `node serve.ts --port 8901`. All tests below were actually run; no
result here is claimed without a run behind it.

## Ringkasan

| Mode QA | Hasil akhir |
|---|---|
| smoke (title load, errors, network) | ✅ PASS |
| shots (4 screenshot `?shot=`) | ✅ PASS |
| play (menu → main → gerak → pulse → dash → pause → game over → restart) | ✅ PASS 10/10 |
| screens (howto / settings / upgrade click / mute) | ✅ PASS 7/7 |
| performance | ✅ 60,2 FPS (headless SwiftShader), heap JS 9,5 MB |
| storage unit test (node, localStorage stub) | ✅ PASS |
| sintaks ES module (12 file) | ✅ PASS |
| main.ts + dossier | ✅ PASS (byte-identik, deterministik) |
| gate checks di output | ✅ PASS |

## Pengujian berhasil

- **Title loads**: `window.__abyssal` hadir, screen `title`, 0 console/page
  error, 0 external request (semua request localhost).
- **Klik PLAY** memulai run (screen `play`, hp 3, energy 100).
- **Pergerakan**: WASD menggerakkan pemain; pada satu run QA pemain
  mengumpulkan orb (skor 0 → 10, combo 1) — bukti nyata pickup + skor
  bekerja lewat input sungguhan.
- **Pulse & dash**: klik mouse + Space tanpa crash; energy turun 100 → 93
  (biaya pulse 22, regen berjalan).
- **Pause/resume**: ESC → `pause`, ESC → `play` kembali.
- **Game over**: pemain diam mati dalam ~10–16 dtk (musuh mengejar ke
  tengah); screen `over`, hp 0, `over: true`.
- **Best score tersimpan**: `localStorage['abyssal-best-score']` ada setelah
  game over (nilai 10 pada run yang mengumpulkan orb; 0 pada run skor 0 —
  keduanya benar). Unit test node: `saveBest(610)` → 610, `saveBest(200)`
  tetap 610, `saveBest(999)` → 999; `countRun` 0 → 1; `saveBestWave(3)` → 3.
- **Restart**: R dari game over → `play` baru (hp 3, skor 0). Q dari pause
  → `title`.
- **How to play / settings**: tombol membuka layarnya; klik / ESC kembali
  ke title.
- **Upgrade**: klik kartu tengah pada `?shot=upgrade` → upgrade diterapkan,
  wave 1 → 2, screen `play`. Keyboard 1/2/3 juga teruji di browser:
  `Digit2` → wave 2, `play` (skrip `abyssal-qa/keys.mjs`). Tombol S / [ ]
  di layar settings tidak crash.
- **Mute**: M tidak crash.
- **Screenshots**: 4 JPEG 1280×720 nyata dari game yang dijalankan —
  `1-hero.jpg` 59,9 KiB, `2-combat.jpg` 40,6 KiB, `3-upgrade.jpg` 47,3 KiB,
  `4-gameover.jpg` 36,4 KiB (semua ≤ 256 KiB). Semua frame berasal dari
  staging deterministik (`?shot=` + seed tetap): hero skor demo 400,
  combat wave 2 skor 1994 dengan 9 musuh (7 di dekat pemain), upgrade skor
  1970 dengan 3 kartu terbaca, game over skor 610 + NEW BEST.
- **Offline**: 0 request eksternal di semua run; `grep` di `game/`: 0
  `http(s)://`, 0 `fetch`/`XMLHttpRequest`/`WebSocket`/dynamic `import()`.
- **Dossier**: `main.ts` dijalankan 3× ke 3 output dir; dossier
  349.566 byte, identik antar run, dan **byte-identik** dengan panggilan
  `buildDossier` segar dari `vendor/makefun-game.ts`
  (`Buffer.compare` = 0, di 2 direktori).
- **Gate (diperiksa di output)**: 0 symlink; game/ 14 entri, 93.562 byte
  (batas 993 / 48 MiB); `index.html` 874 byte (batas 1 MiB); 4 screenshot
  JPEG utuh 1280×720 (panjang ≤1280, pendek ≥480); dossier 349.566 byte
  (batas 1,5 MiB); total output 22 entri (batas 1.000); 12/12 file `.js`
  parse sebagai ES module (`vm.SourceTextModule`).
- **Performa**: 60,2 FPS selama 5 dtk permainan aktif di headless Chrome
  (SwiftShader, software rendering); heap JS 9,5 MB. Particle pool
  tetap (420 partikel, 24 teks) — tidak ada alokasi per frame.

## Bug yang ditemukan & diperbaiki

1. **Klik kartu upgrade menerapkan DUA upgrade + lompat 2 wave.**
   Penyebab: `mousedown` juga menyetel flag `pulse`, dan cabang layar
   upgrade membaca `take('pulse')` sebagai "pilih kartu 0" — jadi satu
   klik menjalankan `chooseUpgrade(i)` lalu `chooseUpgrade(0)`.
   Perbaikan: hapus pembacaan `pulse` di layar upgrade; pilihan keyboard
   jadi 1/2/3 + Enter (pilih kartu yang di-hover). Diverifikasi: satu klik
   → wave 1 → 2 saja.
2. **Tombol R/Q di layar game over & pause tidak berfungsi.**
   Render menulis "Press R to restart, or Q for the main menu" tapi
   `main.js` tidak menangani `KeyR`/`KeyQ`. Perbaikan: `input.js` memetakan
   R/Q (juga S untuk shake, [ ] untuk volume, 1/2/3 untuk upgrade);
   `main.js` menangani restart/quit di layar over & pause. Diverifikasi
   di QA play (R restart, Q ke title).
3. **Pulse ring tidak terlihat di screenshot combat.**
   Penyebab ganda: (a) pool partikel 420 penuh oleh partikel staging yang
   tidak pernah decay di mode shot (`particles.update(0)`), sehingga ring
   terakhir tidak teralokasi; (b) ring digambar dengan radius
   `size * (1 - life/max)` — saat baru lahir radius = 0, tidak terlihat
   di frame beku. Perbaikan: mode shot membersihkan pool lalu membangun
   ulang frame final (ring segar + sparks + trail); `particles.ring()`
   mendapat parameter `ageFrac` agar ring tampil mid-expansion di frame
   beku. Diverifikasi visual: ring cyan besar terlihat di `2-combat.jpg`.
4. **Frame combat encer & pemain di pojok.**
   Autopilot terlalu pasif (wave 1 tidak selesai dalam 45 dtk) dan
   melarikan diri ke sudut arena. Perbaikan: autopilot lebih agresif
   (caution 0,6), staging 60 dtk dengan lanjutan wave, 8 dtk terakhir
   tanpa pulse (musuh menumpuk) + tarikan ke tengah, dan pemilihan seed:
   seed 7 memberi pemain di tengah (jarak 70 px dari pusat), wave 2,
   9 musuh, 7 di dekat pemain. Diverifikasi via skrip node
   (`/tmp/abyssal-seeds.mjs`, 12 seed diuji) + screenshot.
5. **Skor game over 0 di screenshot.**
   Pemain diam tidak pernah mengumpulkan orb. Perbaikan: staging `over`
   memainkan autopilot 18 dtk dulu (skor 610) baru diam sampai mati.
   Diverifikasi: `4-gameover.jpg` menunjukkan 610 + NEW BEST.
6. **Teks skor mengambang (+41/+28) menumpuk & mengotori screenshot.**
   `handleEvent` dipakai sebagai callback staging sehingga teks skor
   memenuhi frame. Perbaikan: mode shot memakai `shotFx` (partikel saja,
   tanpa teks skor/audio/banner). Diverifikasi visual.
7. **Pemain title tersembunyi di balik tombol PLAY.**
   Demo world pemain spawn di tengah (640,360) — tepat di bawah tombol.
   Perbaikan: mode shot hero menaruh pemain di (300,560) dengan HP penuh
   dan memakai dunia hasil staging sebagai demo world. Diverifikasi visual.
8. **Asersi QA salah (bukan bug game).** Tes "best score" menuntut
   `best > 0` padahal run idle berskor 0 — nilai 0 yang tersimpan adalah
   benar. Asersi diperbaiki menjadi "key ada". (Juga ditemukan: mode shot
   awalnya tidak menjalankan game loop sehingga klik di layar upgrade
   tidak diproses — loop kini berjalan setelah render pertama, dan shot
   tetap interaktif.)
9. **Verifikasi dossier sempat dilaporkan tidak identik (bukan bug game).**
   Penyebabnya skrip verifikasi membandingkan `Uint8Array` hasil
   `buildDossier` dengan string — perbandingan byte yang benar
   (`Buffer.compare`) menunjukkan identik.

## Bug yang belum terselesaikan

Tidak ada bug fungsional yang diketahui tersisa. Catatan:

- **Label "DASH…" saat cooldown** — disengaja (bukan bug): saat dash
  cooldown, HUD menampilkan `DASH…` alih-alih angka. Bisa diganti
  hitung mundur, tapi bukan cacat.
- **Musuh lurker menampilkan bar HP merah** di screenshot combat — itu
  bar HP musuh yang sudah terluka (pulse) / elite; disengaja.

## Pengujian yang belum dapat dilakukan

- **Audio sungguhan**: WebAudio tidak dapat didengar di headless Chrome;
  kode audio dijalankan (tidak ada error console) tapi kualitas suara
  belum dinilai telinga manusia. Semua SFX adalah synth (tanpa aset).
- **Penilaian manusia atas "fun"**: autopilot memainkan game sampai wave 2
  (skor ~2.000, 12–15 kill) dan game over tercapai; keseimbangan
  kesulitan (apakah wave 1 terlalu mudah/sulit untuk manusia) belum diuji
  oleh pemain manusia.
- **Dev grade / penilaian judge make.fun**: hanya bisa terjadi setelah
  submit (di luar wewenang build ini — TIDAK dilakukan).
- **Touch controls**: `input.js` punya fallback touch (drag untuk gerak),
  tapi belum diuji di perangkat sentuh nyata; game ini ditargetkan
  desktop (keyboard + mouse) sesuai bounty.

## Cara mengulang QA

```sh
cd ~/workspace/makefun/best-game-01-abyssal && node serve.ts --port 8901 &
cd ~/workspace/makefun
node abyssal-qa/qa.mjs smoke 8901
node abyssal-qa/qa.mjs shots 8901
node abyssal-qa/qa.mjs play 8901
node abyssal-qa/qa.mjs screens 8901
node abyssal-qa/perf.mjs
# dossier
cd ~/workspace/makefun/best-game-01-abyssal
rm -rf /tmp/abyssal-out && MAKEFUN_OUTPUT_DIR=/tmp/abyssal-out node main.ts
```
