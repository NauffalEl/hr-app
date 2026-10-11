# Design System & Wireframe — Aplikasi HR Internal

Oleh: Sinta (UI/UX Designer). Stack: Next.js 14 App Router + Tailwind CSS.
Mockup HTML statis: `design/dashboard.html`, `design/karyawan.html`, `design/cuti.html`
(buka langsung di browser, Tailwind CDN).

---

## 1. Prinsip Desain

1. **Mobile compact & data-dense** (preferensi Naufal): teks tabel 13–14px, baris
   rapat, whitespace minim, stat card 2 kolom di mobile, kolom terpenting didahulukan.
2. **Konsisten**: satu gaya tombol/badge/typography untuk semua halaman — semua
   komponen diambil dari token di bawah, tidak ada warna/ukuran "kreatif" di luar daftar.
3. **Role-aware**: HR Admin lihat semua; Manager hanya timnya; Karyawan hanya data
   diri + ajukan cuti. Elemen yang tidak boleh diakses disembunyikan, bukan
   di-disable (kecuali tombol yang konteksnya perlu dijelaskan, mis. alasan ditolak).
4. **Setiap form punya state**: normal, focus, error, sukses, loading (tombol
   loading = spinner + teks "Menyimpan…" + disabled).
5. **Empty state didesain**: ikon + judul + satu kalimat penjelas + tombol aksi utama.
6. Aksesibilitas: kontras teks ≥ 4.5:1, target tap mobile ≥ 40px, focus ring
   terlihat, label form selalu ada (placeholder bukan label), badge status
   selalu punya teks (bukan warna saja).

---

## 2. Design Tokens

### 2.1 Warna

| Token | Nilai (Tailwind) | Pemakaian |
|---|---|---|
| Primary | `blue-600` `#2563eb` | tombol utama, link, active nav, angka penting |
| Primary hover | `blue-700` `#1d4ed8` | hover tombol |
| Primary active | `blue-800` `#1e40af` | state tekan |
| Primary subtle bg | `blue-50` `#eff6ff` | info ringan, active nav di mobile |
| Primary border | `blue-200` `#bfdbfe` | focus ring border |
| Netral teks utama | `slate-900` `#0f172a` | judul, angka stat |
| Netral teks | `slate-700` `#334155` | body, isi tabel |
| Netral muted | `slate-500` `#64748b` | label, caption, helper |
| Placeholder | `slate-400` `#94a3b8` | placeholder input |
| Border | `slate-200` `#e2e8f0` | border card, input, tabel |
| Divider | `slate-100` `#f1f5f9` | pemisah baris tabel |
| BG halaman | `slate-50` `#f8fafc` | background aplikasi |
| Surface | `white` | card, sidebar mobile, topbar |
| Sidebar | `slate-900` `#0f172a` | sidebar desktop, teks `slate-400`, aktif `white` |
| Success | `emerald-600` `#059669` (bg `emerald-50` `#ecfdf5`, teks `emerald-700` `#047857`) | PKWTT, cuti disetujui, kontrak aman |
| Warning | `amber-500` `#f59e0b` (bg `amber-50` `#fffbeb`, teks `amber-700` `#b45309`) | kontrak ≤30 hari, cuti menunggu approval |
| Danger | `red-600` `#dc2626` (bg `red-50` `#fef2f2`, teks `red-700` `#b91c1c`) | kontrak ≤7 hari, cuti ditolak, error form, tombol destruktif |
| Info | `sky-600` `#0284c7` (bg `sky-50` `#f0f9ff`, teks `sky-700` `#0369a1`) | PKWT, tahap approval antara |

Aturan: satu badge/kartu maksimal satu warna aksen. Merah KHUSUS untuk kondisi
mendesak/bermasalah (≤7 hari, ditolak, error) — jangan dipakai dekoratif.

### 2.2 Tipografi

Font: **Inter** (fallback `system-ui, -apple-system, Segoe UI, sans-serif`).
Bobot: 400 (body), 500 (label/metadata), 600 (judul kecil, tombol), 700 (judul, angka stat).

