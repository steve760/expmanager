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
    <div className={`mb-2 text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400 ${className}`}>
      {children}
    </div>
  );
}

/** Section title with a thin extending rule — use inside any card section. */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-semibold text-stone-400 dark:text-stone-500">
      {children}
    </div>
  );
}

/** Read-only value text: comfortable line-height and colour for body copy. */
export const VALUE_CLASS = 'text-sm leading-relaxed text-stone-700 dark:text-stone-300';

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
    <section className={className}>
      <h3 className="mb-3 text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100">
        {title}
      </h3>
      {children}
    </section>
  );
}
