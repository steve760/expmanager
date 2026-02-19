import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import type { PriorityLevel } from '@/types';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

interface CreateInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onCreate: (data: { title: string; description?: string; priority: PriorityLevel }) => void;
}

export function CreateInsightModal({ isOpen, onClose, clientId: _clientId, onCreate }: CreateInsightModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: title.trim() || 'Untitled insight',
      description: description.trim() || undefined,
      priority,
    });
    onClose();
    setTitle('');
    setDescription('');
    setPriority('Medium');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create insight"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
            Cancel
          </button>
          <button type="submit" form="create-insight-form" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
            Create
          </button>
        </div>
      }
    >
      <form id="create-insight-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="create-insight-title">Title</ModalLabel>
          <input
            id="create-insight-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Insight title"
          />
        </div>
        <div>
          <ModalLabel htmlFor="create-insight-desc">Description</ModalLabel>
          <textarea
            id="create-insight-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Insight description"
          />
        </div>
        <div>
          <ModalLabel htmlFor="create-insight-priority">Priority</ModalLabel>
          <select
            id="create-insight-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            {PRIORITY_LEVELS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
