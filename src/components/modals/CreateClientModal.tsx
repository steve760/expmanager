import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { useStore } from '@/store';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateClientModal({ isOpen, onClose }: CreateClientModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const createClient = useStore((s) => s.createClient);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError('');
    const client = createClient(trimmed, description.trim() || undefined);
    setSelectedClientId(client.id);
    setName('');
    setDescription('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create client"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-client-form"
            disabled={!name.trim()}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none dark:hover:shadow-glow-dark"
          >
            Save
          </button>
        </div>
      }
    >
      <form id="create-client-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="client-name">
            Name <span className="text-red-500">*</span>
          </ModalLabel>
          <input
            id="client-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Client name"
            autoComplete="off"
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <div>
          <ModalLabel htmlFor="client-desc">Description</ModalLabel>
          <textarea
            id="client-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Optional description"
          />
        </div>
      </form>
    </Modal>
  );
}
