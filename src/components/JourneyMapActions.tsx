import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';

interface JourneyMapActionsProps {
  /** Rendered between Add phase and the menu (e.g. Settings) */
  children?: React.ReactNode;
}

export function JourneyMapActions({ children }: JourneyMapActionsProps) {
  const selectedJourneyId = useStore((s) => s.selectedJourneyId);
  const createPhase = useStore((s) => s.createPhase);
  const [journeyMenuOpen, setJourneyMenuOpen] = useState(false);
  const journeyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        journeyMenuRef.current &&
        !journeyMenuRef.current.contains(e.target as Node)
      ) {
        setJourneyMenuOpen(false);
      }
    };
    if (journeyMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [journeyMenuOpen]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() =>
          selectedJourneyId && createPhase(selectedJourneyId)
        }
        className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 dark:hover:shadow-glow-dark"
      >
        Add phase
      </button>
      {children}
      <div ref={journeyMenuRef} className="relative">
        <button
          type="button"
          onClick={() => setJourneyMenuOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-soft transition-all duration-200 hover:border-accent/30 hover:bg-accent/5 hover:text-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-accent/40 dark:hover:bg-accent/10 dark:hover:text-accent-light"
          aria-label="More options"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
        {journeyMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-stone-200 bg-white py-1 shadow-elevated dark:border-stone-600 dark:bg-stone-800 dark:shadow-elevated-dark">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
              onClick={() => {
                setJourneyMenuOpen(false);
                window.print();
              }}
            >
              <svg
                className="h-4 w-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
              Print to PDF
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
              onClick={() => setJourneyMenuOpen(false)}
            >
              <svg
                className="h-4 w-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Export to PNG
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
              onClick={() => setJourneyMenuOpen(false)}
            >
              <svg
                className="h-4 w-4 text-stone-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
