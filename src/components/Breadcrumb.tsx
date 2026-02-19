interface BreadcrumbProps {
  /** Optional brand (logo + product name) */
  brand?: React.ReactNode;
  /** Optional right-side actions (e.g. Add phase + menu on journey map) */
  actions?: React.ReactNode;
}

export function Breadcrumb({ brand, actions }: BreadcrumbProps) {
  return (
    <div className="flex flex-shrink-0 flex-row flex-wrap items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-700 dark:bg-stone-800">
      <div className="flex min-h-[2rem] items-center gap-4">{brand}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
