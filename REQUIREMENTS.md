# REQUIREMENTS.md — ABYSSAL: ECHOES OF THE LAST LIGHT
## make.fun bounty `best-game-01` — "Make the best game"

> Dokumen ini disusun dari fakta terverifikasi: halaman bounty, `GET /api/competitions/best-game-01`,
> `GET /api/competitions/best-game-01/requirements`, dan isi kit
> (`~/workspace/makefun/best-game-01-kit/best-game-01-kit/`). Tidak ada persyaratan yang dikarang.

## 1. Tujuan bounty

Buat game terbaik yang bisa dibuat, genre bebas (arcade, puzzle, platformer, strategi,
racing, shooter, atau genre baru). Game berjalan di desktop browser dari file statis,
dimainkan dengan keyboard dan mouse, lengkap dari awal sampai restart, dan orisinal.

## 2. Kriteria penilaian (AI judge, pairwise, paling penting dulu)

Judge membandingkan dua game sekaligus lewat screenshot + outline source, lalu memilih
yang lebih baik. Ranking by win rate.

1. **Game yang lengkap**: tujuan, aturan, kontrol responsif, cara menang/kalah/skor,
   start dan restart, HUD atau feedback yang menunjukkan progres pemain — semuanya
   terlihat di screenshot game itu sendiri. Entry yang bukan game yang bisa dimainkan
   kalah dari yang bisa dimainkan.
2. **Fun dan depth**: core loop yang layak diulang, tantangan yang tumbuh seiring
   pemain makin mahir, pilihan yang bermakna, variasi musuh/hal yang ditemui.
3. **Feel dan polish**: kontrol yang langsung merespons, feedback untuk setiap aksi,
   suara, menu, dan tuning yang adil.
4. **Look dan originality**: ide orisinal dengan art direction sendiri, palet koheren,
   adegan yang terbaca sekilas. Entry yang menyalin game komersial (nama, karakter,
   art, musik, level) kalah dari yang orisinal.
5. **Structure**: outline menunjukkan source game sendiri yang terbagi ke file-file
   dengan satu tugas jelas per file, dinamai sesuai fungsinya.

Kriteria pertama yang membedakan dua entry yang menentukan, kecuali kriteria
berikutnya berbeda jauh lebih besar.

## 3. Persyaratan teknis

- **Runtime**: Node.js 22.18 atau lebih baru. (Lingkungan ini: Node v24.22.1 — memenuhi.)
- **Browser**: desktop browser seperti Chrome untuk playtest dan screenshot.
- **Game statis**: `game/` berisi file statis tanpa build step; `game/index.html`
  dibuka di desktop Chrome dan bermain tanpa network request. Semua script, modul,
  gambar, suara, dan font yang dimuat harus berupa file di bawah `game/` atau
  `data:` URI.
- **Library**: library/engane apa pun boleh di-vendor di bawah `game/` (di direktori
  bernama `vendor`, atau sebagai file `*.min.js`). Dossier mencantumkannya sebagai
  vendored dan tidak menampilkannya sebagai source. (Game ini memakai **tanpa
  library** — vanilla JS + Canvas 2D, nol dependensi.)
- **main.ts**: program di root repository (Node 22, standard library saja) yang
  menyalin `game/` dan `screenshots/` ke `/output` (di luar grader:
  `$MAKEFUN_OUTPUT_DIR`) dan menulis `/output/dossier.json` dengan `buildDossier`
  dari `vendor/makefun-game.ts`. Program berjalan dua kali dan kedua run harus
  menulis byte yang sama. Batas run: 120 detik, 1 CPU, 1024 MB.
- **vendor/makefun-game.ts**: salinan kit, **tidak boleh diubah**. Gate membangun
  ulang dossier dengan library yang sama dan membandingkan byte per byte.
- **LICENSE**: file lisensi OSI-approved di root. (Proyek ini: MIT.)
- **Tidak ada secret**: file entry tidak boleh mengandung API key provider atau secret
  apa pun.

## 4. Struktur proyek

