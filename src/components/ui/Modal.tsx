import { useEffect, useRef, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional footer anchored at bottom; when provided, body scrolls internally */
  footer?: ReactNode;
  maxWidth?: string;
  /** When provided, show a Back button in the header (for layered modals) */
  onBack?: () => void;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', onBack }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (justOpened) {
      contentRef.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const el = contentRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className={`relative flex max-h-[90vh] w-full flex-col ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-elevated dark:bg-stone-800 dark:shadow-elevated-dark animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[#2d1648] bg-[#361D60] px-6 py-4 dark:border-[#2d1648] dark:bg-[#361D60]">
          {onBack ? (
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
          ) : null}
          <h2 id="modal-title" className={`text-xl font-semibold text-white ${onBack ? 'min-w-0 flex-1 truncate' : ''}`}>
            {title}
          </h2>
        </header>
        <div className={`min-h-0 flex-1 text-sm ${footer ? 'overflow-y-auto overflow-x-hidden p-6 pr-6' : 'shrink-0 p-6'}`}>
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t border-stone-300 bg-[#E6E7E9] px-6 py-4 dark:border-stone-600 dark:bg-stone-700">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
