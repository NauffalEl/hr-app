# HR Internal — Next.js 15 App Router

Aplikasi HR internal (karyawan, kontrak, cuti, dokumen, pengaturan) dengan **Next.js 15 App Router**, **Prisma 5**, **PostgreSQL**, **Tailwind CSS**, **pdf-lib**, **Resend**.

---

## Prasyarat

- **Node.js ≥ 20** (direkomendasikan 22 LTS / 26 LTS)
- **PostgreSQL ≥ 14** (lokal / Docker / Supabase / Neon / Aiven)
- **Git**
- (Opsional) **Resend API Key** untuk email nyata — tanpa itu email log ke console (fallback `{sent:false,fallback:true}`)

---

## Setup Cepat (Laptop Sendiri)

### 1. Clone & install
```bash
git clone https://github.com/NauffalEl/hr-app.git
cd hr-app
npm install
```

### 2. Database PostgreSQL
**Opsi A — Docker (paling cepat):**
```bash
docker run -d --name hr-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=hrapp \
  -p 5432:5432 \
  postgres:16
```
Tunggu ~5 detik sampai `pg_isready` OK.

**Opsi B — PostgreSQL lokal (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE hrapp OWNER postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hrapp TO postgres;"
# edit pg_hba.conf → method scram-sha-256, lalu restart service
```

**Opsi C — Supabase/Neon/Aiven (managed, gratis tier):**
- Buat project → ambil **Connection string** (pooler/transaction) → pakai di `.env.local`

### 3. Environment
```bash
cp .env.example .env.local   # atau buat manual
```
Isi minimal `.env.local`:
```bash
# Database (wajib)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/hrapp

# Supabase Auth (wajib untuk login production)
# Kalau cuma dev lokal: isi placeholder, login pakai MOCK_USER_ROLE
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (opsional — tanpa ini email hanya console log)
RESEND_API_KEY=re_xxxxx
EMAIL_FROM="HR App <onboarding@resend.dev>"

# Dev mock login (hanya NODE_ENV=development)
MOCK_USER_ROLE=HR_ADMIN

# Cron secret (wajib di production, acak 32+ char)
CRON_SECRET=changeme-dev-only
```

> **Catatan:** Tanpa `NEXT_PUBLIC_SUPABASE_URL` valid, middleware akan pakai mock session (`MOCK_USER_ROLE`) — hanya jalan di `NODE_ENV=development`.

### 4. Migrasi schema & seed
```bash
npx prisma generate
npx prisma db push    # atau: npx prisma migrate dev --name init
npm run db:seed       # isi 5 karyawan, 4 kontrak, 2 saldo cuti, 8 template
npm run selfcheck     # verifikasi logika (19 assertions)
```

### 5. Jalankan dev server
```bash
npm run dev
```
Buka **http://localhost:3000** → login pakai mock (HR_ADMIN otomatis).

---

## Scripts Tersedia

| Script | Perintah | Fungsi |
|--------|----------|--------|
| `dev` | `npm run dev` | Next.js dev server (Turbopack) |
| `build` | `npm run build` | Production build (typecheck + lint) |
| `start` | `npm run start` | Jalankan hasil build |
| `db:seed` | `npm run db:seed` | Seed data demo ke DB |
| `selfcheck` | `npm run selfcheck` | Unit assertions non-DB |
| `lint` | `npm run lint` | ESLint (jika dikonfigurasi) |

---

## Login & Role

| Role | Akses |
|------|-------|
| **HR_ADMIN** | Semua fitur: karyawan CRUD, kontrak, cuti approve all, pengaturan user/role/template, dokumen, cron |
| **MANAGER** | Dashboard scoped, karyawan (bawahan + diri), kontrak read, cuti approve bawahan, dokumen |
| **KARYAWAN** | Dashboard diri, profil diri, cuti submit/cancel, dokumen diri |

**Mock dev:** `MOCK_USER_ROLE=HR_ADMIN` di `.env.local` + `NODE_ENV=development` → login otomatis tanpa Supabase.

---

## Struktur Penting

```
├── app/
│   ├── api/              # API routes (employees, contracts, leaves, dashboard, cron, documents)
│   ├── (app)/            # Halaman Raka (dashboard, karyawan, kontrak, cuti, dokumen, pengaturan)
│   ├── _lib/             # Actions & utils client-side
│   └── login/            # Halaman login
├── lib/
│   ├── actions/          # Server Actions (employees, contracts, leaves, admin, dll)
│   ├── prisma.ts         # Prisma singleton
│   ├── session.ts        # getCurrentSession (Supabase SSR)
│   ├── auth.ts           # getAuthContext, requireAuth/Role, employeeScope
│   ├── email.ts          # Resend + fallback console
│   ├── leave.ts          # hitungHariKerja, getLeaveBalance, sendLeaveTransitionEmail
│   ├── reminder.ts       # Cron reminder kontrak (H-30/14/7 idempoten)
│   ├── pdf.ts            # pdf-lib generator (kontrak/keterangan/cuti)
│   └── validate.ts       # Validator input (tanpa Zod)
├── prisma/
│   └── schema.prisma     # Schema + @@schema("public") + multiSchema preview
├── scripts/
│   ├── seed.mjs          # Seed template + demo data
│   └── selfcheck.mjs     # Assertions non-DB
├── middleware.ts         # Session refresh + redirect /login
└── .env.local            # Environment (tidak di-commit)
```

---

## API Endpoints (Ringkas)

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET/POST | `/api/employees` | ✓ | List (search/filter/paginasi + saldoCuti) / Create |
| GET/PUT/DELETE | `/api/employees/:id` | ✓ | Detail / Update / Delete |
| GET/POST | `/api/contracts` | HR | List (min/maxSisaHari) / Create (perpanjangan = INSERT) |
| PUT | `/api/contracts/:id` | HR | Update status/tanggalAkhir |
| GET/POST | `/api/leaves` | ✓ | List / Submit |
| PUT | `/api/leaves/:id` | ✓ | `{action:"approve\|reject\|cancel"}` |
| GET | `/api/dashboard` | ✓ | Stats scoped role |
| GET | `/api/cron/reminder` | Bearer CRON_SECRET | Cron H-30/14/7 (idempoten) |
| GET | `/api/documents/:type/:employeeId` | ✓ | PDF (kontrak/keterangan/cuti) |
| GET/POST | `/api/admin/*` | HR | Users, templates, reset password |

---

## Produksi (Deploy)

### Vercel + PostgreSQL VM / Managed
1. Push ke GitHub → Import di Vercel
2. Set env vars di Vercel Project Settings:
   - `DATABASE_URL` (dengan `?sslmode=require`)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `CRON_SECRET` (acak 32+ char, **bukan** placeholder)
3. Vercel otomatis jalan `prisma generate` + `next build`
4. Cron `/api/cron/reminder` jalan harian (konfigurasi di `vercel.json`)

> **Peringatan:** Jika DB di VM publik, **wajib** password kuat, `scram-sha-256`, SSL, firewall whitelist IP Vercel.

### Docker (Self-hosted)
```dockerfile
# Dockerfile sudah belum ada — buat sendiri jika perlu
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `prisma generate` hang / engine not found | Download manual: `PRISMA_QUERY_ENGINE_LIBRARY=... npx prisma generate` (lihat `scripts/setup-engine.sh` kalau ada) |
| `Can't reach database server` | Cek `DATABASE_URL`, Postgres jalan, port 5432 terbuka, firewall |
| `relation "auth.users" does not exist` | Schema `auth` stub hanya lokal — production pakai Supabase Auth asli |
| Login redirect loop | Cek `NEXT_PUBLIC_SUPABASE_URL` valid, middleware pakai `setAll` cookies |
| Email tidak terkirim | Cek `RESEND_API_KEY` valid, `EMAIL_FROM` domain verified di Resend |
| Cron 401 Unauthorized | Header `Authorization: Bearer <CRON_SECRET>` harus sama persis (timing-safe) |

---

## Lisensi
MIT — bebas dipakai, dimodifikasi, didistribusikan.

---

## Kontak
- Repo: https://github.com/NauffalEl/hr-app
- Maintainer: Tim Web (Bima/PM, Sintadewi/DB, Raka/FE, Dimas/BE, Gilang/Sec, Wulan/QA)