| Gaya | Ukuran / line-height | Pemakaian |
|---|---|---|
| Stat angka | 24px (30px desktop) / 1.1, bold | angka besar di stat card |
| H1 halaman | 20px (24px desktop) / 1.2, bold | judul halaman |
| H2 / judul card | 16px / 1.3, semibold | judul section & card |
| Body | 14px / 1.5, 400 | teks umum, isi form |
| Tabel desktop | 14px / 1.4 | sel tabel |
| Tabel/daftar mobile | 13px / 1.4 | sel tabel & card list di mobile |
| Label form | 13px / 1.4, 500 | label input |
| Caption/helper | 12px / 1.4, muted | helper, error, keterangan, badge |

Angka (saldo cuti, sisa hari, NIK): `font-variant-numeric: tabular-nums`
supaya kolom angka rapi.

### 2.3 Spacing, Radius, Shadow, Breakpoint

- **Spacing** skala 4px: `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48`. Pola:
  padding card `p-4` (mobile) / `p-5`–`p-6` (desktop); jarak antar-card `gap-4`;
  jarak judul-isi `mb-4`–`mb-6`.
- **Radius**: input & tombol `rounded-md` (6px); card `rounded-lg` (8px);
  modal/drawer `rounded-lg`/`rounded-xl`; badge & avatar `rounded-full`.
- **Shadow**: card `shadow-sm` (border `slate-200` lebih utama daripada shadow);
  dropdown/drawer/modal `shadow-lg`; topbar mobile `shadow-sm` bawah.
- **Breakpoint**: `sm 640`, `md 768`, `lg 1024` (sidebar desktop aktif), `xl 1280`.
- **Layout container**: `max-w-7xl mx-auto`, padding `p-4` mobile → `p-6 lg:p-8`.
- **Tinggi kontrol**: input & tombol default `h-10` (40px); tombol kecil `h-8`;
  minimal target tap mobile 40×40px.

---

## 3. Komponen

### 3.1 Tombol

Varian (semua `rounded-md`, `text-sm font-semibold`, transisi 150ms):

| Varian | Style | Pakai untuk |
|---|---|---|
| Primary | bg `blue-600`, teks putih, hover `blue-700` | aksi utama: Simpan, Ajukan, Setujui, Tambah Karyawan |
| Secondary | bg putih, border `slate-200`, teks `slate-700`, hover bg `slate-50` | aksi sekunder: Batal, Export, Unduh |
| Ghost | teks `slate-600`, hover bg `slate-100` | aksi baris (ikon), tab |
| Danger | bg `red-600` teks putih (utk destruktif besar); outline `text-red-600 border-red-200 hover:bg-red-50` (destruktif kecil, mis. Tolak/Tambah) | hapus, tolak, destruktif |

Ukuran: `sm h-8 px-3 text-[13px]` (aksi tabel), `md h-10 px-4` (default),
`lg h-11 px-5` (form submit mobile). Dengan ikon: ikon 16–18px, `gap-2`.
State: loading → spinner + label berubah, `disabled` + `opacity-60`;
disabled → `opacity-50 cursor-not-allowed`. Focus: `focus-visible:ring-2
focus-visible:ring-blue-500 focus-visible:ring-offset-1`.

### 3.2 Card

`bg-white border border-slate-200 rounded-lg shadow-sm`.
- Card judul: header `px-4 py-3 lg:px-5 border-b border-slate-100` (judul H2 +
  aksi kanan), body `p-4 lg:p-5`.
- Stat card: `p-4`, label caption `slate-500`, angka stat, delta/keterangan kecil;
  varian aksen: strip warna kiri 3px atau ikon kanan berwarna (jangan keduanya ramai).
- Card mobile harus `w-full` dalam stack vertikal, tidak ada side-by-side kecuali
  stat 2 kolom.

### 3.3 Tabel (desktop)

- Wrap: `overflow-x-auto` bila kolom banyak.
- Header: `bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wide`,
  tinggi `h-10`, sticky di layar panjang (`sticky top-0`).
- Baris: `border-b border-slate-100`, tinggi `h-12` (rapat; bisa `h-11`),
  hover `bg-slate-50`; sel `px-4 text-sm`.
