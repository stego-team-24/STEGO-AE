# STEGO-AE — Phantom Protocol

> **Stay Gold After Encryption** — An interactive steganographic labyrinth puzzle engine built as an Information Security project at Universitas Siliwangi.

STEGO-AE is a full-stack web application that combines **authenticated encryption** (AES-256-GCM) with **Least Significant Bit (LSB) steganography** to hide secret messages inside image and audio files. Players must locate hidden messages inside media files embedded in a fog-of-war labyrinth to complete the game.

---

## Features

| Feature | Description |
|---|---|
| **Palace Architect** | Build a custom labyrinth: place an entrance, treasure, clue nodes, and shadow guards. Embed a secret message into each clue's PNG/WAV media. |
| **Phantom Infiltration** | Explore the labyrinth under fog-of-war. Extract hidden messages from media files to unlock clues, survive guard detection, and reach the treasure. |
| **Velvet Room** | Forensic audit console: MSE/PSNR quality metrics, RGB histograms, LSB plane visualisation, JPEG/WebP/FLAC/MP3 compression tests, and XLSX report export. |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Crypto**: Node.js built-in `crypto` (PBKDF2, HKDF, AES-256-GCM)
- **Media**: `sharp` (PNG/JPEG), `wavefile` (WAV), `libflac.js` (FLAC), `lamejs` (MP3)
- **Testing**: Vitest

---

## Prerequisites

Make sure the following are installed on your computer before proceeding:

| Software | Version | How to check |
|---|---|---|
| **Node.js** | v24 or later | `node --version` |
| **npm** | v10 or later | `npm --version` |
| **PostgreSQL** | v14 or later | `psql --version` |

> **Tip:** If you don't have Node.js v24, install [nvm](https://github.com/nvm-sh/nvm) then run `nvm install 24 && nvm use 24`.

---

## Installation & Running Locally

### Step 1 — Clone the repository

```bash
git clone https://github.com/stego-team-24/STEGO-AE.git
cd STEGO-AE
```

### Step 2 — Set up environment variables

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in the two required values:

```env
# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/STEGO-AE"

# Random 64-character hex string used to sign session cookies
# Generate one by running the command below:
AUTH_SECRET="paste-your-generated-secret-here"
```

**Generate a secure `AUTH_SECRET`:**

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the value of `AUTH_SECRET` in your `.env` file.

