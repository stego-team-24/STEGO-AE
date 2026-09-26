"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "en" | "id";

const idText: Record<string, string> = {
  "Palace Lobby": "Lobi Istana",
  Architect: "Arsitek",
  "Velvet Room": "Velvet Room",
  "LOG OUT": "KELUAR",
  "PHANTOM THIEVES · PALACE NETWORK": "PHANTOM THIEVES · JARINGAN ISTANA",
  "Choose your infiltration.": "Pilih target infiltrasi.",
  "SELECT YOUR INFILTRATION TARGET": "PILIH TARGET INFILTRASI",
  "CREATE PALACE": "BUAT ISTANA",
  "PALACES CLEARED": "ISTANA DITAKLUKKAN",
  "unique palaces escaped": "istana berhasil diloloskan",
  "CLUES RECOVERED": "PETUNJUK DITEMUKAN",
  "across all palaces": "dari semua istana",
  "BEST AUDIT RANK": "PERINGKAT AUDIT TERBAIK",
  "personal best": "rekor pribadi",
  "PALACE NETWORK": "JARINGAN ISTANA",
  "Shared community maps · Your progress stays private": "Peta komunitas bersama · progres Anda tetap privat",
  "NETWORK NOTICE": "INFO JARINGAN",
  "Palace layouts and clue media are shared. Your recovered messages, completion times, and personal records are attached to your account.": "Tata letak istana dan media petunjuk dibagikan. Pesan yang ditemukan, waktu penyelesaian, dan rekor pribadi tersimpan di akun Anda.",
  "ALL": "SEMUA",
  EASY: "MUDAH",
  MEDIUM: "SEDANG",
  HARD: "SULIT",
  ELITE: "ELIT",
  "PALACES IN NETWORK": "ISTANA DI JARINGAN",
  "No palaces match this filter.": "Tidak ada istana yang cocok dengan filter ini.",
  "Choose another difficulty to browse the network.": "Pilih tingkat kesulitan lain untuk melihat jaringan.",
  "DESIGNED BY": "DIBUAT OLEH",
  "CLUE NODES": "TITIK PETUNJUK",
  "NOT YET CLEARED": "BELUM DITAKLUKKAN",
  CLEARED: "DITAKLUKKAN",
  REPLAY: "ULANGI",
  INFILTRATE: "INFILTRASI",
  "Design the labyrinth.": "Rancang labirinnya.",
  "Palace Architect": "Arsitek Istana",
  "Choose a template, place the entrance, treasure, clues and shadows, then hide a message inside each clue's media.": "Pilih templat, tempatkan pintu masuk, harta, petunjuk, dan bayangan, lalu sembunyikan pesan di media setiap petunjuk.",
  "Palace Details": "Detail Istana",
  "Maze Base Template": "Templat Dasar Labirin",
  "Clue Node Editor": "Editor Titik Petunjuk",
  "Map editing tools": "Alat penyunting peta",
  Entrance: "Pintu Masuk",
  Treasure: "Harta",
  Shadow: "Bayangan",
  "Clue node": "Titik petunjuk",
  Wall: "Tembok",
  Floor: "Lantai",
  "Palace title": "Nama istana",
  "Author name": "Nama pembuat",
  "Entrance briefing · reveals clue 1 password": "Pengarahan pintu masuk · mengungkap kata sandi petunjuk 1",
  "Blank template": "Templat kosong",
  "Spiral Descent": "Turunan Spiral",
  "Cross Corridors": "Koridor Silang",
  "Zigzag Maze": "Labirin Zigzag",
  "Dungeon Classic": "Ruang Bawah Tanah Klasik",
  "Radial Web": "Jaring Radial",
  "Serpentine Path": "Jalur Berkelok",
  "NEW PALACE DESIGN": "DESAIN ISTANA BARU",
  "ACTIVE TOOL: FLOOR": "ALAT AKTIF: LANTAI",
  "Save Palace Map": "Simpan Peta Istana",
  "Hiding payloads…": "Menyembunyikan payload…",
  "Select a clue tile or choose the Clue tool and place a node on the canvas.": "Pilih petak petunjuk atau pilih alat Petunjuk lalu tempatkan titik pada kanvas.",
  "Encrypted payload": "Payload terenkripsi",
  "Stego key · optional · 128 chars max": "Kunci stego · opsional · maks. 128 karakter",
  "Cover image · PNG": "Gambar sampul · PNG",
  "Cover audio · WAV": "Audio sampul · WAV",
  "Source media · preserved": "Media sumber · dipertahankan",
  "Inspecting carrier capacity…": "Memeriksa kapasitas media…",
  "Live LSB capacity": "Kapasitas LSB saat ini",
  "Stego payload embeds on publish after file selection.": "Payload stego disisipkan saat peta diterbitkan setelah berkas dipilih.",
  Remove: "Hapus",
  "Forensic audit console.": "Konsol audit forensik.",
  "VELVET ROOM": "VELVET ROOM",
  "Manual test console": "Konsol uji manual",
  "Apply a lossy/lossless attack to a stego media and verify extraction.": "Terapkan kompresi lossy/lossless pada media stego dan periksa hasil ekstraksinya.",
  "Palace Architect · Phantom Protocol": "Arsitek Istana · Phantom Protocol",
  "Velvet Room · Phantom Protocol": "Velvet Room · Phantom Protocol",
  "STEGO-AE — Phantom Protocol": "STEGO-AE — Phantom Protocol",
  "Choose an asset from a palace…": "Pilih aset dari istana…",
  "Loading palace assets…": "Memuat aset istana…",
  "Select a clue asset…": "Pilih aset petunjuk…",
  "Upload stego PNG or WAV": "Unggah stego PNG atau WAV",
  Passphrase: "Kata sandi",
  Hide: "Sembunyikan",
  Show: "Tampilkan",
  "Original file · preserved": "Berkas asli · dipertahankan",
  "Check original decryption": "Periksa dekripsi berkas asli",
  "Check the unmodified file first to establish the baseline.": "Periksa berkas asli terlebih dahulu sebagai pembanding awal.",
  "Checking…": "Memeriksa…",
  "Decrypt original": "Dekripsi berkas asli",
  "Compression format": "Format kompresi",
  "Compressing…": "Mengompres…",
  Compress: "Kompres",
  "Compressed output · original kept above": "Hasil kompresi · berkas asli tetap di atas",
  "Restore to PNG": "Kembalikan ke PNG",
  "Restore to WAV": "Kembalikan ke WAV",
  "Restoring…": "Memulihkan…",
  "Restored output": "Hasil pemulihan",
  "Decrypt restored file": "Dekripsi berkas hasil pemulihan",
  "Decrypting…": "Mendekripsi…",
  "Decrypt restored media": "Dekripsi media hasil pemulihan",
  "Export XLSX report": "Ekspor laporan XLSX",
  "Download restored file": "Unduh berkas hasil pemulihan",
  "Pair analysis": "Analisis pasangan",
  "Choose palace map…": "Pilih peta istana…",
  "Select one image clue (raw + stego paired)…": "Pilih petunjuk gambar (raw + stego berpasangan)…",
  "Raw cover vs original stego": "Sampul raw vs stego asli",
  "Raw cover vs stego after compression": "Sampul raw vs stego setelah kompresi",
  "Original stego vs stego after compression": "Stego asli vs stego setelah kompresi",
  "Or upload a pair": "Atau unggah sepasang berkas",
  "Choose cover PNG": "Pilih PNG sampul",
  "Choose stego PNG": "Pilih PNG stego",
  "Choose raw cover WAV": "Pilih WAV sampul raw",
  "Choose stego WAV": "Pilih WAV stego",
  "Image analysis": "Analisis gambar",
  "Audio analysis": "Analisis audio",
  "Analyze image": "Analisis gambar",
  "Analyze audio": "Analisis audio",
  "Analyzing…": "Menganalisis…",
  "Preparing comparison…": "Menyiapkan perbandingan…",
  "Preparing audio preview…": "Menyiapkan pratinjau audio…",
  "Choose palace": "Pilih istana",
  "Upload custom assets": "Unggah aset sendiri",
  "Choose palace to audit…": "Pilih istana untuk diaudit…",
  "Palace asset audit": "Audit aset istana",
  "Raw cover": "Sampul raw",
  "Original stego": "Stego asli",
  "Compressed stego": "Stego terkompresi",
  "Combined RGB histogram": "Histogram RGB gabungan",
  "Enhanced LSB · grayscale channel planes": "LSB diperjelas · kanal grayscale",
  "Changed PCM samples": "Sampel PCM berubah",
  "Mean absolute sample delta": "Rata-rata selisih absolut sampel",
  "Maximum sample delta": "Selisih maksimum sampel",
  "PCM identical": "PCM identik",
  "Audio comparison over time": "Perbandingan audio sepanjang waktu",
  "Signal level (RMS)": "Level sinyal (RMS)",
  "Samples changed per time bucket": "Sampel berubah per interval waktu",
  "Start": "Awal",
  "End": "Akhir",
  "Download": "Unduh",
  "Click to expand": "Klik untuk memperbesar",
  "Close ✕": "Tutup ✕",
  "Loading palace…": "Memuat istana…",
  "Infiltration complete.": "Infiltrasi selesai.",
  "You escaped the palace with the treasure.": "Anda berhasil kabur dari istana membawa harta.",
  "Wrong passphrases": "Kata sandi salah",
  "Times caught": "Kali tertangkap",
  "Saving your result…": "Menyimpan hasil…",
  "Open Velvet Room →": "Buka Velvet Room →",
  "Back to Lobby": "Kembali ke Lobi",
  "Mission failed.": "Misi gagal.",
  "You were caught too many times.": "Anda terlalu sering tertangkap.",
  "Treasure chase active — escape to entrance before guards converge!": "Bayangan mengejar — kabur ke pintu masuk sebelum mereka mengepung!",
  "Alarm active — escape to the entrance!": "Alarm aktif — kabur ke pintu masuk!",
  "Solve every clue, then reach the treasure.": "Pecahkan semua petunjuk, lalu temukan harta.",
  "Solve clues, find the treasure.": "Pecahkan petunjuk dan temukan harta.",
  "Movement pad": "Panel gerak",
  Clues: "Petunjuk",
  Objective: "Tujuan",
  "Tile types": "Jenis petak",
  "Entrance briefing": "Pengarahan pintu masuk",
  "Your first lead": "Petunjuk pertama",
  "Begin infiltration": "Mulai infiltrasi",
  "Enter this clue’s passphrase, or leave it blank if no key was set.": "Masukkan kata sandi petunjuk ini, atau biarkan kosong jika tidak ada kunci.",
  "Recovered message": "Pesan ditemukan",
  "Click image to enlarge": "Klik gambar untuk memperbesar",
  "Extract message": "Ekstrak pesan",
  "Move one tile with arrow keys or WASD. Click adjacent tiles. Space / Enter activates Navigator.": "Bergerak satu petak dengan tombol panah atau WASD. Klik petak di sebelah. Spasi / Enter mengaktifkan Navigator.",
  "Navigator · Space / Enter": "Navigator · Spasi / Enter",
  "Navigator…": "Navigator…",
  "Treasure found. Escape to the entrance.": "Harta ditemukan. Kabur ke pintu masuk.",
  "Unexplored tile": "Petak belum dijelajahi",
  "Your position": "Posisi Anda",
  "PHANTOM THIEVES · ACCESS TERMINAL": "PHANTOM THIEVES · TERMINAL AKSES",
  "Create your account": "Buat akun",
  "Welcome back": "Selamat datang kembali",
  "Display name": "Nama tampilan",
  "Email address": "Alamat email",
  Password: "Kata sandi",
  "Your name": "Nama Anda",
  "Your password": "Kata sandi Anda",
  "At least 6 characters": "Minimal 6 karakter",
  "Sign in": "Masuk",
  "Create account": "Buat akun",
  "Already have an account?": "Sudah punya akun?",
  "New to STEGO-AE?": "Baru di STEGO-AE?",
  "Accounts are private. Your password is stored as a one-way hash.": "Akun bersifat privat. Kata sandi disimpan sebagai hash satu arah.",
  "Infiltrate the labyrinth. Decrypt the payload. Escape before you’re detected.": "Masuki labirin. Dekripsi payload. Kabur sebelum tertangkap.",
  "STAY GOLD AFTER ENCRYPTION": "TETAP EMAS SETELAH ENKRIPSI",
  "Solid: cover · translucent: stego": "Penuh: sampul · transparan: stego",
  "Pixel intensity (0–255)": "Intensitas piksel (0–255)",
  "Red": "Merah",
  Green: "Hijau",
  Blue: "Biru",
  "Enter the passphrase": "Masukkan kata sandi",
  "Show password": "Tampilkan kata sandi",
  "Hide password": "Sembunyikan kata sandi",
  "SYS:STEGO-AE · SECURE NETWORK": "SYS:STEGO-AE · JARINGAN AMAN",
  "STEGO-AE · SECURE ACCESS": "STEGO-AE · AKSES AMAN",
  "PROTOCOL": "PROTOKOL",
  "WELCOME BACK": "SELAMAT DATANG KEMBALI",
  "CREATE YOUR ACCOUNT": "BUAT AKUN ANDA",
  "you@example.com": "anda@contoh.com",
  "SHOW": "TAMPILKAN",
  "HIDE": "SEMBUNYIKAN",
  "PALACE NETWORK AUTHENTICATED ACCESS": "AKSES TEROTENTIKASI JARINGAN ISTANA",
  "PNG IMAGE": "GAMBAR PNG",
  "WAV AUDIO": "AUDIO WAV",
  "✓ CLEARED": "✓ DITAKLUKKAN",
  "○ NOT YET CLEARED": "○ BELUM DITAKLUKKAN",
  "BEST": "TERBAIK",
  "PTS": "POIN",
  "GRID": "PETAK",
  "USED": "TERPAKAI",
  "assets": "aset",
  "asset": "aset",
  "CLUE": "PETUNJUK",
  "WALL": "TEMBOK",
  "FLOOR": "LANTAI",
  "GUARD": "PENJAGA",
  "Publish Palace": "Terbitkan Istana",
  "Publishing…": "Menerbitkan…",
  "Saving…": "Menyimpan…",
  "Place the entrance, treasure, and at least one clue.": "Tempatkan pintu masuk, harta, dan minimal satu petunjuk.",
  "Choose image": "Pilih gambar",
  "Choose audio": "Pilih audio",
  "Drop PNG / click to browse": "Letakkan PNG / klik untuk memilih",
  "Drop WAV / click to browse": "Letakkan WAV / klik untuk memilih",
  "PALACE RANK": "PERINGKAT ISTANA",
  "points": "poin",
  "Wrong attempts": "Percobaan salah",
  "You": "Anda",
  "Guard": "Penjaga",
  "Unexplored": "Belum dijelajahi",
  "Attempts:": "Percobaan:",
  "— hint revealed, you can keep trying": "— petunjuk terbuka, Anda masih bisa mencoba",
  "Close": "Tutup",
  "Manual test": "Uji manual",
  "Attack & fragility tester": "Penguji serangan dan ketahanan",
  "Attack & Fragility Tester": "Penguji Serangan dan Ketahanan",
  "Compare the original cover and stego against each other and against every JPEG/WebP or FLAC/MP3 restored result.": "Bandingkan sampul asli dan stego satu sama lain, serta dengan setiap hasil pemulihan JPEG/WebP atau FLAC/MP3.",
  "JPEG compression": "Kompresi JPEG",
  "WEBP compression": "Kompresi WEBP",
  "FLAC compression": "Kompresi FLAC",
  "MP3 compression": "Kompresi MP3",
  "Original cover": "Sampul asli",
  "Embedded stego": "Stego tertanam",
  "Stego after JPEG": "Stego setelah JPEG",
  "Stego after WebP": "Stego setelah WebP",
  "Stego after FLAC": "Stego setelah FLAC",
  "Stego after MP3": "Stego setelah MP3",
  "Analyze image · ORIGINAL PAIR": "Analisis gambar · PASANGAN ASLI",
  "Analyze audio · ORIGINAL PAIR": "Analisis audio · PASANGAN ASLI",
  "MSE": "MSE",
  "PSNR": "PSNR",
  "IDENTICAL": "IDENTIK",
  "Extraction: PASS": "Ekstraksi: BERHASIL",
  "Baseline: PASS": "Awal: BERHASIL",
  "PCM identical: yes": "PCM identik: ya",
  "PCM identical: no": "PCM identik: tidak",
  "Choose stego PNG or WAV files": "Pilih berkas stego PNG atau WAV",
  "custom file(s) selected": "berkas kustom dipilih",
  "View image fullscreen": "Lihat gambar layar penuh",
  "Playback uses a complete WAV decode of this FLAC; download above is the original FLAC.": "Pemutaran menggunakan hasil dekode WAV lengkap dari FLAC ini; unduhan di atas adalah berkas FLAC asli.",
  "Combined RGB histogram ·": "Histogram RGB gabungan ·",
  "Audio comparison over time ·": "Perbandingan audio sepanjang waktu ·",
  "PCM samples are 16-bit values. For LSB steganography, MSE can be near zero and PSNR very high because only a small fraction of samples change by one least significant bit; changed-sample rate and mean delta show that more directly.": "Sampel PCM menggunakan nilai 16-bit. Pada steganografi LSB, MSE dapat mendekati nol dan PSNR sangat tinggi karena hanya sebagian kecil sampel berubah satu bit; tingkat sampel berubah dan rata-rata selisih menunjukkannya dengan lebih jelas.",
  "RMS smooths the signal into average energy per time bucket. The two lines may overlap because LSB changes are tiny.": "RMS merangkum sinyal sebagai energi rata-rata per interval waktu. Kedua garis dapat bertumpuk karena perubahan LSB sangat kecil.",
  "Bars use an auto-scaled percent axis. Higher bars mark regions where more PCM samples differ.": "Batang memakai skala persentase otomatis. Batang lebih tinggi menunjukkan bagian dengan lebih banyak sampel PCM yang berbeda.",
  "Choose language": "Pilih bahasa",
  "Choose another difficulty to browse the shared network.": "Pilih tingkat kesulitan lain untuk melihat jaringan bersama.",
  "The palace has not been cleared yet.": "Istana ini belum ditaklukkan.",
  "Time:": "Waktu:",
  "Clue:": "Petunjuk:",
  "© STEGO-AE · PALACE NETWORK AUTHENTICATED ACCESS": "© STEGO-AE · AKSES TERAUTENTIKASI JARINGAN ISTANA",
  "Compare raw cover vs original stego, raw cover vs compressed stego, or original stego vs compressed stego.": "Bandingkan sampul asli dengan stego asli, sampul asli dengan stego terkompresi, atau stego asli dengan stego terkompresi.",
  "Identical": "Identik",
  "TRUE": "BENAR",
  "FALSE": "SALAH",
  "INF": "TAK TERHINGGA",
  "N/A": "T/A",
  "NOT_RUN": "BELUM DIJALANKAN",
  "Operation failed.": "Operasi gagal.",
  "Try again.": "Coba lagi.",
  "No clues recovered yet": "Belum ada petunjuk ditemukan",
  "Preparing": "Menyiapkan",
  "Main navigation": "Navigasi utama",
  "Filter palaces by difficulty": "Filter istana berdasarkan kesulitan",
  "Map legend": "Legenda peta",
  "Labyrinth grid. Use arrow keys or WASD to move one tile.": "Kisi labirin. Gunakan tombol panah atau WASD untuk bergerak satu petak.",
  "Erase": "Hapus penanda",
  "Select and edit clue nodes": "Pilih dan edit titik petunjuk",
  "Click tiles to add or remove walls": "Klik petak untuk menambah atau menghapus tembok",
  "Place the player start": "Tempatkan titik awal pemain",
  "Place the treasure": "Tempatkan harta",
  "Place a stationary guard": "Tempatkan penjaga yang diam",
  "Place an encrypted clue": "Tempatkan petunjuk terenkripsi",
  "Remove a marker or wall": "Hapus penanda atau tembok",
  "+ Blank": "+ Kosong",
  "Custom grid size": "Ukuran kisi kustom",
  "Password for Clue 1:": "Kata sandi Petunjuk 1:",
  "Each game object needs its own tile.": "Setiap objek permainan harus menempati petak yang berbeda.",
  "Move the entrance, treasure, shadow, or clue before placing a wall here.": "Pindahkan pintu masuk, harta, bayangan, atau petunjuk sebelum menempatkan tembok di sini.",
  "Could not inspect this file.": "Berkas ini tidak dapat diperiksa.",
  "Run Full Asset Audit": "Jalankan Audit Semua Aset",
  "Testing compression formats…": "Menguji format kompresi…",
  "Export Combined Forensic XLSX Report": "Ekspor Laporan Forensik XLSX Gabungan",
  "Comparison": "Perbandingan",
  "File A": "Berkas A",
  "File B": "Berkas B",
  "Media": "Media",
  "Codec": "Codec",
  "Extraction": "Ekstraksi",
  "IMAGE": "GAMBAR",
  "AUDIO": "AUDIO",
  "YES": "YA",
  "NO": "TIDAK",
  "PASS": "BERHASIL",
  "FAIL": "GAGAL",
  "ERROR": "GALAT",
  "ORIGINAL": "ASLI",
  "BASELINE": "PEMBANDING AWAL",
  "Compression failed": "Kompresi gagal",
  "Could not load palace assets.": "Aset istana gagal dimuat.",
  "✓ SOLVED · REVIEW": "✓ SELESAI · LIHAT",
  "● ACTIVE": "● AKTIF",
  "○ LOCKED": "○ TERKUNCI",
  "Recovered plaintext": "Teks terbaca",
  "Integrity verified": "Integritas terverifikasi",
  "Extraction possible": "Ekstraksi dapat dilakukan",
  "Extraction impossible": "Ekstraksi tidak dapat dilakukan",
  "Raw cover vs stego after JPEG": "Sampul asli vs stego setelah JPEG",
  "Raw cover vs stego after WebP": "Sampul asli vs stego setelah WebP",
  "Raw cover vs stego after FLAC": "Sampul asli vs stego setelah FLAC",
  "Raw cover vs stego after MP3": "Sampul asli vs stego setelah MP3"
};

