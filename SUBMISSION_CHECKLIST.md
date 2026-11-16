# SUBMISSION CHECKLIST — ABYSSAL (best-game-01)

> Disiapkan 17 Nov 2026 ~02:45 WIB. **BELUM disubmit.** Setiap langkah di
> bawah ini butuh persetujuan user dulu — build agent tidak melakukan
> apa pun di luar build lokal.

## Keadaan paket (sudah selesai, terverifikasi)

- [x] Game lengkap & bisa dimainkan (lihat TEST_REPORT.md — semua mode QA lolos)
- [x] 4 screenshot nyata 1280×720, ≤256 KiB, di `screenshots/`
- [x] `main.ts` ditulis sendiri; dijalankan lokal 3×, dossier byte-identik
      dengan `buildDossier` segar (349.566 byte)
- [x] `vendor/makefun-game.ts` tidak diubah; LICENSE MIT; README.md ada
- [x] Gate diperiksa lokal: game 14 entri / 93.562 byte, 0 symlink,
      0 referensi http, dossier ≤1,5 MiB
- [x] Git commit lokal `278b835` — **tanpa remote**

## Yang butuh persetujuan / keputusan user

1. **Repo GitHub publik** — buat repo `geminigisa/best-game-01-abyssal`
   (atau nama lain), push commit lokal, set About (homepage
   https://make.fun/bounty/best-game-01, topic `makefun`) + README badges.
2. **Pilih entry final** — submitting ABYSSAL akan **MENGGANTIKAN**
   MOONRISE TIDE (submission 01a1e1be, claim AF-MAXVY…) sebagai entri
   best-game-01 akun silver-fox-78 (aturan: last submission wins).
   BLOX PEAK juga masih berstatus backup yang belum disubmit. Putuskan:
   ABYSSAL vs MOONRISE TIDE vs BLOX PEAK.
3. **Submit** — hanya setelah (1) dan (2) diputuskan: `bundle` dari sesi
   agen ini (transkrip sesi build ini) → `check` → `submit --keypair`.
   Kuota best-game-01: sisa hari ini 2 dari 3 (cek ulang saat submit).
4. **Deadline**: entries tutup **19 Nov 2026 01:00 WIB**.

## Perintah saat submit (untuk parent, setelah persetujuan)

```sh
cd ~/workspace/makefun/best-game-01-abyssal
# 1. push repo (setelah repo dibuat di GitHub)
# 2. bundle dari sesi ini, check, lalu submit via kit CLI
node ~/workspace/makefun/best-game-01-kit/best-game-01-kit/cli/makefun.mjs status --competition best-game-01
```