- Sel nama: avatar inisial 28px + nama `font-medium` + email/jabatan kecil muted.
- Sel angka: `tabular-nums`, rata kanan bila kolom rupiah/hari.
- Aksi baris: ikon-button ghost (ubah, lihat, hapus) + menu titik-tiga.
- Klik baris → halaman detail; tombol di dalam baris `stopPropagation`.
- **Mobile**: tabel TIDAK dipakai — ubah jadi **card list** (lihat 3.6), satu
  entri satu card ringkas. Alternatif untuk data sederhana: baris vertikal
  `grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]`.
- Footer tabel: pagination `Sebelumnya / 1 / 2 / … / Berikutnya` + info
  "Menampilkan 1–20 dari 128".

### 3.4 Form

- Field: `<label>` 13px `font-medium slate-700` + `mb-1.5`, input `h-10 w-full
  rounded-md border border-slate-200 px-3 text-sm` placeholder `slate-400`.
- Focus: `focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`.
- Error: border `red-300` + helper teks `red-600 text-xs` (ikon seru), muncul di
  bawah input; jangan hanya warna — selalu ada ikon/teks.
- Required: tanda `*` merah di label. Helper tambahan: `text-xs slate-500`.
- Select memakai style sama (chevron kanan). Textarea min `h-24`.
- Grid form: 1 kolom di mobile; 2 kolom (`md:grid-cols-2`) di desktop untuk
  field pendek (nama & email, tanggal mulai & selesai).
- Info saldo (form cuti): card kecil `bg-blue-50 border-blue-100 rounded-md p-3
  text-[13px]` menampilkan saldo awal/terpakai/sisa; peringatan melebihi saldo →
  `bg-red-50 border-red-200 text-red-700` + tombol submit disabled.
- Submit bar: tombol utama full-width di mobile, kanan-bawah dengan Batal di desktop.

### 3.5 Badge Status

`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium`
+ titik 6px opsional.

| Konten | Badge |
|---|---|
| Kontrak PKWT | info: bg `sky-50` teks `sky-700` |
| Kontrak PKWTT | success: bg `emerald-50` teks `emerald-700` |
| Magang | netral: bg `slate-100` teks `slate-600` |
| Sisa kontrak >30 hari | netral `slate-100`/`slate-600` (atau hijau bila perlu penekanan) |
| Sisa kontrak ≤30 hari | warning `amber-50`/`amber-700` |
| Sisa kontrak ≤7 hari | danger `red-600` bg, teks putih (penekanan paling kuat) |
| Cuti: Diajukan / Menunggu Manager | warning `amber-50`/`amber-700` |
| Cuti: Menunggu HR | info `sky-50`/`sky-700` |
| Cuti: Disetujui | success `emerald-50`/`emerald-700` |
| Cuti: Ditolak | danger `red-50`/`red-700` |

Aturan: badge = status sah saat ini. Riwayat status tampil sebagai timeline
berlabel (titik + garis), bukan deretan badge.

### 3.6 Card List Mobile (pengganti tabel)

Untuk setiap tabel data di mobile: satu card per entri `bg-white border
border-slate-200 rounded-lg p-3`:
baris 1: nama `font-medium text-sm` + badge kanan; baris 2: metadata `text-xs
slate-500` (jabatan · departemen · NIK); baris 3 opsional: angka kunci
(saldo cuti, sisa hari). Klik → detail. Dense: `divide-y divide-slate-100`
antar card, gap rapat.

### 3.7 Sidebar & Navigasi Desktop

- Sidebar kiri tetap: `w-60 bg-slate-900`, `fixed h-screen`, teks `slate-400`.
- Atas: logo/ nama aplikasi "HRIS" `text-white font-bold` + caption role aktif.
- Item: `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium`;
  ikon 20px; aktif = `bg-blue-600 text-white`; hover non-aktif =
  `bg-white/5 text-slate-200`.
- Menu: Dashboard, Karyawan (HR Admin/Manager), Kontrak (HR Admin), Cuti,
  Dokumen, Pengaturan (HR Admin only). Menu yang bukan hak role tidak dirender.
