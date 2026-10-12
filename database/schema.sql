-- HR App — skema database (Supabase Postgres)
-- Sumber kebenaran DDL. Prisma hanya client (service key; semua tabel RLS deny-all).
-- Terapkan lewat Supabase SQL Editor / psql. auth.users dikelola Supabase Auth.

-- ENUM --------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('HR_ADMIN', 'MANAGER', 'KARYAWAN');
CREATE TYPE contract_type AS ENUM ('PKWT', 'PKWTT', 'MAGANG');
CREATE TYPE contract_status AS ENUM ('AKTIF', 'BERAKHIR', 'UPCOMING');
CREATE TYPE leave_type AS ENUM ('TAHUNAN', 'SAKIT', 'IZIN');
CREATE TYPE leave_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE reminder_milestone AS ENUM ('H30', 'H14', 'H7');
CREATE TYPE reminder_status AS ENUM ('SENT', 'FAILED');

-- TRIGGER updated_at ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- TABEL --------------------------------------------------------------------------
-- users.id wajib sudah ada di auth.users (Supabase Auth); hapus akun auth = hapus row.
CREATE TABLE users (
  id         uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email      varchar(255) NOT NULL UNIQUE,
  role       user_role NOT NULL,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  nik            varchar(32) NOT NULL UNIQUE,
  nama           varchar(128) NOT NULL,
  email          varchar(255) NOT NULL UNIQUE,
  jabatan        varchar(128) NOT NULL,
  departemen     varchar(128) NOT NULL,
  tanggal_masuk  date NOT NULL,
  status_kontrak contract_type NOT NULL,
  atasan_id      uuid REFERENCES employees (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT employees_atasan_not_self CHECK (atasan_id IS NULL OR atasan_id <> id)
);

-- 1 baris = 1 periode kontrak. Perpanjangan = INSERT kontrak BARU (bukan UPDATE).
-- PKWTT: tanggal_akhir NULL (tanpa batas).
CREATE TABLE contracts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees (id) ON DELETE RESTRICT,
  jenis         contract_type NOT NULL,
  tanggal_mulai date NOT NULL,
  tanggal_akhir date,
  status        contract_status NOT NULL DEFAULT 'AKTIF',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leave_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      uuid NOT NULL REFERENCES employees (id) ON DELETE RESTRICT,
  jenis            leave_type NOT NULL,
  tanggal_mulai    date NOT NULL,
  tanggal_akhir    date NOT NULL,
  alasan           text NOT NULL,
  status           leave_status NOT NULL DEFAULT 'PENDING',
  approver_id      uuid REFERENCES employees (id) ON DELETE SET NULL,
  catatan_approver text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Saldo hanya untuk jenis TAHUNAN; sakit/izin tanpa saldo.
CREATE TABLE leave_balances (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  tahun       integer NOT NULL,
  saldo_awal  integer NOT NULL,
  terpakai    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_balances_employee_tahun_unique UNIQUE (employee_id, tahun),
  CONSTRAINT leave_balances_saldo_awal_ck CHECK (saldo_awal >= 0),
  CONSTRAINT leave_balances_terpakai_ck CHECK (terpakai >= 0)
);

-- Satu log per (kontrak, milestone, periode) — idempoten saat cron reminder jalan.
CREATE TABLE contract_reminder_logs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id           uuid NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
  milestone             reminder_milestone NOT NULL,
  tanggal_mulai_periode date NOT NULL,
  status                reminder_status NOT NULL,
  kirim_ke              text NOT NULL,
  error                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contract_reminder_logs_uniq UNIQUE (contract_id, milestone, tanggal_mulai_periode)
);

CREATE TABLE email_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        varchar(64) NOT NULL UNIQUE,
  subject    varchar(255) NOT NULL,
  body_html  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_key_format_ck CHECK (key ~ '^[a-z0-9_]{1,64}$')
);

CREATE TABLE document_templates (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        varchar(64) NOT NULL UNIQUE,
  name       varchar(128) NOT NULL,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- INDEX (FK yang sering di-join/di-filter) --------------------------------------
CREATE INDEX idx_employees_user_id ON employees (user_id);
CREATE INDEX idx_employees_atasan_id ON employees (atasan_id);
CREATE INDEX idx_contracts_employee_id ON contracts (employee_id);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests (employee_id);
CREATE INDEX idx_leave_balances_employee_id ON leave_balances (employee_id);
CREATE INDEX idx_contract_reminder_logs_contract_id ON contract_reminder_logs (contract_id);

-- TRIGGER updated_at (semua tabel yang punya updated_at) ------------------------
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_requests_updated_at BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leave_balances_updated_at BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_templates_updated_at BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: deny-all. Prisma akses lewat service role dari server; tidak ada akses anon.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY deny_all ON users FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON employees FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON contracts FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON leave_requests FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON leave_balances FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON contract_reminder_logs FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON email_templates FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
CREATE POLICY deny_all ON document_templates FOR ALL TO anon, authenticated, service_role USING (false) WITH CHECK (false);
