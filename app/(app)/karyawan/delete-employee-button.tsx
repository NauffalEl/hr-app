'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeEmployee } from '@/app/_lib/actions';
import { Button, IconButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/** Hapus karyawan: modal konfirmasi dengan nama objek (§5). HR Admin saja. */
export function DeleteEmployeeButton({ id, nama, withLabel = false }: { id: string; nama: string; withLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const confirm = () =>
    startTransition(async () => {
      const res = await removeEmployee({ id });
      if (res.ok) {
        toast.success(`Karyawan ${nama} dihapus.`);
        setOpen(false);
        router.push('/karyawan');
        router.refresh();
      } else {
        toast.error(res.error);
        setOpen(false);
      }
    });

  return (
    <>
      {withLabel ? (
        <Button variant="dangerOutline" size="sm" onClick={() => setOpen(true)}>
          <Icon name="trash" className="h-4 w-4" />
          Hapus
        </Button>
      ) : (
        <IconButton label={`Hapus ${nama}`} onClick={() => setOpen(true)} className="relative z-10 text-red-600 hover:bg-red-50">
          <Icon name="trash" className="h-4 w-4" />
        </IconButton>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Hapus karyawan ${nama}?`}
        description="Data tidak bisa dikembalikan."
        labelledBy="hapus-karyawan-title"
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" size="lg" loading={pending} loadingLabel="Menghapus…" onClick={confirm}>
              Hapus Karyawan
            </Button>
          </>
        }
      />
    </>
  );
}
