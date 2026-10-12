# Kontrak Frontend ↔ Backend (Raka ↔ Dimas)

Frontend (Raka): `app/**` (halaman + shell), `components/**`, `tailwind.config.ts`,
`app/globals.css`, `package.json`, `postcss.config.mjs`, `docs/contracts.md`.
Backend (Dimas): `lib/**`, `app/api/**`, `middleware.ts`, `prisma/**`, `scripts/**`.

## 1. Sesi & role

- Frontend **tidak memanggil `getCurrentSession()` langsung** (session hanya
  `{ userId, email, mock }`, tanpa role).
- Semua guard/nav memakai `getSessionUser()` di `app/_lib/authz.ts` →
  `getAuthContext()` (`lib/auth.ts`): null bila belum login / user nonaktif.
  Return: `{ userId, email, role, employeeId, nama, jabatan }`.
- Guard page-level (Bima #8):
  - `app/(app)/layout.tsx` → session null → `redirect('/login')`.
  - `/kontrak` + `/pengaturan` → `role !== 'HR_ADMIN'` → `redirect('/dashboard')`.
  - `/karyawan` (+ `/baru`, `/[id]`, `/[id]/edit`) → `role === 'KARYAWAN'` →
    `redirect('/dashboard')`; `/karyawan/baru` & `/edit` juga HR-only
    (MANAGER → `/karyawan`).
  - `/cuti?tab=persetujuan` → KARYAWAN dipaksa `tab=ajukan`.
- Menu role-aware dihitung **server** (`components/shell/nav.ts`), bukan CSS.

## 2. Cara frontend memanggil action

Semua lewat adapter **`app/_lib/actions.ts` (`'use server'`)** — satu titik
integrasi. Kalau nama/argout berubah, cukup ubah file itu.

- Signature umum action Dimas: `(input: Record<string, unknown>) =>
  Promise<ActionResult<T>>`, `ActionResult<T> = { ok: true; data: T } |
  { ok: false; status: number; error: string }` (dari `wrap()`).
- Form client memakai pola `Result<T>` → `FormState`:
  `{ ok: boolean; message?: string; fieldErrors?: Record<string,string>; data?: unknown }`.
  Pemetaan di `app/_lib/form.ts::fromAction(res, fields)`:
  pesan error server yang diawali/mengandung nama field → `fieldErrors[field]`,
  sisanya → `message` (alert `role="alert"` di atas form).
  **Karena itu pesan `ActionError` sebaiknya diawali nama field**
  (`nik tidak valid`, `email sudah dipakai`, …).
- State form: `useActionState(submit, null)`, tombol `loading` = spinner +
  label "Menyimpan…", semua field punya `label` + `aria-describedby`.

## 3. Action yang dipakai frontend (import dari `app/_lib/actions.ts`)

| Adapter | Action Dimas | Input | Dipakai di |
|---|---|---|---|
| `login` | `auth.login` | `{email, password}` | `/login` |
| `logout` | `auth.logout` | – | Shell (sidebar & drawer) |
| `getEmployees` | `listEmployees` | `{q, departemen, statusKontrak, page, pageSize}` → `Page<EmployeeListItem>` (sudah termasuk `saldoCuti` tahun berjalan, `null` = belum diatur) | `/karyawan`, dashboard, dropdown atasan/karyawan |
| `getEmployeeDetail` | `getEmployee` | `{id}` → employee + `user`, `atasan`, `contracts[]`, `leaveBalances[]` | `/karyawan/[id]`, `/edit` |
| `saveEmployee` / `changeEmployee` / `removeEmployee` | `createEmployee` / `updateEmployee` / `deleteEmployee` | field employee (+`atasanId`, `id`) | form karyawan, hapus |
| `getDepartments` | `listDepartments` | – → `string[]` | filter & datalist departemen |
| `getContracts` | `listContracts` | `{maxSisaHari?, minSisaHari?, page, pageSize}` → `Page<ContractRow>` | `/kontrak`, dashboard |
| `getReminderLogs` | `listReminderLogs` | `{pageSize}` → `Page<ReminderLogRow>` | `/kontrak` |
| `addContract` | `createContract` | `{employeeId, jenis, tanggalMulai, tanggalAkhir}` (perpanjangan = INSERT periode baru) | modal perpanjang |
| `getLeaves` | `listLeaves` | `{status?, employeeId?, page, pageSize}` → `Page<LeaveRow>` | `/cuti` (saya/persetujuan), riwayat di detail |
| `sendLeave` | `submitLeave` | `{jenis, tanggalMulai, tanggalAkhir, alasan}` | form ajukan cuti |
| `approveLeave` / `rejectLeave` | `approveLeave` / `rejectLeave` | `{id, catatan}` (catatan **wajib** saat reject — divalidasi client + server) | kartu approval |
| `cancelLeave` | `cancelLeave` | `{id}` | "Batalkan" (hanya PENDING milik sendiri) |
| `saveLeaveBalance` | `setLeaveBalance` | `{employeeId, tahun, saldoAwal}` | kartu Saldo Cuti Tahunan (HR) |
| `getDashboard` | `getDashboardStats` | – → `{scope, totalKaryawan, pendingCuti, kontrakSelesai30Hari, karyawanAktifKontrak, cutiDisetujuiBulanIni}` | `/dashboard` |
| `getMeta` | `getMeta` | – → enum + `departemen` + `documentTemplates` | `/pengaturan` |
| `makeDocument` | `generateDocument` | `{type, employeeId}` → `{base64, filename}` (data URL untuk preview + unduh) | `/dokumen` |
| `getUsers` / `addUser` / `changeUserRole` / `setUserActive` / `sendPasswordReset` | `admin.*` | `{page,pageSize}` / `{email,password,role,employeeId}` / `{id,role}` / `{id,active}` / `{email}` | `/pengaturan` tab Pengguna |
| `getEmailTemplates` / `saveEmailTemplate` / `resetEmailTemplate` / `saveDocumentTemplate` | `admin.*` | – / `{key,subject,bodyHtml}` / `{key}` / `{key,name,content}` | `/pengaturan` tab Template |

Frontend juga memakai **baca murni** `getLeaveBalance(employeeId, tahun)` dan
`hitungHariKerja` dari `lib/leave.ts` (server component saja).

## 4. PLACEHOLDER yang menunggu Dimas

`lib/actions/auth.ts` dibuat Raka sebagai placeholder build:

```ts
'use server';
export async function login(input: unknown): Promise<unknown>;  // {email,password} -> ActionResult<{userId}>
export async function logout(): Promise<unknown>;               // -> ActionResult<null>
```

Ganti isi dengan implementasi asli (Supabase `signInWithPassword` + `signOut`),
**signature dipertahankan**. Login sukses boleh `redirect('/dashboard')` di dalam
action — client juga redirect kalau action mengembalikan `{ok:true}` (idempoten).
Logout sukses cukup return `{ok:true}` (client → `router.replace('/login')`).

## 5. Celah yang diketahui (butuh keputusan Dimas/Bima)

1. **`listDocumentTemplates` belum ada** — tab Template hanya bisa membaca
   template email (`listEmailTemplates`). Editor template surat (`surat_*`)
   tidak bisa prefill: UI sengaja start kosong dan **menolak save kosong**
   (biar tidak menimpa isi). Bila action `listDocumentTemplates(): ActionResult<
   {key,name,content}[]>` tersedia, Raka prefill editor + tombol reset.
   Tombol "Kembalikan ke Default" saat ini hanya untuk template email.
2. **Tombol reset document template** belum ada endpoint-nya.
3. Topbar tidak menampilkan pencarian global (belum ada endpoint gabungan) —
   pencarian tetap di halaman masing-masing.

## 6. Catatan build

- `package.json` (dimiliki Raka) berisi `tailwindcss`, `postcss`, `autoprefixer`
  di devDependencies — **jangan dihapus** saat menambah dependensi backend.
- Verifikasi: `npm install` lalu `npm run build` (target 0 error).
- Jangan `npx prisma` dari frontend; `@prisma/client` sudah ter-generate oleh
  Dimas.

## 7. Route frontend

| Route | Guard | Sumber data |
|---|---|---|
| `/login` | publik | `login` |
| `/` | redirect `/dashboard` | – |
| `/dashboard` | session | `getDashboardStats`, `listEmployees`, `listLeaves`, `listContracts` |
| `/karyawan` | bukan KARYAWAN | `listEmployees` (q/departemen/statusKontrak/page), `listDepartments` |
| `/karyawan/baru` | HR_ADMIN | `listEmployees` (opsi atasan), `listDepartments` |
| `/karyawan/[id]` | bukan KARYAWAN | `getEmployee`, `listLeaves`; kartu saldo HR-only → `setLeaveBalance` |
| `/karyawan/[id]/edit` | HR_ADMIN | `getEmployee` + form sama |
| `/kontrak` | HR_ADMIN | `listContracts` (`maxSisaHari`/`minSisaHari` server-side; Aman = `minSisaHari: 31`), `listReminderLogs`, `createContract` |
| `/cuti` | session (tab approval bukan KARYAWAN) | `listLeaves`, `getLeaveBalance`, `submitLeave`, `approve/reject/cancelLeave` |
| `/dokumen` | session | `listEmployees` (HR), `generateDocument` |
| `/pengaturan` | HR_ADMIN | `listUsers`, `listEmailTemplates`, `getMeta`, aksi admin |
