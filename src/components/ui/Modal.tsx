import { useEffect } from 'react';

/** Shared CTA styles for modal footers. Use with flex gap-3 layout. */
export const modalButtonSecondary =
  'rounded-lg border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700';
export const modalButtonPrimary =
  'rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover';
export const modalButtonDanger =
  'rounded-lg border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20';
export const modalFooterLayout = 'flex gap-3';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  onBack?: () => void;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl', onBack }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 dark:bg-stone-950/70" aria-hidden onClick={onClose} />
      <div
        className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-900 ${maxWidth}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 rounded-t-xl bg-stone-100 px-5 py-4 dark:bg-stone-800">
          <div className="flex items-center justify-start gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 hover:text-stone-700 dark:hover:bg-stone-600 dark:hover:text-stone-200"
                aria-label="Back"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex min-w-0 flex-1 justify-start overflow-hidden">
              <h2 id="modal-title" className="min-w-0 flex-1 truncate !text-left text-lg font-semibold text-stone-900 dark:text-stone-100">
                {title}
              </h2>
            </div>
          </div>
        </div>
        <hr className="border-0 border-t border-stone-200 dark:border-stone-600" />

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer != null && (
          <>
            <hr className="border-0 border-t border-stone-200 dark:border-stone-600" />
            <div className="shrink-0 bg-stone-50 px-5 py-4 dark:bg-stone-800/80">
              {footer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
