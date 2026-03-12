import { ReactNode } from 'react';
import { modalButtonPrimary } from '@/components/ui/Modal';

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
        className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-elevated dark:border-stone-600 dark:bg-stone-800 dark:shadow-elevated-dark animate-fade-in ${maxWidth}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: grey background, then HR */}
        <header className="flex shrink-0 items-center justify-start gap-3 rounded-t-xl bg-stone-100 px-6 py-4 dark:bg-stone-800">
          {canGoBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex shrink-0 items-center gap-1.5 rounded-lg p-2 text-stone-600 hover:bg-stone-200 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-600 dark:hover:text-stone-100"
              aria-label="Back"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <span className="w-[52px] shrink-0" />
          )}
          <div className="flex min-w-0 flex-1 justify-start overflow-hidden">
            <h2 id="stack-modal-title" className="min-w-0 flex-1 break-words text-left text-lg font-semibold text-stone-900 dark:text-stone-100">
              {getTitle(current)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 ${modalButtonPrimary}`}
          >
            Close
          </button>
        </header>
        <hr className="border-0 border-t border-stone-200 dark:border-stone-600" />

        {/* Sliding panels — overflow-hidden on wrapper forces inner scroll region to be bounded */}
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          <div
            className="flex h-full min-h-0 flex-1 will-change-transform"
            style={{
              width: `${stack.length * 100}%`,
              transform: `translateX(-${((stack.length - 1) / stack.length) * 100}%)`,
              transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            {stack.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}`}
                className="flex h-full min-h-0 max-h-full flex-shrink-0 flex-col overflow-hidden"
                style={{ width: `${100 / stack.length}%` }}
              >
                <div
                  className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-4 pointer-events-auto"
                  style={{ maxHeight: 'calc(90vh - 12rem)' }}
                >
                  <div key={`${entry.type}-${entry.id}-${entry.mode}`} className="animate-fade-in">
                    {renderPanel(entry)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {footerContent != null && footerContent !== false && (
          <>
            <hr className="border-0 border-t border-stone-200 dark:border-stone-600" />
            <footer className="shrink-0 bg-stone-50 px-6 py-4 dark:bg-stone-800/80">
              {footerContent}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
