/** Pagination + info "Menampilkan 1–20 dari 128" (§3.3). */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const cls =
    'inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
  const clsDisabled = 'inline-flex h-9 cursor-not-allowed items-center rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-400';
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-slate-500">
        Menampilkan <span className="num">{from}</span>–<span className="num">{to}</span> dari{' '}
        <span className="num">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <a href={hrefFor(page - 1)} className={cls} rel="prev">
            Sebelumnya
          </a>
        ) : (
          <span className={clsDisabled} aria-disabled="true">
            Sebelumnya
          </span>
        )}
        <span className="px-1 text-[13px] text-slate-500">
          <span className="num">{page}</span> / <span className="num">{totalPages}</span>
        </span>
        {page < totalPages ? (
          <a href={hrefFor(page + 1)} className={cls} rel="next">
            Berikutnya
          </a>
        ) : (
          <span className={clsDisabled} aria-disabled="true">
            Berikutnya
          </span>
        )}
      </div>
    </div>
  );
}
