import { useEffect, useRef, ReactNode } from 'react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] overflow-y-auto bg-white shadow-elevated animate-in dark:bg-stone-800 dark:shadow-elevated-dark sm:w-[560px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-6 py-5 dark:border-stone-600 dark:bg-stone-800">
          <h2 id="drawer-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-500 hover:bg-warm-100 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-accent dark:text-stone-200 dark:hover:bg-stone-700"
            aria-label="Close drawer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 pb-10 text-sm">{children}</div>
      </div>
    </>
  );
}
