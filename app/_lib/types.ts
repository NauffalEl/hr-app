// Tipe DTO frontend — kontrak dikunci di docs/contracts.md (sinkron dengan lib/actions/*).

export type Role = 'HR_ADMIN' | 'MANAGER' | 'KARYAWAN';
export type ContractType = 'PKWT' | 'PKWTT' | 'MAGANG';
export type ContractStatus = 'AKTIF' | 'BERAKHIR' | 'UPCOMING';
export type LeaveType = 'TAHUNAN' | 'SAKIT' | 'IZIN';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type FieldErrors = Record<string, string>;

// Pola Result<T> untuk semua form: fieldErrors per-field, message untuk error umum.
export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: FieldErrors;
  data?: unknown;
} | null;

export type ActionResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export type Page<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

export type SessionUser = {
  userId: string;
  email: string;
  role: Role;
  employeeId: string | null;
  nama: string;
  jabatan: string | null;
};

export type SaldoCuti = { tahun: number; saldoAwal: number; terpakai: number; sisa: number };

export type EmployeeListItem = {
  id: string;
  userId: string | null;
  nik: string;
  nama: string;
  email: string;
  jabatan: string;
  departemen: string;
  tanggalMasuk: string;
  statusKontrak: ContractType;
  atasan: { id: string; nama: string } | null;
  user: { id: string; email: string; role: Role; active: boolean } | null;
  saldoCuti: SaldoCuti | null; // null = 'Belum diatur HR'
};

export type ContractRow = {
  id: string;
  employeeId: string;
  jenis: ContractType;
  status: ContractStatus;
  tanggalMulai: string;
  tanggalAkhir: string | null;
  sisaHari: number | null; // null = tanpa tanggalAkhir (PKWTT)
  employee: { id: string; nama: string; nik: string; departemen: string };
};

export type ReminderLogRow = {
  id: string;
  milestone: 'H30' | 'H14' | 'H7';
  tanggalMulaiPeriode: string;
  status: 'SENT' | 'FAILED';
  kirimKe: string;
  error: string | null;
  createdAt: string;
  contract: { employee: { nama: string; nik: string } };
};

export type LeaveRow = {
  id: string;
  employeeId: string;
  jenis: LeaveType;
  status: LeaveStatus;
  tanggalMulai: string;
  tanggalAkhir: string;
  alasan: string;
  catatanApprover: string | null;
  createdAt: string;
  employee: { id: string; nama: string; nik: string; departemen: string };
  approver: { id: string; nama: string } | null;
};

export type EmployeeDetail = {
  id: string;
  userId: string | null;
  nik: string;
  nama: string;
  email: string;
  jabatan: string;
  departemen: string;
  tanggalMasuk: string;
  statusKontrak: ContractType;
  atasanId: string | null;
  atasan: { id: string; nama: string } | null;
  user: { id: string; email: string; role: Role; active: boolean } | null;
  contracts: {
    id: string;
    jenis: ContractType;
    status: ContractStatus;
    tanggalMulai: string;
    tanggalAkhir: string | null;
  }[];
  leaveBalances: SaldoCuti[];
};

export type DashboardStats = {
  scope: Role;
  totalKaryawan: number;
  pendingCuti: number;
  kontrakSelesai30Hari: number;
  karyawanAktifKontrak: number;
  cutiDisetujuiBulanIni: number;
};

export type UserRow = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  employee: { id: string; nama: string; nik: string; departemen: string } | null;
};

export type EmailTemplateRow = { key: string; subject: string; bodyHtml: string };

export type Meta = {
  roles: Role[];
  contractTypes: ContractType[];
  contractStatuses: ContractStatus[];
  leaveTypes: LeaveType[];
  leaveStatuses: LeaveStatus[];
  documentTypes: ('kontrak' | 'keterangan' | 'cuti')[];
  documentTemplates: string[];
  departemen: string[];
  tahun: number[];
};
