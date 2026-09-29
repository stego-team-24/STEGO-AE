# STEGO-AE — Phantom Protocol

*Stay Gold After Encryption — Interactive Steganographic Labyrinth Puzzle Engine.*

A full-stack Next.js application that wraps **encrypted steganography**
(AES-256-GCM + keyed LSB) inside a 15×15 labyrinth puzzle game. It hides a
secret message inside PNG images or WAV audio, then turns the whole thing into
a playable infiltration mission — with a forensic console for quantitative
academic evidence.

---

## Table of contents

1. [Description](#description)
2. [Glossary](#glossary)
3. [System flow](#system-flow)
4. [Requirements](#requirements)
5. [Installation](#installation)
6. [Running the app](#running-the-app)
7. [Usage examples](#usage-examples)
8. [Deployment](#deployment)
9. [Testing](#testing)
10. [Team](#team)

---

## Description

STEGO-AE (Phantom Protocol) is built for the **Information Security** course
project (Topik B: LSB steganography with encryption). It satisfies the full
technical checklist:

| Requirement | Implementation |
|---|---|
| LSB embedding/extraction on PNG (or BMP) | LSB on PNG RGB channels |
| Message-length header so extraction stops exactly | 44-byte header with `ciphertextBytes` |
| Pixel positions shuffled with a PRNG seeded from the stego-key | HMAC-SHA256 keystream + Fisher-Yates |
| Message encrypted before embedding (AES) | AES-256-GCM |
| Capacity calculation + over-capacity rejection | `capacity.ts` + HTTP 422 |
| Cover and stego side-by-side | Builder result + Velvet Room pair analysis |
| PSNR/MSE on ≥5 images × 3 message sizes | Velvet Room "15-run dataset" |
| Cover vs stego histogram | Velvet Room RGB histogram |
| Fragility test (re-save as JPEG) | Velvet Room JPEG Q90/70/50 attack |
| Enhanced LSB visual steganalysis | Velvet Room LSB plane |
| Bonus (at least one) | WAV audio + FLAC lossless test |

The application is a **game**:

- **`/login`** — visual auth gate (bypass enabled for the demo).
- **`/maps`** — palace lobby: list of saved maps.
- **`/builder`** — *Palace Architect*: design a 15×15 labyrinth, place an
  entrance, treasure, sequential clue nodes and shadow guards, and hide a
  message inside each clue's media.
- **`/play/[id]`** — *Phantom Infiltration*: explore a fog-of-war labyrinth,
  solve clues by extracting hidden messages, trigger the alarm and escape.
- **`/velvet-room`** — *Forensic Audit Console*: MSE/PSNR, histogram, LSB
  plane, JPEG/FLAC attacks, the 15-run dataset report and XLSX export.

---

## Glossary

| Term | Meaning |
|---|---|
| **Plaintext** | The original secret message (e.g. a navigation hint). |
| **Cover media** | The original PNG/WAV file before anything is hidden in it. |
| **Ciphertext** | The message after encryption — random, unreadable bytes. |
| **Stego-key / passphrase** | The password typed in the UI. It both locks the message and seeds the position shuffle. |
| **Stego media** | The final PNG/WAV with the hidden message inside. |
| **Carrier** | One embeddable unit: a color channel (image) or a PCM sample (audio). |
| **LSB** | Least Significant Bit — the rightmost bit, the one we overwrite. |

---

## System flow

### Embedding (write a message)

1. **Key derivation (KDF).** The passphrase and a fresh 16-byte **salt** are
   fed through **PBKDF2-SHA256** (600,000 iterations) into a 32-byte master
   key. HKDF-SHA256 then derives two sub-keys: `K_enc` (encryption) and
   `K_pos` (position shuffle).
2. **Encryption.** The message is encrypted with **AES-256-GCM** using `K_enc`
   and a fresh 12-byte **nonce (IV)**. This produces two things:
   - **Ciphertext** — the scrambled, unreadable message.
   - **Auth tag** — a 16-byte "digital fingerprint" (like a wax seal). When
     extracting, the app recomputes it; if even one bit was changed, or the
     passphrase is wrong, the seal no longer matches and the app refuses to show
     anything.

3. **Header.** A 44-byte "identity card" is placed in front of the ciphertext.
   It stores plain (readable) metadata so the reader knows how to decrypt:

   - **Magic** (`SGAE`) — a signature proving this file holds a STEGO-AE payload.
   - **Version** — the payload format version (1).
   - **Media type** — 1 = PNG, 2 = WAV.
   - **KDF id** — which key-derivation is used (1 = PBKDF2-SHA256).
   - **Flags** — reserved, always 0.
   - **Iterations** — how many PBKDF2 rounds were used (600,000).
   - **Ciphertext length** — the exact byte length of the encrypted message, so
     extraction knows precisely where to stop.
   - **Salt** (16 bytes) and **Nonce / IV** (12 bytes) — the random values used
     in steps 1 and 2, stored so extraction can rebuild the same keys.

   Fixed overhead = 44-byte header + 16-byte auth tag = **60 bytes**.

4. **Embedding into the media.** The header is 44 bytes = **352 bits**
   (44 × 8). Each bit is hidden in one *carrier* — a color channel of one pixel
   (image) or one audio sample (WAV). So the header occupies the first
   **352 carriers**. The rest of the payload (ciphertext + auth tag) is then
   scattered bit-by-bit across the remaining carriers, in an order decided by
   `K_pos` (a Fisher-Yates shuffle), so nothing is stored sequentially.

### Extraction (reading a message)

1. Load the media and rebuild the list of carriers.
2. Rebuild the same shuffle from the passphrase (same KDF → same `K_pos`).
3. Read the first 352 carriers to recover the 44-byte header.
4. Check the `SGAE` magic, version, KDF id and iterations. If any is wrong, the
   file is not a valid STEGO-AE payload and extraction stops immediately.
5. Derive `K_enc` / `K_pos` from the passphrase + the salt in the header.
6. Rebuild the shuffle and gather the ciphertext + auth tag bits.
7. Decrypt with AES-256-GCM and verify the auth tag. If the passphrase is wrong
   or the media was damaged, verification fails and nothing is shown.
8. The recovered plaintext appears only after the auth tag passes.

### Image vs audio

The cryptographic pipeline is **identical** for both media. Only the carrier
and the bit target differ:

| | PNG image | WAV audio |
|---|---|---|
| Where a bit is hidden | last bit of a color channel (R/G/B) of one pixel | last bit of one PCM sample |
| Bits per spot | 1 bit (LSB) | 1 bit (LSB) |
| PSNR "peak" value | 255 (max 8-bit color) | 32768 (max 16-bit sample) |
| Fragility test | JPEG (lossy) → extraction FAIL | FLAC (lossless) → extraction PASS |

A WAV file is a stream of **PCM samples** — numbers representing the sound wave
amplitude (e.g. 44,100 numbers per second for a 44.1 kHz file). A 16-bit sample
is an integer from −32768 to +32767; we hide one bit in its last (least
significant) bit.

**What is PSNR's "peak"?** PSNR measures how much the media changed (higher =
better) using `PSNR = 10 × log10(peak² / MSE)`. The *peak* is simply the largest
value a pixel/sample can have: 255 for 8-bit images, 32768 for 16-bit audio.
Changing only the last bit gives PSNR around 50–70 dB (image) or ~110 dB (audio).

PNG input is normalized to 8-bit RGB/RGBA (up to 1920×1920); WAV input is
normalized to 16-bit PCM (any sample rate / channel count / bit depth).

---

## Requirements

- **Node.js 24**
- **npm**
- **PostgreSQL** (local development) or a **Railway** PostgreSQL URL

---

## Installation

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd stego-ae
npm install               # runs `prisma generate` via postinstall
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `DATABASE_URL` — your PostgreSQL connection string.
- `AUTH_SECRET` — a random secret for auth/session signing. Generate one with:

  ```bash
  openssl rand -base64 32
  ```

  (or, if `openssl` is not installed:
  `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

### 3. Create the database and push the schema

```bash
npm run db:push          # = prisma db push (creates the Map / ClueNode tables)
```

> If the automatic `prisma generate` (postinstall) is skipped on your machine,
> run it manually:
> ```bash
> npm run db:generate     # = prisma generate
> ```

---

## Running the app

Development server:

```bash
npm run dev
```

Open **http://localhost:3000**.

Production build (offline demo fallback — no external service needed after
install, apart from PostgreSQL):

```bash
npm run build
npm start
```

---

## Usage examples

### Example 1 — Build a palace and hide a message

1. Open `/login` → click **Enter Palace Lobby →**.
2. Click **Create New Palace →** to open `/builder`.
3. Pick a labyrinth template (e.g. *The Crossing*).
4. Use the placement tools: click the grid to place the **Entrance**, the
   **Treasure**, a few **Shadows**, and two **Clue** nodes.
5. For each clue, fill the hidden message (navigation hint + next passphrase),
   a passphrase (≥12 chars), and upload a cover PNG/WAV.
6. Click **Publish & Hide Payload**. The server encrypts each message
   (AES-256-GCM), embeds it (keyed LSB), computes PSNR/MSE, and stores the map
   in PostgreSQL.

### Example 2 — Infiltrate a palace

1. On `/maps`, click **Infiltrate Palace →** on a map.
2. Explore the fog-of-war grid (arrow keys / WASD, or click adjacent tiles).
3. Step onto a clue node → enter the passphrase → the hidden message is
   extracted and revealed.
4. After solving every clue, reach the treasure to trigger the alarm, then
   escape back to the entrance before the guards catch you (3 HP).

### Example 3 — Produce the forensic evidence

1. Open `/velvet-room`.
2. **Manual test console** — upload a stego PNG + passphrase, run the
   JPEG Q90/70/50 attack, and observe that extraction fails (fragility proof).
   Export the results to XLSX.
3. **Pair analysis** — upload a cover PNG and its stego PNG to see MSE/PSNR,
   the RGB histogram overlay and the enhanced LSB plane.
4. **Quick batch audit** — upload 5 cover images and run the 15-run dataset
   test (5 images × 3 message sizes) for the required PSNR/MSE table.

---

## Deployment

### Local (generic Linux / macOS / Windows)

```bash
# 1. Start PostgreSQL and create a database
createdb stego_ae

# 2. Configure DATABASE_URL + a random AUTH_SECRET
echo 'DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/stego_ae"' > .env
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# 3. Build and run
npm install            # postinstall runs `prisma generate`
npm run db:push
npm run build
npm start
```

### Railway

1. Create a **PostgreSQL** service and copy its `DATABASE_URL`.
2. In the app service environment variables, set `DATABASE_URL` and add
   `AUTH_SECRET` (generate one locally with `openssl rand -base64 32`).
3. Deploy the repository. The build step runs `prisma generate` (via
   `postinstall`).
4. Run `npm run db:push` once (or `prisma migrate deploy`) to create the tables.

### NixOS / Nixpkgs

`nix develop` does the heavy lifting — Node 24, `prisma-engines` and the engine
environment variables are already configured in `flake.nix`.

```bash
# 1. Enter the shell
nix develop

# 2. First time only: create the database and write .env
psql -h /run/postgresql -U shiend -d postgres -c "CREATE DATABASE stego_ae;"
echo 'DATABASE_URL="postgresql://shiend@localhost:5432/stego_ae?host=/run/postgresql"' > .env
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env

# 3. Install and run
npm install
npm run db:push
npm run dev
```

---

## Testing

```bash
npm test               # unit tests (Vitest)
npm run lint           # ESLint
npm run typecheck      # TypeScript
```

The unit suite covers: AES-GCM round-trip + tamper rejection, KDF determinism,
PRNG determinism, header encode/decode + length overflow, capacity N vs N+1,
shuffle permutation, PNG RGB/RGBA round-trip, WAV (incl. float) normalization,
FLAC PCM bit-exact round-trip, image/audio metrics and XLSX export.

---

## Team

| Name | NPM |
|---|---|
| Yusuf Abdurrahman | 247006111102 |
| Subagas Herlambang | 247006111100 |
| Reza Firmansyah | 247006111114 |

Informatika · Universitas Siliwangi
