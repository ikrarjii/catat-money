# Catat Money — backend awal

Backend tahap awal untuk pencatatan transaksi Telegram dan dashboard web.

## Arsitektur

```text
Telegram Webhook ─┐
                  ├─> endpoint backend ─> parser OpenRouter (DeepSeek) ─> validasi JSON
Web Dashboard ────┘                                      │
                                                         └─> Supabase PostgreSQL
                                                            users + transactions
```

Telegram webhook dan dashboard mengirim teks transaksi ke service parser bersama. Setelah hasil parser ditinjau/dikonfirmasi sesuai alur produk, backend menyimpan transaksi menggunakan Supabase. Gunakan Supabase Auth untuk autentikasi; `users.id` harus sama dengan `auth.users.id`. Kolom `password_hash` disediakan sesuai spesifikasi untuk kompatibilitas/migrasi, tetapi jangan menyimpan kata sandi Supabase di sana. Kunci service role hanya boleh dipakai di server dan tidak boleh dikirim ke browser.

## File inti

- `supabase/schema.sql`: enum, tabel, indeks, foreign key, dan Row Level Security.
- `src/services/transaction-parser.ts`: pemanggilan OpenRouter, system prompt, dan validasi keluaran.
- `src/routes/parse-transaction.ts`: handler Express.
- `src/app/api/transactions/parse/route.ts`: handler Next.js App Router.
- `src/services/telegram-bot.ts`: bot grammY untuk linking dan pencatatan dari chat.
- `src/app/api/telegram/link/route.ts`: endpoint terautentikasi untuk membuat token dan deep link.
- `src/app/api/telegram/webhook/route.ts`: webhook Telegram untuk Next.js/Vercel.
- `.env.example`: variabel konfigurasi.

Handler menerima `POST` JSON `{ "message": "Beli nasi goreng 25rb tadi malam" }` dan mengembalikan tepat lima field transaksi. Parser memetakan `25rb` menjadi `25000`; tanggal relatif memakai `APP_TIMEZONE` (default `Asia/Makassar`). Pesan yang jumlahnya tidak jelas menghasilkan `amount: 0` agar aplikasi pemanggil dapat meminta klarifikasi sebelum menyimpan.

Service memakai `fetch` bawaan Node.js (Node 18+) dan variabel `OPENROUTER_API_KEY`. Untuk Express, pasang `express.json()` dan mount handler pada `/api/transactions/parse`. Untuk Next.js, letakkan handler di App Router seperti pada file contoh. Karena `users` dan `transactions` memakai RLS, operasi dari server harus membawa JWT pengguna; alternatifnya server dapat menggunakan service role setelah memverifikasi identitas pengguna sendiri.

## Langkah 2: Telegram

1. Terapkan perubahan skema `link_token_expires_at` dari `supabase/migrations/202610140001_add_telegram_link_expiration.sql` (atau gunakan skema penuh yang sudah diperbarui).
2. Pasang dependency dengan `npm install`. Salin `.env.example` ke `.env.local`, isi kunci server, dan set `TELEGRAM_BOT_USERNAME` tanpa awalan `@`.
3. Dashboard memanggil `POST /api/telegram/link` dengan header `Authorization: Bearer <supabase_access_token>`. Respons mencakup `token`, `expiresAt`, dan `deepLink`; gunakan nilai `deepLink` sebagai data QR code atau tombol tautan.
4. Deploy endpoint HTTPS lalu daftarkan webhook bot pada `https://<domain>/api/telegram/webhook`. Sertakan `secret_token` yang sama dengan `TELEGRAM_WEBHOOK_SECRET` saat memanggil Telegram `setWebhook`; endpoint memeriksa header `X-Telegram-Bot-Api-Secret-Token`.

Token link acak sekali pakai berlaku 10 menit secara default (dapat diubah sampai maksimum 60 menit), lalu dihapus saat berhasil dipakai. Bot menyimpan transaksi hanya jika nominal hasil parser lebih dari nol. Jangan mengekspos service role key atau bot token ke browser.

## Frontend dashboard

Frontend memakai Next.js App Router, Tailwind CSS, Supabase Auth, Recharts, `qrcode.react`, dan Lucide. Isi `NEXT_PUBLIC_SUPABASE_URL` serta `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local`; anon key digunakan di browser dan dibatasi oleh RLS. `SUPABASE_SERVICE_ROLE_KEY` tetap hanya untuk endpoint server. Jalankan `npm install`, lalu `npm run dev`. Halaman `/` mengarahkan pengguna ke `/login` atau `/dashboard` berdasarkan sesi Supabase.

### Ekspor laporan keuangan

Dashboard menyediakan ekspor PDF dan CSV (CSV dapat dibuka di Excel atau Google Sheets). Dependency PDF: `jspdf` dan `jspdf-autotable`. Sebelum deploy fitur ini, jalankan migrasi `supabase/migrations/202610180001_add_transaction_source.sql` di Supabase. Migrasi menambah sumber transaksi; transaksi Telegram baru otomatis ditandai `TELEGRAM`. Data lama yang belum mempunyai sumber ditampilkan sebagai "Tidak diketahui" karena kanalnya tidak dapat disimpulkan dari skema lama.
