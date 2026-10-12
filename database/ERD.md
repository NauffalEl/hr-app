# ERD — HR App (Supabase Postgres)

Skema 8 tabel + 7 enum. DDL: `database/schema.sql` (sumber kebenaran). Client: `prisma/schema.prisma` (service key). Semua tabel RLS **deny-all**.

## Diagram

```mermaid
erDiagram
    auth_users ||--|| users : "id CASCADE (auth schema)"
    users ||--o| employees : "user_id SET NULL"
    employees ||--o| employees : "atasan_id SET NULL"
    employees ||--o{ contracts : "employee_id RESTRICT"
    employees ||--o{ leave_requests : "employee_id RESTRICT"
    employees ||--o{ leave_requests : "approver_id SET NULL"
    employees ||--o{ leave_balances : "employee_id CASCADE"
    contracts ||--o{ contract_reminder_logs : "contract_id CASCADE"

    users {
        uuid id PK
        varchar email UK
        user_role role
        boolean active
    }
    employees {
        uuid id PK
        uuid user_id FKUK
        varchar nik UK
        varchar nama
        varchar email UK
        varchar jabatan
        varchar departemen
        date tanggal_masuk
        contract_type status_kontrak
        uuid atasan_id FK
    }
    contracts {
        uuid id PK
        uuid employee_id FK
        contract_type jenis
        date tanggal_mulai
        date tanggal_akhir
        contract_status status
    }
    leave_requests {
        uuid id PK
        uuid employee_id FK
        leave_type jenis
        date tanggal_mulai
        date tanggal_akhir
        text alasan
        leave_status status
        uuid approver_id FK
        text catatan_approver
    }
    leave_balances {
        uuid id PK
        uuid employee_id FK
        int tahun
        int saldo_awal
        int terpakai
    }
    contract_reminder_logs {
        uuid id PK
        uuid contract_id FK
        reminder_milestone milestone
        date tanggal_mulai_periode
        reminder_status status
        text kirim_ke
        text error
    }
    email_templates {
        uuid id PK
        varchar key UK
        varchar subject
        text body_html
    }
    document_templates {
        uuid id PK
        varchar key UK
        varchar name
        text content
    }
```

## Enum

| Enum (SQL) | Nilai |
|---|---|
| user_role | HR_ADMIN, MANAGER, KARYAWAN |
| contract_type | PKWT, PKWTT, MAGANG |
| contract_status | AKTIF, BERAKHIR, UPCOMING |
| leave_type | TAHUNAN, SAKIT, IZIN |
| leave_status | PENDING, APPROVED, REJECTED, CANCELLED |
| reminder_milestone | H30, H14, H7 |
| reminder_status | SENT, FAILED |

## Tabel: users

Akun login. Row dibuat HR saja (tanpa auto-provision). `id` = `auth.users.id` (Supabase Auth, ON DELETE CASCADE).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK, FK auth.users.id (CASCADE) | = uid Supabase Auth |
| email | varchar(255) | NOT NULL, UNIQUE | email login |
| role | user_role | NOT NULL | HR_ADMIN / MANAGER / KARYAWAN |
| active | boolean | NOT NULL DEFAULT true | blokir akses tanpa hapus akun |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | trigger set_updated_at |

## Tabel: employees

Data karyawan. Bisa ada tanpa `user_id` (karyawan belum punya akun).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| user_id | uuid | UNIQUE, FK users.id (SET NULL), nullable | link ke akun login |
| nik | varchar(32) | NOT NULL, UNIQUE | NIK unik (keputusan Bima) |
| nama | varchar(128) | NOT NULL | |
| email | varchar(255) | NOT NULL, UNIQUE | email kerja |
| jabatan | varchar(128) | NOT NULL | |
| departemen | varchar(128) | NOT NULL | |
| tanggal_masuk | date | NOT NULL | |
| status_kontrak | contract_type | NOT NULL | tipe kontrak aktif saat ini |
| atasan_id | uuid | FK employees.id self (SET NULL), CHECK <> id, nullable | manager; approve cuti hanya bawahan |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

## Tabel: contracts

