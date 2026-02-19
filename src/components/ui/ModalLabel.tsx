/** App-wide label style: filters, modals, tables. Use for all field/section/column labels. */
export const LABEL_CLASS =
  'mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300';

/** Consistent label for modal form fields. Use for field labels in create/edit modals. */
export const MODAL_LABEL_CLASS = LABEL_CLASS;

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
    <label htmlFor={htmlFor} className={`${MODAL_LABEL_CLASS} ${className}`.trim()}>
      {children}
    </label>
  );
}

/** Section label for read-only modal content (e.g. FieldSection). Styled as H3. */
export const MODAL_SECTION_LABEL_CLASS =
  'mb-1.5 block text-base font-semibold text-stone-700 dark:text-stone-300';

export function ModalSectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className={MODAL_SECTION_LABEL_CLASS}>{children}</h3>;
}

/** Section heading for panels/drawers (Overview, Customer, etc.). Use with <h3>. */
export const SECTION_HEADING_CLASS =
  'mb-4 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400';

/** Standard input/textarea text size for app-wide consistency. */
export const INPUT_TEXT_CLASS = 'text-sm';

/** Wrapper for view-only modal sections: card-style block with optional heading. */
export function ViewOnlySection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-600 dark:bg-stone-800/80 ${className}`.trim()}
    >
      {title && (
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
