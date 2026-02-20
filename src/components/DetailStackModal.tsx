import { ReactNode } from 'react';

export type DetailStackEntry =
  | { type: 'job'; id: string; mode: 'view' | 'edit' }
  | { type: 'opportunity'; id: string; mode: 'view' | 'edit' }
  | { type: 'insight'; id: string; mode: 'view' | 'edit' };

interface DetailStackModalProps {
  isOpen: boolean;
  stack: DetailStackEntry[];
  onBack: () => void;
  onClose: () => void;
  getTitle: (entry: DetailStackEntry) => string;
  renderPanel: (entry: DetailStackEntry) => ReactNode;
  /** When provided, rendered as bottom-anchored footer (e.g. Save/Cancel when editing). Use for edit mode. */
  renderFooter?: (entry: DetailStackEntry) => ReactNode;
  maxWidth?: string;
}

export function DetailStackModal({
  isOpen,
  stack,
  onBack,
  onClose,
  getTitle,
  renderPanel,
  renderFooter,
  maxWidth = 'max-w-2xl',
}: DetailStackModalProps) {
  if (!isOpen || stack.length === 0) return null;

  const current = stack[stack.length - 1];
  const canGoBack = stack.length > 1;
  const footerContent = renderFooter?.(current);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 isolate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stack-modal-title"
    >
      <div
        className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full flex-col ${maxWidth} rounded-2xl bg-white shadow-elevated dark:bg-stone-800 dark:shadow-elevated-dark animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Back | Title | Close — primary purple */}
        <header className="flex shrink-0 items-center gap-3 border-b border-[#2d1648] bg-[#361D60] px-6 py-4 dark:border-[#2d1648] dark:bg-[#361D60]">
          {canGoBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
              aria-label="Back"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <span className="w-[52px]" />
          )}
          <h2 id="stack-modal-title" className="min-w-0 flex-1 truncate text-xl font-semibold text-white">
            {getTitle(current)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-2.5 font-medium text-[#361D60] hover:bg-white/90"
          >
            Close
          </button>
        </header>

        {/* Sliding panels — new panel slides in from the right */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full min-h-0 will-change-transform"
            style={{
              width: `${stack.length * 100}%`,
              transform: `translateX(-${((stack.length - 1) / stack.length) * 100}%)`,
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {stack.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}-${entry.mode}`}
                className="flex min-h-0 flex-shrink-0 flex-col"
                style={{ width: `${100 / stack.length}%` }}
              >
                <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-6 py-4 pointer-events-auto">
                  {renderPanel(entry)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {footerContent != null && footerContent !== false && (
          <footer className="shrink-0 border-t border-stone-300 bg-[#E6E7E9] px-6 py-4 dark:border-stone-600 dark:bg-stone-700">
            {footerContent}
          </footer>
        )}
      </div>
    </div>
  );
}