- Bawah sidebar: kartu user (avatar, nama, role) + tombol Keluar.
- Konten area: `lg:pl-60`, topbar sticky dalam area ini (judul halaman + breadcrumb
  opsional + pencarian + avatar).

### 3.8 Navigasi Mobile

- **Topbar** `h-14 fixed top-0` bg putih + shadow bawah: tombol menu (kiri),
  judul halaman, ikon notifikasi opsional (kanan).
- **Bottom nav** `h-16 fixed bottom-0` bg putih + border atas, 4 item:
  **Beranda · Karyawan · Cuti · Lainnya**. Ikon 20px + label 11px; aktif
  `text-blue-600` + titik indikator; item "Lainnya" membuka **drawer**.
- **Drawer**: slide-over kanan `w-72` berisi menu sisa (Kontrak, Dokumen,
  Pengaturan, role-gated) + user card + Keluar. Backdrop hitam 40%.
- Konten: `pt-14 pb-20` (ruang topbar & bottom nav).
- Halaman form panjang: tombol aksi utama menempel di atas bottom nav
  (`sticky bottom-16`) supaya selalu terjangkau.

### 3.9 Komponen pendukung

- **Avatar inisial**: `rounded-full` 28/32/40px, bg netral `slate-200` teks
  `slate-600` (deterministik dari nama).
- **Empty state**: tengah konten, ikon besar `slate-300`, judul `font-medium`,
  kalimat penjelas `text-sm slate-500`, tombol primary/sesuai konteks.
- **Toast**: kanan atas (desktop) / atas tengah (mobile) `rounded-lg shadow-lg`:
  sukses `emerald-600`, error `red-600`, info `slate-800`. Auto-hilang 4 detik.
- **Modal**: konfirmasi destruktif & preview dokumen. `rounded-xl shadow-xl`,
  header judul, body, footer tombol. Mobile: full-width + margin, tombol
  full-width stacked.
- **Skeleton loading**: bentuk blok `bg-slate-100 animate-pulse` mengikuti bentuk
  konten (stat card, baris tabel).
- **Tab/segmented** (mis. halaman Cuti): `border-b` underline aktif biru
  (desktop) atau segmented pill (mobile).

---

## 4. Wireframe per Halaman

Format tiap halaman: tujuan, struktur (atas→bawah), layout mobile, layout
desktop, komponen, catatan interaksi/state.

### Halaman: Login (route: `/login`)

Tujuan: autentikasi email+password sebelum masuk.

Struktur:
1. Kartu login di tengah layar — logo "HRIS" + judul "Masuk ke akun Anda".
2. Form: email, password (+ toggle lihat password), tombol "Masuk".
3. Tautan "Lupa password?" (opsional, arahkan ke HR Admin).
4. Footer caption: "Aplikasi internal — akses terbatas karyawan."

Layout mobile: satu kolom, kartu `mx-4 p-6`, tinggi menyesuaikan; tombol
full-width. Layout desktop: kartu `w-96` di tengah viewport bg `slate-50`
(grade lebih tenang, tanpa sidebar).

Komponen: Card, Form (2 field), Button primary lg, teks error.

