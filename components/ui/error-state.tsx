import { Card, CardBody } from './card';
import { EmptyState } from './empty-state';

/** Error load data server (action tidak ok / gagal). */
export function ErrorState({ message }: { message?: string }) {
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon="alertCircle"
          title="Gagal memuat data"
          description={message ?? 'Terjadi kesalahan di server. Coba muat ulang halaman.'}
        />
      </CardBody>
    </Card>
  );
}