**1 baris = 1 periode kontrak.** Perpanjangan = INSERT row baru (bukan UPDATE). PKWTT: `tanggal_akhir` NULL.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| employee_id | uuid | NOT NULL, FK employees.id (RESTRICT) | |
| jenis | contract_type | NOT NULL | PKWT / PKWTT / MAGANG |
| tanggal_mulai | date | NOT NULL | awal periode; dasar milestone reminder |
| tanggal_akhir | date | nullable | NULL = PKWTT tanpa batas |
| status | contract_status | NOT NULL DEFAULT 'AKTIF' | |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

## Tabel: leave_requests

Ajukan + approve cuti. Saldo hanya dipotong untuk `jenis = TAHUNAN` (logika aplikasi).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| employee_id | uuid | NOT NULL, FK employees.id (RESTRICT) | pemohon |
| jenis | leave_type | NOT NULL | TAHUNAN / SAKIT / IZIN |
| tanggal_mulai | date | NOT NULL | |
| tanggal_akhir | date | NOT NULL | |
| alasan | text | NOT NULL | |
| status | leave_status | NOT NULL DEFAULT 'PENDING' | approve via $transaction + updateMany WHERE 'PENDING' |
| approver_id | uuid | FK employees.id (SET NULL), nullable | atasan pemohon |
| catatan_approver | text | nullable | |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

## Tabel: leave_balances

Saldo cuti tahunan per karyawan per tahun. HR-only upsert.

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| employee_id | uuid | NOT NULL, FK employees.id (CASCADE) | |
| tahun | integer | NOT NULL | tahun saldo |
| saldo_awal | integer | NOT NULL, CHECK >= 0 | hak cuti tahunan awal |
| terpakai | integer | NOT NULL DEFAULT 0, CHECK >= 0 | sudah dipakai |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

UNIQUE (employee_id, tahun) — satu saldo per karyawan per tahun.

## Tabel: contract_reminder_logs

Log email reminder kontrak. Idempoten: UNIQUE (contract_id, milestone, tanggal_mulai_periode) — cron H-30/14/7 tidak dobel kirim walau jalan berulang. Tabel tanpa `updated_at` (append-only).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| contract_id | uuid | NOT NULL, FK contracts.id (CASCADE) | periode kontrak terkait |
| milestone | reminder_milestone | NOT NULL | H30 / H14 / H7 |
| tanggal_mulai_periode | date | NOT NULL | tanggal_mulai kontrak; membedakan periode perpanjangan |
| status | reminder_status | NOT NULL | SENT / FAILED |
| kirim_ke | text | NOT NULL | alamat email tujuan |
| error | text | nullable | isi saat status FAILED |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

## Tabel: email_templates

Template email (Resend) untuk reminder kontrak dll. `key` pola `^[a-z0-9_]{1,64}$` (CHECK di SQL).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| key | varchar(64) | NOT NULL, UNIQUE, CHECK regex | identifier template |
| subject | varchar(255) | NOT NULL | |
| body_html | text | NOT NULL | |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

## Tabel: document_templates

Template isi PDF (kontrak / keterangan / cuti).

| Kolom | Tipe | Constraint | Keterangan |
|-------|------|------------|------------|
| id | uuid | PK | |
| key | varchar(64) | NOT NULL, UNIQUE | identifier template |
| name | varchar(128) | NOT NULL | nama tampil |
| content | text | NOT NULL | isi template |
| created_at / updated_at | timestamptz | NOT NULL | trigger set_updated_at |

## Relasi

- auth.users.id → users.id (1-1, CASCADE) — Supabase Auth, bukan tabel aplikasi
- users.id ← employees.user_id (1-1, SET NULL)
- employees.id ← employees.atasan_id (1-N self, SET NULL; CHECK <> id)
- employees.id → contracts.employee_id (1-N, RESTRICT)
- employees.id → leave_requests.employee_id (1-N, RESTRICT)
- employees.id → leave_requests.approver_id (1-N, SET NULL)
- employees.id → leave_balances.employee_id (1-N, CASCADE)
- contracts.id → contract_reminder_logs.contract_id (1-N, CASCADE)

## Index FK

`idx_employees_user_id`, `idx_employees_atasan_id`, `idx_contracts_employee_id`, `idx_leave_requests_employee_id`, `idx_leave_balances_employee_id`, `idx_contract_reminder_logs_contract_id`.

## RLS