function translateText(source: string, language: Language): string {
  if (language === "en") return source;
  if (idText[source] !== undefined) return idText[source];
  let match = source.match(/^(OPERATIVE: .+?) · SELECT YOUR INFILTRATION TARGET$/);
  if (match) return `OPERATIF: ${match[1].replace(/^OPERATIVE: /, "")} · PILIH TARGET INFILTRASI`;
  match = source.match(/^(\d+) encrypted (clue|clues) across a (\d+) × (\d+) labyrinth\. Recover every clue, claim the treasure, and escape\.$/);
  if (match) return `${match[1]} petunjuk terenkripsi di labirin ${match[3]} × ${match[4]}. Temukan semua petunjuk, ambil harta, lalu kabur.`;
  match = source.match(/^Clue (\d+) · paired (image|audio) files$/i);
  if (match) return `Petunjuk ${match[1]} · berkas ${match[2] === "image" ? "gambar" : "audio"} berpasangan`;
  match = source.match(/^Clue (\d+)$/);
  if (match) return `Petunjuk ${match[1]}`;
  match = source.match(/^CLUE (\d+)$/);
  if (match) return `PETUNJUK ${match[1]}`;
  match = source.match(/^Time: (.+)$/);
  if (match) return `Waktu: ${match[1]}`;
  match = source.match(/^Clue: (.+)$/);
  if (match) return `Petunjuk: ${match[1]}`;
  match = source.match(/^PALACE (\d+)$/);
  if (match) return `ISTANA ${match[1]}`;
  match = source.match(/^DESIGNED BY (.+)$/);
  if (match) return `DIBUAT OLEH ${match[1]}`;
  match = source.match(/^Clue (\d+) · ([A-Z]+\d+)$/);
  if (match) return `Petunjuk ${match[1]} · ${match[2]}`;
  match = source.match(/^Clue (\d+) · (IMAGE|AUDIO)$/);
  if (match) return `Petunjuk ${match[1]} · ${match[2] === "IMAGE" ? "GAMBAR" : "AUDIO"}`;
  match = source.match(/^Clue (\d+) · Recovered message$/);
  if (match) return `Petunjuk ${match[1]} · Pesan ditemukan`;
  match = source.match(/^(\d+) PALACES? IN NETWORK$/);
  if (match) return `${match[1]} ISTANA DI JARINGAN`;
  match = source.match(/^(\d+) × (\d+) GRID$/);
  if (match) return `${match[1]} × ${match[2]} PETAK`;
  match = source.match(/^(\d+) CLUE NODES?$/);
  if (match) return `${match[1]} TITIK PETUNJUK`;
  match = source.match(/^✓ CLEARED · BEST (.+) · (\d+) PTS$/);
  if (match) return `✓ DITAKLUKKAN · TERBAIK ${match[1]} · ${match[2]} POIN`;
  match = source.match(/^(\d+) (?:custom )?file\(s\) selected$/);
  if (match) return `${match[1]} berkas dipilih`;
  match = source.match(/^Preparing (.+) preview…$/);
  if (match) return `Menyiapkan pratinjau ${match[1]}…`;
  match = source.match(/^Analyze (image|audio) · (.+)$/);
  if (match) return `Analisis ${match[1] === "image" ? "gambar" : "audio"} · ${match[2] === "ORIGINAL PAIR" ? "PASANGAN ASLI" : match[2]}`;
  match = source.match(/^Combined RGB histogram · (.+)$/);
  if (match) return `Histogram RGB gabungan · ${match[1]}`;
  match = source.match(/^Audio comparison over time · (.+)$/);
  if (match) return `Perbandingan audio sepanjang waktu · ${match[1]}`;
  match = source.match(/^(.+) · (\d+) assets$/);
  if (match) return `${match[1]} · ${match[2]} aset`;
  match = source.match(/^(\d+) \/ 100 points$/);
  if (match) return `${match[1]} / 100 poin`;
  match = source.match(/^Attempts: (\d+\/\d+)(.*)$/);
  if (match) return `Percobaan: ${match[1]}${match[2].replace("hint revealed, you can keep trying", "petunjuk terbuka, Anda masih bisa mencoba")}`;
  match = source.match(/^Baseline: PASS · (.+)$/);
  if (match) return `Awal: BERHASIL · ${match[1]}`;
  match = source.match(/^Extraction: PASS · (.+)$/);
  if (match) return `Ekstraksi: BERHASIL · ${match[1]}`;
  match = source.match(/^Compress to (JPEG|WEBP|FLAC|MP3)$/);
  if (match) return `Kompres ke ${match[1]}`;
  match = source.match(/^Restore (PNG|WAV)$/);
  if (match) return `Pulihkan ${match[1]}`;
  match = source.match(/^(.+) compression$/);
  if (match) return `Kompresi ${match[1]}`;
  match = source.match(/^Move (north|south|east|west)$/i);
  if (match) {
    const directions: Record<string, string> = { north: "utara", south: "selatan", east: "timur", west: "barat" };
    return `Bergerak ke ${directions[match[1].toLowerCase()]}`;
  }
  return source;
}