```
best-game-01-abyssal/
  REQUIREMENTS.md        (dokumen ini)
  README.md
  TEST_REPORT.md
  LICENSE                (MIT)
  main.ts                (entrypoint, ditulis sendiri — bukan salinan starter)
  serve.ts               (dev server lokal, opsional)
  vendor/
    makefun-game.ts      (salinan kit, tanpa diubah)
  game/
    index.html           (file biasa, maks 1 MiB)
    src/
      config.js          (konstanta, palet, tuning)
      random.js          (RNG seeded, deterministik)
      input.js           (keyboard + mouse)
      audio.js           (synth WebAudio, tanpa aset)
      world.js           (entitas, spawn, wave, collision, skor)
      upgrades.js        (definisi upgrade)
      particles.js       (sistem partikel)
      effects.js         (screen shake, flash, floating text)
      render.js          (gambar: background, entitas, HUD, layar)
      shots.js           (adegan screenshot deterministik + autopilot)
      storage.js         (high score via localStorage)
      main.js            (bootstrap, game loop, state machine)
  screenshots/
    1-hero.jpg           (cover — frame gameplay hero + title lockup)
    2-combat.jpg         (combat: pulse + dash, banyak musuh, VFX)
    3-upgrade.jpg        (layar upgrade, kartu pilihan jelas)
    4-gameover.jpg       (game over, skor besar + "NEW BEST")
```

## 5. Format submission

- Repository GitHub publik milik akun sendiri (atau source bundle), dibuat setelah
  kompetisi dibuka, dengan commit yang disubmit; atau source bundle.
- `main.ts` di root; `vendor/makefun-game.ts` disalin dari kit tanpa diubah;
  `game/`; `screenshots/` 3–4 gambar; LICENSE OSI-approved; transkrip sesi agen.
- Entri terakhir sebelum deadline adalah entri final. Maks 5 submission per hari
  UTC dan 10 total per akun (kuota akun saat ini: sisa hari ini 2 dari 3).
- **Submission TIDAK dilakukan oleh build ini** — butuh persetujuan eksplisit user.
  Build ini hanya menyiapkan paket sampai siap submit.

## 6. Screenshot yang diwajibkan

- 3–4 file PNG atau JPEG di `screenshots/`, masing-masing maks 256 KiB, PNG/JPEG
  utuh, sisi panjang maks 1280 px, sisi pendek min 480 px.
- Nama hanya huruf, digit, `. _ -` (1–128 karakter, tidak diawali `.` atau `-`).
- **Yang pertama menurut nama adalah cover** — paling menentukan di penilaian.
- Harus render nyata dari kode game sendiri di browser — tidak diedit, tidak
  dikomposit, tidak dipinjam. Game ini memakai mode `?shot=` deterministik
  (seed tetap + autopilot) sehingga setiap screenshot adalah frame yang benar-benar
  dihasilkan permainan.
- Screenshot harus menunjukkan loop lengkap: start/title, gameplay + HUD,
  dan win/loss/results screen dengan restart.

## 7. Persyaratan session recording / transcript gate

- Setiap submission wajib menyertakan transkrip sesi AI coding-agent yang membangun
  entry (bundle makefun atau file lepas, maks 200 MB).
- `handed_over_places` kompetisi ini: **none** — sesi handed-over tidak bisa
  mengambil tempat berbayar.
- Gate transcript (10 cek pass/fail): transcripts_present, transcripts_recorded,
  thinking_wellformed, thinking_in_window, thinking_committed,
  thinking_reproduces, thinking_turns, thinking_priced, thinking_revised,
  thinking_fresh, plus transcripts_run_record (wajib untuk entry yang diterima
  mulai 17 Nov 2026 00:00 UTC).
- **thinking_reproduces**: minimal 30% baris terhitung adalah authored (ditulis
  agen sendiri); baris starter kit tidak dihitung; entrypoint (`main.ts`) harus
  punya minimal satu baris authored. → `main.ts` ditulis dengan kata-kata sendiri,
  bukan salinan starter byte-for-byte.
- **thinking_revised**: ada file (entrypoint atau kode yang dijalankannya) yang
  konten akhirnya berasal dari minimal 2 pesan assistant yang menulis/mengeditnya.
  → setiap file kunci ditulis lalu direvisi sungguhan di pesan terpisah.
