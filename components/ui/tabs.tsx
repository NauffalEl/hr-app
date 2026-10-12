/** Tab berbasis link (?tab= / filter) — server-friendly, underline desktop, segmented mobile. */
export function Tabs({
  items,
  active,
  className = '',
}: {
  items: { href: string; label: string; badge?: number; badgeLabel?: string }[];
  active: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Tab"
      className={`mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 md:gap-2 md:overflow-visible md:rounded-none md:bg-transparent md:border-b md:border-slate-200 md:p-0 ${className}`}
    >
      {items.map((it) => {
        const isActive = it.href === active;
        return (
          <a
            key={it.href}
            href={it.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:h-auto md:flex-none md:rounded-none md:px-1 md:text-sm ${
              isActive
                ? 'bg-white text-blue-600 shadow-sm md:-mb-px md:bg-transparent md:font-semibold md:shadow-none md:ring-2 md:ring-inset md:ring-blue-600'
                : 'text-slate-500 hover:text-slate-700 md:px-3 md:hover:bg-slate-100'
            }`}
          >
            {it.label}
            {typeof it.badge === 'number' && it.badge > 0 && (
              <span
                className={`num inline-flex min-w-[20px] items-center justify-center rounded-full px-1 py-0.5 text-[11px] font-semibold ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {it.badge}
                <span className="sr-only"> {it.badgeLabel ?? 'pengajuan'}</span>
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