**Create a PostgreSQL database (if you haven't already):**

```bash
# Open PostgreSQL prompt
psql -U postgres

# Inside the prompt:
CREATE DATABASE STEGO_AE;
\q
```

### Step 3 — Install dependencies

```bash
npm install
```

> This also auto-generates the Prisma client via the `postinstall` script.

### Step 4 — Create the database tables

```bash
npm run db:push
```

### Step 5 — Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Register a new account on the login page, then start building a palace from the Maps page.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server at `http://localhost:3000` |
| `npm run build` | Build the production bundle |
| `npm start` | Serve the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint code quality checks |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:push` | Sync Prisma schema to the PostgreSQL database |

---

## Application Pages

| Route | Description |
|---|---|
| `/login` | Account sign-in and registration |
| `/maps` | Palace lobby — list of available labyrinths |
| `/builder` | Palace Architect — create and publish a new labyrinth |
| `/play/[id]` | Phantom Infiltration — play a specific labyrinth |
| `/velvet-room` | Forensic console — analyse and audit media files |

---

## Cryptography & Steganography

All crypto is implemented using **Node.js built-in `crypto` module** only — no third-party crypto library.

### Step 1 — Key Derivation

A passphrase typed by the user is never used directly as a key. Instead, it is stretched and split into two separate keys:

```
Passphrase (user input)
       │
       ▼
PBKDF2-SHA256 — 600,000 iterations, 16-byte random salt
       │         (deliberately slow to resist brute-force attacks)
       ▼
  master key (32 bytes)
       │
       ├─── HKDF-SHA256("stego-ae/v1/encryption") ──→  K_enc
       │                                               AES-256-GCM encryption key
       │
       └─── HKDF-SHA256("stego-ae/v1/positions")  ──→  K_pos
                                                        PRNG seed for pixel shuffle
```

### Step 2 — Message Encryption (AES-256-GCM)

Before any bit is written into the image, the plaintext message is fully encrypted:

```
Plaintext message
       │
       ▼
AES-256-GCM (K_enc, 12-byte random nonce)
       │
       ├──→ ciphertext  (same length as plaintext)
       └──→ auth tag    (16 bytes) — detects tampering or wrong passphrase
```

The 44-byte **public header** (magic `SGAE`, version, salt, nonce, message length) is authenticated as GCM AAD — it cannot be modified without breaking the tag, even though it is not encrypted.

### Step 3 — Carrier Position Shuffle (PRNG)

K_pos seeds a deterministic **HMAC-SHA256 counter PRNG**, which drives a **Fisher-Yates shuffle** over the available LSB positions in the carrier file. This means:
- Bits are scattered non-sequentially across the entire image/audio
- Without the correct passphrase, an attacker cannot know *which* pixels carry secret bits
- The same passphrase always reproduces the same shuffle (embed and extract agree)

### Step 4 — LSB Embedding

```
Carrier file (PNG pixels or WAV samples)
       │
       ▼
  First 352 positions  →  header bits  (sequential, not shuffled)
  Remaining positions  →  ciphertext + auth tag bits  (Fisher-Yates order)
       │
  Each bit replaces the Least Significant Bit of one pixel channel
  (1 bit per carrier → PSNR impact is minimal, typically > 50 dB)
```

### Capacity & Safety Checks

Before embedding, the engine calculates maximum capacity and **rejects** any message that exceeds it:

```
Raw capacity  = floor(total_carrier_count / 8)  bytes
Net capacity  = raw_capacity − 44 (header) − 16 (GCM tag)  bytes

If message_bytes > net_capacity → HTTP 422 CAPACITY_EXCEEDED
```

### Compliance with Lecturer Requirements

| Requirement | Implementation |
|---|---|
| LSB on PNG (or BMP) | ✅ PNG via `sharp`, WAV PCM-16 |
| Header marking message length | ✅ 44-byte `SGAE` header at first 352 LSB positions |
| Pixel positions randomised with PRNG + stego-key | ✅ HMAC-SHA256 counter PRNG seeded from K_pos (derived from passphrase + salt) |
| Message encrypted before embedding | ✅ AES-256-GCM (stronger than XOR) |
| Capacity check with rejection | ✅ HTTP 422 returned if message exceeds net capacity |
| Cover & stego displayed side by side | ✅ Velvet Room Forensic Console |
| PSNR & MSE on ≥ 5 images × 3 message sizes | ✅ Batch analysis in Velvet Room, XLSX export |
| Histogram comparison cover vs stego | ✅ RGB histogram visualisation per channel |
| Fragility test: extraction after image/audio re-save | ✅ JPEG/WebP and FLAC/MP3 compression pipelines with extraction result |
| Enhanced LSB visualisation | ✅ LSB plane view (per-channel) in Velvet Room |
| Audio WAV support (bonus) | ✅ WAV PCM-16 embed/extract + waveform analysis |

For the full protocol specification see [`docs/ALUR-KRIPTOGRAFI.md`](docs/ALUR-KRIPTOGRAFI.md) and [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md).

---

## Project Structure

```
src/
├── app/               Next.js routes and /api/* REST endpoints
├── components/        Reusable UI components (layout, forms, charts)
├── features/          Page-level feature components (builder, game, velvet-room)
└── lib/
    ├── crypto/        PBKDF2 + HKDF, AES-256-GCM, HMAC-SHA256 PRNG
    ├── stego/         44-byte header, LSB bit I/O, keyed shuffle, capacity
    ├── media/         PNG (sharp), WAV (wavefile), JPEG/WebP, FLAC, MP3
    ├── analysis/      MSE/PSNR, histogram, LSB plane visualisation
    ├── engine/        Embed and extract orchestration
    ├── export/        XLSX report generation (ExcelJS)
    └── contracts/     Shared TypeScript types, schemas, and error definitions

prisma/
└── schema.prisma      Database schema (Map, ClueNode, User, ClueSolve, GameResult)

tests/                 Unit tests (Vitest) — 32 tests across 7 modules
```

---

## Deployment (Railway)

1. Create a new PostgreSQL service on [Railway](https://railway.app) and copy the `DATABASE_URL`.
2. Create a new web service and connect your GitHub repository.
3. Set the following environment variables in Railway:
   - `DATABASE_URL` — from the Railway PostgreSQL service
   - `AUTH_SECRET` — generated with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
4. After the first deploy, push the database schema:
   ```bash
   npm run db:push
   ```

---

## Running on NixOS / nixpkgs

The repository ships a `flake.nix` that provides the exact Node.js version and all Prisma engine binaries. No manual installation of Node or Prisma engines is needed.

```bash
# Enter the Nix dev shell (downloads dependencies automatically)
nix develop

# First-time only: create the database
psql -U postgres -c "CREATE DATABASE STEGO_AE;"

# Then follow the normal steps
cp .env.example .env   # fill in DATABASE_URL and AUTH_SECRET
npm install
npm run db:push
npm run dev
```

**`DATABASE_URL` for a local NixOS PostgreSQL (Unix socket):**

```env
DATABASE_URL="postgresql://YOUR_UNIX_USER@localhost:5432/STEGO-AE?host=/run/postgresql"
```

Replace `YOUR_UNIX_USER` with your NixOS username (the one that owns the PostgreSQL socket).

---

## Team

| Name | NIM |
|---|---|
| Yusuf Abdurrahman | 247006111102 |
| Subagas Herlambang | 247006111100 |
| Reza Firmansyah | 247006111114 |

**Course:** Information Security · Universitas Siliwangi · Semester 5 · 2025/2026
