'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addUser, changeUserRole, sendPasswordReset, setUserActive } from '@/app/_lib/actions';
import { fd, fromAction } from '@/app/_lib/form';
import type { ActionResult, FormState, Role, UserRow } from '@/app/_lib/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, inputCls, selectCls } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

const ROLE_LABEL: Record<Role, string> = { HR_ADMIN: 'HR Admin', MANAGER: 'Manager', KARYAWAN: 'Karyawan' };
const ROLE_VARIANT: Record<Role, 'info' | 'success' | 'neutral'> = {
  HR_ADMIN: 'info',
  MANAGER: 'success',
  KARYAWAN: 'neutral',
};

type Kind = 'add' | 'role' | 'reset' | 'toggle';

/** Kelola pengguna & role: tambah, ubah role, reset password, aktif/nonaktif. */
export function UsersPanel({
  users,
  employees,
  selfId,
}: {
  users: UserRow[];
  employees: { id: string; nama: string }[];
  selfId: string;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(submit, null);
  const router = useRouter();
  const toast = useToast();

  const close = () => {
    setKind(null);
    setTarget(null);
  };

  async function submit(_prev: FormState, formData: FormData): Promise<FormState> {
    const v = fd(formData);
    const fieldErrors: Record<string, string> = {};
    let res: ActionResult<unknown>;

    if (kind === 'add') {
      if (!v.email) fieldErrors.email = 'Email wajib diisi.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v.email))) fieldErrors.email = 'Format email tidak valid.';
      if (!v.password || String(v.password).length < 8) fieldErrors.password = 'Password minimal 8 karakter.';
      if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
      res = await addUser({
        email: String(v.email),
        password: String(v.password),
        role: String(v.role),
        employeeId: String(v.employeeId ?? ''),
      });
    } else if (kind === 'role' && target) {
      res = await changeUserRole({ id: target.id, role: String(v.role) });
    } else if (kind === 'reset' && target) {
      res = await sendPasswordReset({ email: target.email });
    } else if (kind === 'toggle' && target) {
      res = await setUserActive({ id: target.id, active: String(v.aktif ?? '') === 'on' });
    } else {
      return { ok: false, message: 'Aksi tidak dikenal.' };
    }

    const mapped = fromAction(res, ['email', 'password', 'role']);
    if (mapped?.ok) {
      toast.success(
        kind === 'add'
          ? 'Pengguna ditambahkan.'
          : kind === 'role'
            ? 'Role pengguna diubah.'
            : kind === 'reset'
              ? 'Email reset terkirim.'
              : 'Status pengguna diperbarui.'
      );
      close();
      router.refresh();
    }
    return mapped;
  }

  const fe = state?.fieldErrors;
  const titles: Record<Kind, string> = {
    add: 'Tambah Pengguna',
    role: target ? `Ubah role ${target.email}` : 'Ubah role',
    reset: target ? `Reset password ${target.email}?` : 'Reset password',
    toggle: target ? (target.active ? `Nonaktifkan ${target.email}?` : `Aktifkan ${target.email}?`) : 'Ubah status',
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Pengguna & Role"
          action={
            <Button size="sm" onClick={() => setKind('add')}>
              <Icon name="plus" className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah Pengguna</span>
            </Button>
          }
        />
        {users.length === 0 ? (
          <EmptyState
            icon="user"
            title="Belum ada pengguna"
            description="Buat akun login untuk karyawan agar bisa masuk ke aplikasi."
          />
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nama</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                    <th scope="col" className="h-10 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th scope="col" className="h-10 px-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="h-12 px-4">
                        <span className="flex items-center gap-3">
                          <Avatar nama={u.employee?.nama ?? u.email} size={28} />
                          <span className="font-medium text-slate-900">{u.employee?.nama ?? '—'}</span>
                        </span>
                      </td>
                      <td className="h-12 px-4 text-slate-700">{u.email}</td>
                      <td className="h-12 px-4">
                        <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      </td>
                      <td className="h-12 px-4">
                        <Badge variant={u.active ? 'success' : 'neutral'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                      </td>
                      <td className="h-12 px-4">
                        <span className="flex items-center justify-end gap-1">
                          <IconButton
                            label={`Ubah role ${u.email}`}
                            disabled={u.id === selfId}
                            onClick={() => {
                              setTarget(u);
                              setKind('role');
                            }}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </IconButton>
                          <IconButton label={`Reset password ${u.email}`} onClick={() => { setTarget(u); setKind('reset'); }}>
                            <Icon name="mail" className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label={u.active ? `Nonaktifkan ${u.email}` : `Aktifkan ${u.email}`}
                            disabled={u.id === selfId}
                            className={u.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}
                            onClick={() => {
                              setTarget(u);
                              setKind('toggle');
                            }}
                          >
                            <Icon name={u.active ? 'close' : 'check'} className="h-4 w-4" />
                          </IconButton>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* List mobile */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {users.map((u) => (
                <li key={u.id} className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{u.employee?.nama ?? u.email}</p>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                    <div className="mt-1 flex gap-1.5">
                      <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      <Badge variant={u.active ? 'success' : 'neutral'}>{u.active ? 'Aktif' : 'Nonaktif'}</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton
                      label={`Ubah role ${u.email}`}
                      disabled={u.id === selfId}
                      onClick={() => {
                        setTarget(u);
                        setKind('role');
                      }}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </IconButton>
                    <IconButton label={`Reset password ${u.email}`} onClick={() => { setTarget(u); setKind('reset'); }}>
                      <Icon name="mail" className="h-4 w-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Modal open={kind !== null} onClose={close} title={kind ? titles[kind] : ''} labelledBy="modal-pengguna-title">
        <form action={formAction} noValidate className="space-y-4">
          {state && !state.ok && state.message && !fe && (
            <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
              {state.message}
            </div>
          )}

          {kind === 'add' && (
            <>
              <Field id="email" label="Email" required error={fe?.email}>
                {(ctl) => <input {...ctl} type="email" name="email" placeholder="nama@perusahaan.com" className={inputCls(fe?.email)} />}
              </Field>
              <Field id="password" label="Password" required error={fe?.password} helper="Minimal 8 karakter.">
                {(ctl) => <input {...ctl} type="password" name="password" autoComplete="new-password" className={inputCls(fe?.password)} />}
              </Field>
              <Field id="role" label="Role" required>
                {(ctl) => (
                  <select {...ctl} name="role" defaultValue="KARYAWAN" className={selectCls()}>
                    <option value="KARYAWAN">Karyawan</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR_ADMIN">HR Admin</option>
                  </select>
                )}
              </Field>
              <Field id="employeeId" label="Hubungkan ke karyawan" helper="Opsional — agar nama & data cuti terpakai.">
                {(ctl) => (
                  <select {...ctl} name="employeeId" defaultValue="" className={selectCls()}>
                    <option value="">— Tidak dihubungkan —</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nama}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </>
          )}

          {kind === 'role' && (
            <Field id="role" label="Role baru" required>
              {(ctl) => (
                <select {...ctl} name="role" defaultValue={target?.role ?? 'KARYAWAN'} className={selectCls()}>
                  <option value="KARYAWAN">Karyawan</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR_ADMIN">HR Admin</option>
                </select>
              )}
            </Field>
          )}

          {kind === 'reset' && (
            <p className="text-sm text-slate-600">
              Link reset password akan dikirim ke <span className="font-medium">{target?.email}</span>.
            </p>
          )}

          {kind === 'toggle' && target && (
            <>
              <p className="text-sm text-slate-600">
                {target.active
                  ? 'Pengguna tidak akan bisa masuk sampai diaktifkan kembali.'
                  : 'Pengguna akan bisa masuk kembali ke aplikasi.'}
              </p>
              <input type="hidden" name="aktif" value={target.active ? '' : 'on'} />
            </>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" onClick={close}>
              Batal
            </Button>
            <Button
              type="submit"
              variant={kind === 'toggle' && target?.active ? 'danger' : 'primary'}
              size="lg"
              loading={pending}
              loadingLabel="Menyimpan…"
            >
              {kind === 'add'
                ? 'Tambah Pengguna'
                : kind === 'role'
                  ? 'Simpan Role'
                  : kind === 'reset'
                    ? 'Kirim Email Reset'
                    : target?.active
                      ? 'Nonaktifkan'
                      : 'Aktifkan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
