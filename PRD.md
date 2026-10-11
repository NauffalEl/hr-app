# PRD: Aplikasi HR Internal
Tanggal: 2026-10-11

## 1. Ringkasan
Aplikasi web internal untuk tim HR menggantikan alur Google Sheets + Apps Script + AppSheet + Looker Studio. Satu aplikasi: data karyawan, manajemen kontrak + reminder email otomatis, pengajuan/cuti + approval, generate PDF surat, dashboard ringkas. Wajib login, mobile-friendly. 3 role: HR Admin (semua akses), Manager (approve cuti timnya), Karyawan (data sendiri + ajukan cuti).

## 2. Halaman & fitur

### /login
- Autentikasi email + password (wajib login).
- Kriteria selesai: sukses = masuk dashboard sesuai role; password salah = error jelas; session persist.

### /dashboard
- Ringkasan: total karyawan, kontrak habis <=30 hari, cuti pending, grafik headcount per departemen.
- Shortcut aksi cepat (ajukan cuti, tambah karyawan).
- Kriteria: angka akurat dari DB; Manager/Karyawan hanya lihat timnya/diri sendiri; HR Admin semua.

### /karyawan (dan /karyawan/[id])
- CRUD: nama, NIK (unik), email, jabatan, departemen, tanggal masuk, status kontrak (PKWT/PKWTT/magang), atasan, saldo cuti.
- List: cari + filter departemen/status. Detail: profil + riwayat kontrak + riwayat cuti.
- Kriteria: CRUD jalan; mobile-friendly.

### /kontrak
- Daftar kontrak: masa berlaku, sisa hari, status. Badge warna merah <=7 hari, kuning <=30.
- Email otomatis H-30, H-14, H-7 ke HR Admin, sekali per milestone per kontrak, log reminder tercatat.
- Kriteria: cron harian jalan; tidak dobel kirim.

### /cuti
- Form pengajuan: jenis (tahunan/sakit/izin), tanggal mulai-selesai, alasan. Saldo terpotong otomatis (hari kerja); melebihi saldo = ditolak sistem.
- Approval Manager/HR + catatan. Manager hanya timnya; HR Admin semua.
- Email notifikasi ke pemohon + approver di tiap perubahan status (diajukan/di-approve/di-reject); riwayat status tercatat.

### /dokumen
- PDF server-side dari template: surat kontrak kerja, surat keterangan kerja, surat cuti. Preview + unduh/print. Template bisa diedit di Pengaturan.

### /pengaturan (HR Admin only)
- CRUD user & role (tambah, ubah role, reset password).
- Edit template email & dokumen dengan placeholder {{nama}}, {{tanggal}}, dll.

## 3. Tech stack
- Next.js 14 App Router + Tailwind CSS
- Backend: Next.js API routes / server actions
- Database: Supabase Postgres + Prisma ORM
- Auth: Supabase Auth (email+password)
- PDF: @react-pdf/renderer (server-side)
- Email: Resend; cron reminder via Vercel Cron
- Hosting: Vercel

## 4. Tahapan
1. Desain (Sinta) 2. Database (Dewi) 3. Frontend+Backend (Raka+Dimas) 4. Security (Gilang) 5. QA (Wulan) 6. Deploy preview

## 5. Di luar scope
Payroll, absensi fingerprint, rekrutmen, integrasi otomatis Google Sheets/Forms lama.