Catatan interaksi: submit → tombol loading "Memeriksa…"; password salah →
alert `bg-red-50 border-red-200 text-red-700` di atas form ("Email atau
password salah. Coba lagi."); sukses → redirect `/dashboard` sesuai role.
Session persist (Supabase Auth).

### Halaman: Dashboard (route: `/dashboard`)

Tujuan: ringkasan kondisi HR dalam satu layar + shortcut aksi cepat.

Struktur:
1. Header halaman — judul "Dashboard" + sapaan/tanggal + shortcut aksi
   ("Ajukan Cuti", "Tambah Karyawan" — tombol tersembunyi bila bukan haknya).
2. Stat cards (3): Total Karyawan; Kontrak Berakhir ≤30 Hari (aksen amber,
   sub-teks "X di antaranya ≤7 hari" merah); Cuti Menunggu Persetujuan
   (aksen amber, hanya untuk Manager/HR).
3. Card "Headcount per Departemen" — grafik batang horizontal (label departemen,
   batang, angka). Max 6 departemen + "Lainnya".
4. (Opsional, HR Admin) daftar singkat kontrak ≤30 hari — maksimal 5 baris +
   tautan "Lihat semua" → `/kontrak`.

Layout mobile: stat card grid 2 kolom (kartu ketiga `col-span-2`); grafik penuh;
daftar kontrak sebagai card list. Layout desktop: stat 3 kolom; grid 2 kolom
`lg:grid-cols-3` — grafik 2 kolom kiri, daftar kontrak 1 kolom kanan.

Komponen: StatCard, Card + grafik batang (div murni), Button, CardList,
BadgeStatus, EmptyState (bila tidak ada data).

Catatan interaksi: angka dari DB realtime saat load; role Manager/Karyawan
hanya melihat timnya/diri sendiri (angka berbeda, tidak ada tombol tambah
karyawan); grafik hover menampilkan angka; loading → skeleton.

### Halaman: Karyawan (route: `/karyawan`)

Tujuan: daftar karyawan dengan cari + filter, pintu CRUD & detail.

Struktur:
1. Header — judul "Karyawan", tombol "Tambah Karyawan" (HR Admin only).
2. Toolbar: input cari (nama/NIK/email) + filter Departemen (select) +
   filter Status Kontrak (select) + tombol "Reset".
3. Tabel (desktop) / card list (mobile): kolom Nama (avatar+nama+email), NIK,
   Jabatan, Departemen, Status Kontrak (badge), Tanggal Masuk, Saldo Cuti
   (hari), Aksi.
4. Footer: pagination + "Menampilkan 1–20 dari 128".

Layout mobile: toolbar menumpuk (cari penuh, filter 2 kolom di bawahnya);
data sebagai card list padat; "Tambah Karyawan" jadi tombol ikon (+) di header.
Layout desktop: sidebar + tabel penuh.

Komponen: InputSearch, SelectFilter, TabelDense, BadgeStatus (kontrak),
AvatarInisial, IconButton, Pagination, EmptyState.

Catatan interaksi: cari/filter debounce 300ms, update URL query (shareable);
klik baris → `/karyawan/[id]`; empty state "Tidak ada karyawan yang cocok
dengan pencarian/filter. Reset filter?"; aksi hapus = modal konfirmasi
("Hapus karyawan X? Data tidak bisa dikembalikan.").

### Halaman: Detail Karyawan (route: `/karyawan/[id]`)

Tujuan: profil lengkap + riwayat kontrak & cuti, edit/hapus.

Struktur:
1. Header profil — avatar besar, nama, jabatan, badge status (Aktif/PKWT),
   tombol "Ubah" & "Hapus".
2. Card Data Diri — grid label/value: NIK, email, departemen, atasan,
   tanggal masuk, saldo cuti.
3. Card Riwayat Kontrak — tabel/timeline: jenis kontrak, tanggal mulai–akhir,
   sisa hari (badge), dokumen (tautan surat).
4. Card Riwayat Cuti — tabel: tanggal, jenis, durasi, status (badge), catatan.
5. (Aksi tambahan) tombol "Buat Surat Keterangan" → `/dokumen`.

Layout mobile: header profil ringkas, card menumpuk, riwayat sebagai list.
Layout desktop: 2 kolom `lg:grid-cols-3` — profil 1 kolom kiri, riwayat 2 kolom kanan.

Komponen: Card, TabelDense/CardList, BadgeStatus, TimelineStatus, Modal, Button.

Catatan interaksi: edit = halaman form (sama seperti tambah) + prefilled;
riwayat kosong → empty state per card ("Belum ada riwayat cuti").

### Halaman: Kontrak (route: `/kontrak`)

Tujuan: pantau masa berlaku kontrak + log reminder email otomatis.

Struktur:
1. Header — judul "Kontrak", filter status (Semua / ≤7 hari / ≤30 hari /
   Aman), tombol "Perpanjang Kontrak" (HR Admin).
2. Tabel/card list: Nama, Jenis kontrak (badge), Mulai, Berakhir,
   Sisa Hari (badge warna: merah ≤7, kuning ≤30, hijau/neutral >30), Aksi
   (lihat, perpanjang).
3. Card "Log Reminder" — riwayat email H-30/H-14/H-7 terkirim: tanggal,
   penerima (HR Admin), milestone, status terkirim/gagal.

Layout mobile: daftar sebagai card list padat (nama + badge sisa hari di
kanan atas, tanggal di bawah); log reminder collapsible di bawah. Layout
desktop: tabel penuh + log reminder di card terpisah.

Komponen: BadgeStatus (sisa hari), TabelDense/CardList, SelectFilter,
Card, EmptyState.

Catatan interaksi: sisa hari dihitung otomatis dari tanggal berakhir;
perpanjang = modal form (jenis, tanggal baru) → sukses toast + reset badge;
log reminder read-only; "Belum ada reminder terkirim" bila kosong.

### Halaman: Cuti (route: `/cuti`)

Tujuan: ajukan cuti, pantau status, approval Manager/HR.

Struktur (satu halaman, tab):
1. Tab: "Ajukan Cuti" | "Pengajuan Saya" | "Perlu Persetujuan" (Manager/HR
   only, dengan hitung badge jumlah).
2. Tab Ajukan: form — Jenis (Tahunan/Sakit/Izin), Tanggal Mulai, Tanggal
   Selesai (auto-hitung hari kerja), Alasan (textarea), info saldo
   (awal/terpakai/sisa) + peringatan bila melebihi saldo, tombol "Ajukan Cuti".
3. Tab Pengajuan Saya: tabel riwayat — tanggal, jenis, durasi, status
   (badge), catatan approver; aksi "Batalkan" (hanya saat masih Diajukan).
4. Tab Perlu Persetujuan (Manager/HR): kartu pengajuan — pemohon, jenis,
   tanggal, durasi, alasan, saldo terpotong + form catatan + tombol
   "Setujui" / "Tolak".

Layout mobile: tab segmented penuh; form 1 kolom, tanggal side-by-side;
approval sebagai kartu menumpuk, tombol Setujui/Tolak full-width side-by-side.
Layout desktop: tab underline; form `w-full max-w-xl`; approval 2 kolom
(daftar kiri, detail+aksi kanan) atau kartu per pengajuan.

Komponen: TabSegmented, Form (select+tanggal+textarea), InfoSaldo (card biru),
Button primary/danger, BadgeStatus (cuti), TabelDense/CardList, EmptyState.

Catatan interaksi: hari kerja dihitung sistem (Sabtu/Minggu libur) — tampil
setelah tanggal terisi ("Durasi: 2 hari kerja"); melebihi saldo → blok merah
+ submit disabled; submit loading → toast sukses "Pengajuan terkirim. Menunggu
persetujuan Manager."; approve/reject → modal konfirmasi berisi catatan
(wajib untuk Tolak) → email notifikasi ke pemohon + approver; status
Diajukan → Menunggu HR (setelah Manager) → Disetujui/Ditolak; empty state
"Belum ada pengajuan yang menunggu persetujuan."

### Halaman: Dokumen (route: `/dokumen`)

Tujuan: generate & unduh PDF surat dari template.

Struktur:
1. Header — judul "Dokumen".
2. Pilih jenis surat (card pilihan): Surat Kontrak Kerja, Surat Keterangan
   Kerja, Surat Cuti.
3. Form generate: pilih Karyawan (HR Admin) atau otomatis diri sendiri;
   parameter surat (tanggal, nomor surat bila perlu).
4. Panel preview PDF (iframe area) + tombol "Unduh PDF" / "Cetak".

Layout mobile: pilihan surat jadi list; preview PDF di bawah form, tombol
unduh sticky. Layout desktop: 2 kolom `lg:grid-cols-3` — form kiri, preview
kanan.

Komponen: CardPilihanSurat, Form, PanelPreview (`aspect-[1/1.414]`
placeholder), Button primary (Unduh) + secondary (Cetak), EmptyState
("Pilih jenis surat untuk melihat preview").

Catatan interaksi: generate server-side (@react-pdf/renderer); preview
loading skeleton; gagal → toast error; template diedit di `/pengaturan`.

### Halaman: Pengaturan (route: `/pengaturan`, HR Admin only)

Tujuan: kelola user & role + edit template email/dokumen.

Struktur:
1. Tab: "Pengguna & Role" | "Template".
2. Tab Pengguna: tabel — nama, email, role (badge), status, aksi
   (ubah role, reset password, nonaktifkan); tombol "Tambah Pengguna".
3. Tab Template: daftar template (email reminder H-30/H-14/H-7, notifikasi
   cuti, surat kontrak/kerja/cuti); editor judul + isi teks dengan
   placeholder `{{nama}}`, `{{tanggal}}`, dll (daftar placeholder di samping
   editor, klik untuk sisipkan); tombol "Simpan Template" + "Kembalikan
   ke Default".

Layout mobile: tab segmented; tabel pengguna jadi list; editor template
full-width dengan daftar placeholder collapsible di atas editor.
Layout desktop: 2 kolom pada tab Template — daftar template kiri (`w-64`),
editor kanan.

Komponen: TabSegmented, TabelDense/CardList, BadgeRole, TextareaEditor
(monospace `font-mono text-[13px]`), Button, Modal konfirmasi.

Catatan interaksi: ubah role → konfirmasi modal; reset password → modal +
toast "Email reset terkirim"; nonaktifkan user → modal destruktif
(danger); menyimpan template → validasi placeholder tak dikenal tampil
error bawah editor; halaman redirect ke 404/dashboard bila dibuka bukan
HR Admin.

---

## 5. Copywriting (ringkas)

- Tombol: kata kerja + objek, tanpa titik: "Simpan Perubahan", "Ajukan Cuti".
- Error: sebab + solusi: "NIK sudah terdaftar. Gunakan NIK lain."
- Empty state: "Belum ada data X" + kalimat + aksi.
- Konfirmasi destruktif: sebut nama objek: "Hapus karyawan Budi Santoso?"

---

## 6. Aksesibilitas (WCAG 2.2 AA)

- Kontras teks utama ≥ 4.5:1 (slate-700 di white ≈ 10:1; badge: slate-700 on
  slate-100 dsb — hindari teks amber-500 di white).
- Semua input punya `<label>`; error di-`aria-describedby` + `aria-invalid`.
- Badge status tidak bergantung warna saja (selalu ada teks; ikon tambahan
  boleh). Tabel punya `<th scope>`; ikon-only button punya `aria-label`.
- Navigasi keyboard: urutan DOM = urutan visual; focus ring terlihat;
  drawer/modal punya focus trap + Escape menutup.
- Bottom nav mobile target tap ≥ 40px; jarak antar tombol destruktif &
  konfirmasi cukup (mencegah salah tap).

---

## 7. Catatan untuk tim implementasi

- **Raka (frontend)**: semua token di §2 map langsung ke Tailwind default
  (blue/slate/emerald/amber/red/sky) — tidak perlu extend config kecuali
  font Inter. Komponen bersifat reusable: Button, Card, Badge, DataTable
  (+ variant CardList mobile), FormField, EmptyState, Modal, Toast, Shell
  (sidebar + topbar + bottom nav + drawer). Route group public (`/login`)
  vs app shell (layout dengan Shell). Sembunyikan menu berdasar role di
  server component, bukan CSS.
- **Dimas (backend)**: setiap form/wireframe menyebut state loading/error —
  server action harus return field error per-field. Approval cuti & reminder
  kontrak wajib kirim email (Resend) — pastikan payload sesuai placeholder
  template di Pengaturan.
- Keputusan Bima (PM, 2026-10-11, ACC Gate 2):
  1. Saldo cuti HANYA untuk jenis Tahunan. Sakit/izin tidak memotong saldo
     dan tidak dibatasi saldo (tapi tetap dicatat di riwayat).
  2. Milestone reminder (H-30/H-14/H-7) dihitung per PERIODE kontrak.
     Perpanjangan = periode baru = milestone reset (reminder kirim ulang
     untuk periode baru).
