import { useEffect } from 'react';

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
        className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-stone-200 bg-white shadow-xl dark:border-stone-600 dark:bg-stone-900 ${maxWidth}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-600">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-700 dark:hover:text-stone-200"
              aria-label="Back"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 id="modal-title" className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer != null && (
          <div className="shrink-0 border-t border-stone-200 px-5 py-4 dark:border-stone-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