interface LanguageContextValue { language: Language; setLanguage: (language: Language) => void }
const LanguageContext = createContext<LanguageContextValue>({ language: "en", setLanguage: () => undefined });
const textSources = new WeakMap<Text, string>();
const textOutputs = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();
const attributeOutputs = new WeakMap<Element, Map<string, string>>();

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem("stego-ae-language", next);
    document.body.classList.remove("language-transition");
    void document.body.offsetWidth;
    document.body.classList.add("language-transition");
    window.setTimeout(() => document.body.classList.remove("language-transition"), 420);
  }, []);
  const contextValue = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  useEffect(() => {
    const stored = window.localStorage.getItem("stego-ae-language");
    if (stored === "en" || stored === "id") setLanguageState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    const originalTitle = document.title;
    const englishTitle = Object.entries(idText).find(([, translated]) => translated === originalTitle)?.[0] ?? originalTitle;
    document.title = translateText(englishTitle, language);
    const localizedAttributes = new Set(["aria-label", "aria-description", "alt", "title", "placeholder"]);

    const localizeTextNode = (node: Text) => {
      const value = node.nodeValue;
      if (value === null || !value.trim()) return;
      const previousOutput = textOutputs.get(node);
      const source = previousOutput === undefined || value !== previousOutput ? value : (textSources.get(node) ?? value);
      textSources.set(node, source);
      const translated = translateText(source.trim(), language);
      const leading = source.match(/^\s*/)?.[0] ?? "";
      const trailing = source.match(/\s*$/)?.[0] ?? "";
      const output = `${leading}${translated}${trailing}`;
      if (output !== value) {
        textOutputs.set(node, output);
        node.nodeValue = output;
      } else textOutputs.set(node, value);
    };

    const localizeAttributes = (element: Element) => {
      for (const attribute of localizedAttributes) {
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        let sources = attributeSources.get(element);
        let outputs = attributeOutputs.get(element);
        if (!sources) { sources = new Map(); attributeSources.set(element, sources); }
        if (!outputs) { outputs = new Map(); attributeOutputs.set(element, outputs); }
        const previousOutput = outputs.get(attribute);
        const source = previousOutput === undefined || current !== previousOutput ? current : (sources.get(attribute) ?? current);
        sources.set(attribute, source);
        const translated = translateText(source, language);
        if (translated !== current) {
          outputs.set(attribute, translated);
          element.setAttribute(attribute, translated);
        } else outputs.set(attribute, current);
      }
    };

    const localizeElement = (element: Element) => {
      localizeAttributes(element);
      element.querySelectorAll("*").forEach(localizeAttributes);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || parent.closest("script,style,noscript,code,[data-no-translate]")) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      let node: Node | null;
      while ((node = walker.nextNode())) localizeTextNode(node as Text);
    };

    localizeElement(document.head);
    localizeElement(document.body);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData") localizeTextNode(record.target as Text);
        else if (record.type === "attributes") localizeElement(record.target as Element);
        else for (const node of record.addedNodes) {
          if (node instanceof Element) localizeElement(node);
          else if (node instanceof Text) localizeTextNode(node);
        }
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...localizedAttributes] });
    return () => observer.disconnect();
  }, [language]);

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