- **thinking_in_window**: semua timestamp transkrip harus di antara pembukaan
  kompetisi (2026-11-15T18:00:00Z) dan waktu receipt.
- **thinking_fresh**: untuk source bundle, baris yang dikreditkan harus berasal
  dari sesi yang menunjukkan anchor line `makefun anchor <root sha> round <round>`
  dari `kit init` sebelum write pertama yang dihitung.
- best-game-01 **tidak memakai live recording** (`makefun record` ditolak HTTP 400);
  transkrip diambil dari file sesi agen ini lewat `bundle` nanti.

## 8. Gate scorer (Valid 1/0 — hanya yang valid masuk ke judge)

- **game_files**: `game/` hanya file/dir biasa (tanpa symlink), maks 993 entri
  dan 48 MiB total, path maks 1000 byte UTF-8, `game/index.html` file biasa
  maks 1 MiB.
- **references**: semua referensi harus `data:` URI atau path ke file di dalam
  `game/` — tidak ada `http/https`, tidak ada bare specifier kecuali via import
  map, tidak boleh keluar dari `game/`.
- **screenshots**: 3–4 file, masing-masing maks 256 KiB, PNG/JPEG utuh, sisi
  panjang maks 1280 px, sisi pendek min 480 px.
- **dossier_matches**: `dossier.json` byte-identik dengan hasil `buildDossier`
  dari `vendor/makefun-game.ts`, maks 1,5 MiB.
- **js_parses**: semua `.js`/`.mjs` parse sebagai ES module (ditampilkan, tidak
  menentukan validitas).

## 9. Tenggat dan hadiah

- Entries tutup: **19 Nov 2026 01:00 WIB** (2026-11-18T18:00:00Z).
- Final window mulai: 2026-11-18T18:10:00Z. Hasil due: 3 Des 2026 06:10Z.
- Hadiah total **$1.000 USDC (Solana)**: 1st $400, 2nd $200, 3rd $120,
  4th–10th $40. Escrow Solana mainnet sudah funded/open.
- Top 3 bisa dimainkan live dari halaman bounty setelah entries tutup; pemenang
  difiturkan di post make.fun.

## 10. Status pemenuhan (diisi saat build selesai)

| Persyaratan | Status |
|---|---|
| Node 22.18+ | ✅ v24.22.1 |
| Browser desktop untuk playtest | ✅ headless Chrome (chrome-headless-shell) + Playwright |
| Game statis offline, tanpa network | ✅ 0 external request di semua QA run; 0 `http(s)://`, `fetch`, XHR, WebSocket, dynamic import di `game/` |
| main.ts ditulis sendiri | ✅ struktur sendiri (copy rekursif + validasi + caps), bukan salinan starter |
| vendor/makefun-game.ts tanpa diubah | ✅ disalin dari kit, tidak disentuh |
| LICENSE MIT | ✅ root, pemegang "geminigisa" |
| 3–4 screenshot nyata ≤256 KiB | ✅ 4 JPEG 1280×720: 59,9 / 40,6 / 47,3 / 36,4 KiB, render nyata dari `?shot=` |
| dossier.json byte-identik buildDossier | ✅ terverifikasi: `Buffer.compare` fresh buildDossier vs file = 0, di 2 output dir; deterministik antar run |
| Semua file .js parse sebagai ES module | ✅ 12/12 file `game/src/` lolos `vm.SourceTextModule` |
| Transkrip: authored ≥30%, entrypoint authored, revisi 2+ pesan | ✅ semua file kunci ditulis di sesi ini + revisi sungguhan di pesan berikutnya; main.ts ditulis dari nol; tidak ada file starter yang disalin kecuali vendor |
| Gate scorer: game ≤993 entri / 48 MiB | ✅ 14 entri, 93.562 byte; 0 symlink; index.html 874 byte |
| Gate scorer: screenshots 3–4, ≤256 KiB, sisi panjang ≤1280, pendek ≥480 | ✅ 4 file, JPEG utuh 1280×720 |
| Gate scorer: dossier ≤1,5 MiB | ✅ 349.566 byte |
