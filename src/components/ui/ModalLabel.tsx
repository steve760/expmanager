export const LABEL_CLASS =
  'block text-sm font-medium text-stone-700 dark:text-stone-300';

export const SECTION_HEADING_CLASS =
  'text-sm font-semibold text-stone-800 dark:text-stone-200';

export function ModalLabel({
  htmlFor,
  children,
  className = '',
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`${LABEL_CLASS} ${className}`}>
      {children}
    </label>
  );
}

export function ModalSectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ${className}`}>
      {children}
    </div>
  );
}

export function ViewOnlySection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h4 className="mb-2 text-sm font-semibold text-stone-800 dark:text-stone-200">{title}</h4>
      {children}
    </div>
  );
}
