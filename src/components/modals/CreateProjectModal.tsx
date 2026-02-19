import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { useStore } from '@/store';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const clients = useStore((s) => s.clients);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);
  const createProject = useStore((s) => s.createProject);

  const clientId = selectedClientId ?? clients[0]?.id;
  const setSelection = useStore((s) => s.setSelection);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (!clientId) {
      setError('Please select a client');
      return;
    }
    setError('');
    const project = createProject(clientId, trimmed, description.trim() || undefined);
    setSelection(clientId, project.id, null);
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
      title="Create Meta-Journey"
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
            form="create-project-form"
            disabled={!name.trim() || !clientId}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none dark:hover:shadow-glow-dark"
          >
            Save
          </button>
        </div>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="project-name">
            Name <span className="text-red-500">*</span>
          </ModalLabel>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Meta-Journey name"
            autoComplete="off"
            autoFocus
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        {clients.length > 1 && (
          <div>
            <ModalLabel htmlFor="project-client">Client</ModalLabel>
            <select
              id="project-client"
              value={clientId ?? ''}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <ModalLabel htmlFor="project-desc">Description</ModalLabel>
          <textarea
            id="project-desc"
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
