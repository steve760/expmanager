import { ReactNode } from 'react';

export const LABEL_CLASS =
  'block text-sm font-medium text-stone-600 dark:text-stone-400';

export const SECTION_HEADING_CLASS =
  'text-[11px] font-semibold text-stone-400 dark:text-stone-500';

export const FIELD_VALUE_CLASS =
  'text-sm text-stone-800 dark:text-stone-200';

export function ModalLabel({
  htmlFor,
  children,
  className = '',
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`${LABEL_CLASS} ${className}`}>
      {children}
    </label>
  );
}

export function ModalSectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mb-0.5 text-[11px] font-medium text-stone-400 dark:text-stone-500 ${className}`}>
      {children}
    </div>
  );
}

/** Section title with a thin extending rule — use inside any card section. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="shrink-0 text-[11px] font-semibold text-stone-400 dark:text-stone-500">{children}</span>
      <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
    </div>
  );
}

export function ViewOnlySection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-stone-200/80 bg-stone-50 px-4 py-3.5 dark:border-stone-700 dark:bg-stone-800/50 ${className}`}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}
