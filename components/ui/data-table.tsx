import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  label: string;
  /** sel header kiri (default) / kanan (angka) */
  align?: 'left' | 'right';
  className?: string;
  render: (row: T) => ReactNode;
};

/**
 * Tabel desktop + card list mobile (§3.3/§3.6). Server component tanpa JS:
 * klik baris = stretched link di sel pertama; aksi baris di atasnya (z-10).
 */
export function DataTable<T>({
  columns,
  rows,
  getHref,
  getRowLabel,
  mobileCard,
}: {
  columns: Column<T>[];
  rows: T[];
  getHref?: (row: T) => string;
  getRowLabel?: (row: T) => string;
  mobileCard: (row: T) => ReactNode;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`sticky top-0 z-10 h-10 whitespace-nowrap bg-slate-50 px-4 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                    c.align === 'right' ? 'text-right' : 'text-left'
                  } ${c.className ?? ''}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const href = getHref?.(row);
              return (
                <tr key={i} className="relative border-b border-slate-100 transition-colors hover:bg-slate-50">
                  {columns.map((c, ci) => (
                    <td
                      key={c.key}
                      className={`h-12 px-4 align-middle ${c.align === 'right' ? 'text-right' : 'text-left'} ${
                        c.className ?? ''
                      }`}
                    >
                      {ci === 0 && href ? (
                        <a
                          href={href}
                          aria-label={getRowLabel?.(row)}
                          className="block text-inherit after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {c.render(row)}
                        </a>
                      ) : (
                        c.render(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list padat */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row, i) => {
          const card = <>{mobileCard(row)}</>;
          return (
            <li key={i}>
              {getHref ? (
                <a
                  href={getHref(row)}
                  aria-label={getRowLabel?.(row)}
                  className="block px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {card}
                </a>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
