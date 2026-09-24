# STEGO-AE — Stay Gold After Encryption

Full-stack web app for **encrypted information hiding in PNG images and WAV
audio** using the LSB algorithm. UTS demo for Information Security, Universitas
Siliwangi.

- Embed a text message encrypted with AES-256-GCM into PNG or WAV.
- Extract it back with the correct passphrase.
- Measure image/audio quality (MSE, PSNR, RGB histogram, enhanced LSB).
- Test JPEG fragility (image) and FLAC losslessness (audio).
- Export experiment results as XLSX.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Zod · sharp · wavefile ·
libflac.js · ExcelJS · Vitest.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### NixOS

Dengan Nix flakes aktif, masuk ke development shell proyek:

```bash
nix develop
npm install
npm run dev
```

`flake.nix` menyediakan Node.js 24, npm, dan tool native yang dibutuhkan oleh
`sharp` serta pemrosesan FLAC. Dependensi JavaScript tetap dipasang dari
`package-lock.json`.

Production fallback for the demo (no external services needed after install):

```bash
npm run build
npm start
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Demo flow (7 minutes)

1. **Home** — concept and two workspaces.
2. **Image / Embedding** — choose PNG, write message, set passphrase, download stego.
3. **Image / Extraction** — recover text with the right passphrase, fail safely with the wrong one.
4. **Image / Analysis Lab** — pairwise MSE/PSNR, RGB histogram, enhanced LSB, plus a
   dataset batch (5 images × 3 message sizes = 15 runs) with XLSX export.
5. **Image / Compression Attack** — JPEG Q90/70/50 fragility test, per-row results, XLSX export.
6. **Audio / Embedding & Lossless Test** — WAV embed, FLAC round-trip with PCM integrity.
7. **XLSX** — export from either compression page.

## Format limits

- One upload ≤ 25 MiB.
- PNG: any color type or bit depth, up to 1920×1920 (FHD and smaller).
  Everything is normalized to 8-bit RGB/RGBA for the LSB carrier.
- WAV: any RIFF/RIFX WAVE that wavefile can read (any sample rate, channels,
  integer or float bit depth). Samples are normalized to 16-bit PCM.
- Message: 1–32,768 UTF-8 bytes (further limited by media capacity).
- Passphrase: 12–128 characters.

Files are processed in memory only; there is no database, no history, and no
permanent storage. Refreshing clears the temporary workspace. Authentication is
a placeholder and never stores credentials.

## Architecture

```
src/
  app/               UI routes and /api/* route handlers
  components/        shared UI (layout, forms, media, analysis, feedback)
  features/          embed / extract / analysis / compression flows
  context/           in-memory session
  lib/
    crypto/          PBKDF2 + HKDF, AES-256-GCM, keystream PRNG
    stego/           header v1, LSB bits, keyed positions, capacity
    media/           PNG (sharp), WAV (wavefile), JPEG, FLAC
    analysis/        MSE/PSNR, histogram, LSB plane, audio
    engine/          embed / extract orchestration
    contracts/       types, validation schemas, error contract
    export/          XLSX export
```

The payload format is a 44-byte public header (`SGAE`, v1, KDF/iteration
fields, salt, nonce) embedded sequentially in the first 352 carrier positions,
followed by the encrypted payload spread over the remaining carriers with a
keyed Fisher-Yates shuffle.

## Notes and deviations

- FLAC encode/decode runs in the Node runtime (libflac.js) rather than a
  browser Worker, because bundling the emscripten runtime under Next.js 16 /
  Turbopack proved fragile. This is a documented fallback allowed by the PRD;
  the PCM bit-exact integrity contract is unchanged.

## Team

- Yusuf Abdurrahman — 247006111102
- Subagas Herlambang — 247006111100
- Reza Firmansyah — 247006111114