`ENABLE ROW LEVEL SECURITY` + policy `deny_all` (FOR ALL TO anon, authenticated, service_role; USING (false) WITH CHECK (false)) di **semua 8 tabel**. Prisma jalan via service key dari server; browser tidak pernah langsung ke Postgres.

## Contoh data

```sql
-- users (id harus sudah ada di auth.users)
INSERT INTO users (id, email, role) VALUES
  ('11111111-1111-4111-8111-111111111101', 'hr@contoh.id', 'HR_ADMIN'),
  ('11111111-1111-4111-8111-111111111102', 'sari@contoh.id', 'MANAGER'),
  ('11111111-1111-4111-8111-111111111103', 'budi@contoh.id', 'KARYAWAN');

-- employees (rina belum punya akun -> user_id NULL)
INSERT INTO employees (id, user_id, nik, nama, email, jabatan, departemen, tanggal_masuk, status_kontrak, atasan_id) VALUES
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111102', 'NIK-0001', 'Sari Melati', 'sari@contoh.id', 'Manager Operasional', 'Operasional', DATE '2022-03-01', 'PKWTT', NULL),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111103', 'NIK-0002', 'Budi Santoso', 'budi@contoh.id', 'Staff Gudang', 'Gudang', DATE '2025-02-15', 'PKWT', '22222222-2222-4222-8222-222222222201'),
  ('22222222-2222-4222-8222-222222222203', NULL, 'NIK-0003', 'Rina Wijaya', 'rina@contoh.id', 'Admin HR', 'HR', DATE '2024-08-01', 'MAGANG', '22222222-2222-4222-8222-222222222201');

-- contracts (PKWTT tanpa tanggal_akhir; MAGANG sudah berakhir)
INSERT INTO contracts (id, employee_id, jenis, tanggal_mulai, tanggal_akhir, status) VALUES
  ('33333333-3333-4333-8333-333333333301', '22222222-2222-4222-8222-222222222202', 'PKWT', DATE '2025-02-15', DATE '2026-02-14', 'AKTIF'),
  ('33333333-3333-4333-8333-333333333302', '22222222-2222-4222-8222-222222222201', 'PKWTT', DATE '2022-03-01', NULL, 'AKTIF'),
  ('33333333-3333-4333-8333-333333333303', '22222222-2222-4222-8222-222222222203', 'MAGANG', DATE '2024-08-01', DATE '2025-02-01', 'BERAKHIR');

-- leave_requests (TAHUNAN sudah di-approve; SAKIT menunggu)
INSERT INTO leave_requests (id, employee_id, jenis, tanggal_mulai, tanggal_akhir, alasan, status, approver_id, catatan_approver) VALUES
  ('44444444-4444-4444-8444-444444444401', '22222222-2222-4222-8222-222222222202', 'TAHUNAN', DATE '2026-10-20', DATE '2026-10-21', 'Acara keluarga di luar kota', 'APPROVED', '22222222-2222-4222-8222-222222222201', 'Silakan, jaga gudang sebelum berangkat'),
  ('44444444-4444-4444-8444-444444444402', '22222222-2222-4222-8222-222222222203', 'SAKIT', DATE '2026-10-12', DATE '2026-10-12', 'Demam, surat dokter terlampir', 'PENDING', NULL, NULL);

-- leave_balances (hanya TAHUNAN yang ber-saldo)
INSERT INTO leave_balances (id, employee_id, tahun, saldo_awal, terpakai) VALUES
  ('55555555-5555-4555-8555-555555555501', '22222222-2222-4222-8222-222222222202', 2026, 12, 2),
  ('55555555-5555-4555-8555-555555555502', '22222222-2222-4222-8222-222222222201', 2026, 12, 0);
```

## Catatan desain (keputusan Bima)

1. Saldo cuti hanya TAHUNAN; SAKIT/IZIN tanpa saldo.
2. Reminder H-30/14/7 per PERIODE kontrak; perpanjangan = INSERT kontrak baru → `tanggal_mulai_periode` membedakan periode.
3. Approver cuti hanya atasan (`atasan_id`) — dicek di aplikasi.
4. User dibuat HR saja; `users.active` untuk blokir tanpa hapus.
5. Guard page-level: /kontrak HR_ADMIN only, /karyawan bukan KARYAWAN.
6. Prisma tidak bisa ekspresikan CHECK/RLS — keduanya hanya di `database/schema.sql`.
