# STEGO-AE — Phantom Protocol

*Stay Gold After Encryption — Interactive Steganographic Labyrinth Puzzle Engine.*

A full-stack Next.js game that wraps encrypted steganography (AES-256-GCM +
keyed LSB) in a 15×15 labyrinth puzzle. An interactive Information Security project,
Universitas Siliwangi.

- Build a 15×15 palace in the **Palace Architect**: place an entrance, treasure,
  sequential clue nodes and shadow guards, then hide a message inside each
  clue's PNG/WAV media.
- Infiltrate it in **Phantom Infiltration**: explore a fog-of-war labyrinth,
  solve clues by extracting hidden messages, trigger the alarm, and escape.
- Audit the cryptography in the **Velvet Room**: MSE/PSNR, RGB histograms,
  enhanced LSB, JPEG/FLAC attacks and the 15-run dataset report (XLSX).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · PostgreSQL · Prisma ·
sharp · wavefile · libflac.js · ExcelJS · Vitest.

## Requirements

- Node.js 24 (see `.nvmrc`)
- npm
- PostgreSQL (local dev) or a Railway PostgreSQL URL

## Getting started

```bash
cp .env.example .env      # set DATABASE_URL and AUTH_SECRET (generate with: node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))")
npm install               # runs `prisma generate` via postinstall
npm run db:push           # create the tables (Prisma)
npm run dev
```

Open http://localhost:3000.

### NixOS

The project `flake.nix` provides Node 24 plus `prisma-engines` and sets the
engine env vars. Enter the shell first, then create the database and push:

```bash
nix develop
# (first time) create the database over the Unix socket:
psql -h /run/postgresql -U shiend -d postgres -c "CREATE DATABASE stego_ae;"
npm install
npm run db:push
npm run dev
```

For a local NixOS PostgreSQL over the Unix socket, use:
`DATABASE_URL="postgresql://shiend@localhost:5432/stego_ae?host=/run/postgresql"`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Sync Prisma schema to the database |

## Pages

- `/login` — account sign-in and registration → Palace Lobby.
- `/maps` — list of palaces; infiltrate or create a new one.
- `/builder` — Palace Architect: 15×15 grid, template, nodes, publish.
- `/play/[id]` — Phantom Infiltration: fog of war, clues, alarm chase, victory.
- `/velvet-room` — Forensic audit console (manual attack, pair analysis,
  15-run dataset, XLSX export).

## Crypto engine (reused from the original PRD)

- 44-byte public header (`SGAE`, v1, KDF/iteration fields, salt, nonce) embedded
  in the first 352 carrier positions.
- PBKDF2-SHA256 (600k) → HKDF → `K_enc` (AES-256-GCM) and `K_pos` (position PRNG).
- Fisher-Yates shuffle over the remaining carriers, driven by `K_pos`.
- Payload spread as LSB bits; header authenticated as GCM AAD.

## Architecture

```
src/
  app/               UI routes and /api/* route handlers
  components/        shared UI (layout, forms, media, analysis, feedback)
  features/          builder / game / velvet-room flows
  lib/
    crypto/          PBKDF2 + HKDF, AES-256-GCM, keystream PRNG
    stego/           header v1, LSB bits, keyed positions, capacity
    media/           PNG (sharp), WAV (wavefile), JPEG, FLAC
    analysis/        MSE/PSNR, histogram, LSB plane, audio
    engine/          embed / extract orchestration
    export/          XLSX export
    contracts/       types, validation schemas, error contract
    templates.ts     hardcoded 15×15 labyrinth templates
    db.ts            Prisma client (pg driver adapter)
prisma/schema.prisma Map + ClueNode models
```

## Deploying to Railway

1. Create a PostgreSQL service; copy its `DATABASE_URL`.
2. Set `DATABASE_URL` in the app's environment.
3. Build runs `prisma generate` via `postinstall`; run `npm run db:push`
   (or `prisma migrate deploy`) once to create tables.

## Notes

- FLAC encode/decode runs in the Node runtime (libflac.js), not a browser
  Worker — a documented fallback; the PCM bit-exact contract is unchanged.
- Media (cover + stego) is stored as binary in the database, so Railway's
  ephemeral filesystem is not a concern.

## Team

- Yusuf Abdurrahman — 247006111102
- Subagas Herlambang — 247006111100
- Reza Firmansyah — 247006111114
