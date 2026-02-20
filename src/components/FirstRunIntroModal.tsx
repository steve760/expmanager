import { useEffect, useRef, useState } from 'react';

const STEPS = [
  {
    title: 'Welcome to EXP',
    body: 'Your experience manager. Organise insights, Jobs, customer journeys, and opportunities.',
  },
  {
    title: 'Capture what you learned',
    body: 'Record research insights, define Jobs, then start codifying customer journeys.',
  },
  {
    title: 'Track what to do next',
    body: 'Organise and monitor opportunities in the opportunities tracker.',
  },
] as const;

interface FirstRunIntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish: () => void;
}

export function FirstRunIntroModal({ isOpen, onClose, onFinish }: FirstRunIntroModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    const el = contentRef.current;
    if (el) {
      const focusable = el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const el = contentRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
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

  const stepInfo = STEPS[step - 1];
  const isFirst = step === 1;
  const isLast = step === STEPS.length;

  const handleBack = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-elevated dark:bg-stone-800 dark:shadow-elevated-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2d1648] bg-[#361D60] px-6 py-4 dark:border-[#2d1648] dark:bg-[#361D60]">
          <span className="text-sm text-white/80">Step {step} of {STEPS.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l18 18" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <h2 id="first-run-title" className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {stepInfo.title}
          </h2>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
            {stepInfo.body}
          </p>
        </div>
        <footer className="shrink-0 border-t border-stone-300 bg-[#E6E7E9] px-6 py-4 dark:border-stone-600 dark:bg-stone-700">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirst}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow dark:hover:shadow-glow-dark"
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
