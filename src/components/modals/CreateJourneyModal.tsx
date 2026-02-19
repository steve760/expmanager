import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { useStore } from '@/store';

interface CreateJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateJourneyModal({ isOpen, onClose }: CreateJourneyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const projects = useStore((s) => s.projects);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setSelectedProjectId = useStore((s) => s.setSelectedProjectId);
  const createJourney = useStore((s) => s.createJourney);

  const projectOptions = projects.filter(
    (p) => p.clientId === selectedClientId
  );
  const projectId = selectedProjectId ?? projectOptions[0]?.id;
  const setSelection = useStore((s) => s.setSelection);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (!projectId) {
      setError('Please select a Meta-Journey');
      return;
    }
    setError('');
    const journey = createJourney(projectId, trimmed, description.trim() || undefined);
    if (selectedClientId) {
      setSelection(selectedClientId, projectId, journey.id);
    }
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
      title="Create journey"
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
            form="create-journey-form"
            disabled={!name.trim() || !projectId}
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none dark:hover:shadow-glow-dark"
          >
            Save
          </button>
        </div>
      }
    >
      <form id="create-journey-form" onSubmit={handleSubmit} className="space-y-4">
        {projectOptions.length > 1 && (
          <div>
            <ModalLabel htmlFor="journey-project">Project</ModalLabel>
            <select
              id="journey-project"
              value={projectId ?? ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            >
              <option value="">Select a Meta-Journey</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <ModalLabel htmlFor="journey-name">
            Name <span className="text-red-500">*</span>
          </ModalLabel>
          <input
            id="journey-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Journey name"
            autoComplete="off"
          />
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <div>
          <ModalLabel htmlFor="journey-desc">Description</ModalLabel>
          <textarea
            id="journey-desc"
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
