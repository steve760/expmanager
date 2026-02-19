import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  /** When set, user must type this exact string (e.g. "DELETE") to enable the confirm button */
  requireTypedConfirm?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  requireTypedConfirm,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const [typedConfirm, setTypedConfirm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedConfirm('');
      if (!requireTypedConfirm) confirmRef.current?.focus();
    }
  }, [isOpen, requireTypedConfirm]);

  const canConfirm = !requireTypedConfirm || typedConfirm === requireTypedConfirm;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmVariant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 hover:shadow-[0_0_20px_-4px_rgba(239,68,68,0.3)] disabled:hover:bg-red-500'
                : 'bg-accent hover:bg-accent-hover hover:shadow-glow dark:hover:shadow-glow-dark disabled:hover:bg-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-stone-600 dark:text-stone-200">{message}</p>
      {requireTypedConfirm && (
        <div className="mt-4">
          <label htmlFor="confirm-delete-input" className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Type <strong>{requireTypedConfirm}</strong> to confirm
          </label>
          <input
            id="confirm-delete-input"
            type="text"
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            placeholder={requireTypedConfirm}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder-stone-500"
            autoComplete="off"
          />
        </div>
      )}
    </Modal>
  );
}
