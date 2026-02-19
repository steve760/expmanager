import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { parseListPreservingBlanks } from '@/lib/utils';
import type { CustomerJobTag, Insight, PriorityLevel } from '@/types';

const JOB_TAGS: CustomerJobTag[] = ['Functional', 'Social', 'Emotional'];
const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

function ListEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  const text = value.join('\n');
  return (
    <textarea
      value={text}
      onChange={(e) => onChange(parseListPreservingBlanks(e.target.value))}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
    />
  );
}

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  insights: Insight[];
  onCreate: (data: {
    name: string;
    description?: string;
    tag: CustomerJobTag;
    priority: PriorityLevel;
    insightIds: string[];
    struggles?: string[];
    functionalDimensions?: string[];
    socialDimensions?: string[];
    emotionalDimensions?: string[];
    solutionsAndWorkarounds?: string;
  }) => void;
}

export function CreateJobModal({ isOpen, onClose, clientId: _clientId, insights, onCreate }: CreateJobModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState<CustomerJobTag>('Functional');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [selectedInsightIds, setSelectedInsightIds] = useState<string[]>([]);
  const [struggles, setStruggles] = useState<string[]>([]);
  const [functionalDimensions, setFunctionalDimensions] = useState<string[]>([]);
  const [socialDimensions, setSocialDimensions] = useState<string[]>([]);
  const [emotionalDimensions, setEmotionalDimensions] = useState<string[]>([]);
  const [solutionsAndWorkarounds, setSolutionsAndWorkarounds] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: name.trim() || 'Untitled job',
      description: description.trim() || undefined,
      tag,
      priority,
      insightIds: selectedInsightIds,
      struggles: struggles.filter(Boolean).length > 0 ? struggles.filter(Boolean) : undefined,
      functionalDimensions: functionalDimensions.filter(Boolean).length > 0 ? functionalDimensions.filter(Boolean) : undefined,
      socialDimensions: socialDimensions.filter(Boolean).length > 0 ? socialDimensions.filter(Boolean) : undefined,
      emotionalDimensions: emotionalDimensions.filter(Boolean).length > 0 ? emotionalDimensions.filter(Boolean) : undefined,
      solutionsAndWorkarounds: solutionsAndWorkarounds.trim() || undefined,
    });
    onClose();
    setName('');
    setDescription('');
    setTag('Functional');
    setPriority('Medium');
    setSelectedInsightIds([]);
    setStruggles([]);
    setFunctionalDimensions([]);
    setSocialDimensions([]);
    setEmotionalDimensions([]);
    setSolutionsAndWorkarounds('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create job"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
            Cancel
          </button>
          <button type="submit" form="create-job-form" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
            Create
          </button>
        </div>
      }
    >
      <form id="create-job-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="create-job-name">Name</ModalLabel>
          <input
            id="create-job-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Job name"
          />
        </div>
        <div>
          <ModalLabel htmlFor="create-job-desc">Description</ModalLabel>
          <textarea
            id="create-job-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Job description"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ModalLabel htmlFor="create-job-tag">Primary type</ModalLabel>
            <select
              id="create-job-tag"
              value={tag}
              onChange={(e) => setTag(e.target.value as CustomerJobTag)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              {JOB_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <ModalLabel htmlFor="create-job-priority">Priority</ModalLabel>
            <select
              id="create-job-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        {insights.length > 0 && (
          <div>
            <ModalLabel>Linked insights</ModalLabel>
            <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">Select insights to link to this job</p>
            <div className="max-h-32 overflow-y-auto rounded-xl border border-stone-300 p-2 dark:border-stone-600 dark:bg-stone-800">
              {insights.map((ins) => (
                <label key={ins.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-700">
                  <input
                    type="checkbox"
                    checked={selectedInsightIds.includes(ins.id)}
                    onChange={(e) =>
                      setSelectedInsightIds((prev) =>
                        e.target.checked ? [...prev, ins.id] : prev.filter((id) => id !== ins.id)
                      )
                    }
                    className="rounded border-stone-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-200">{ins.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <ModalLabel>Struggles</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={struggles} onChange={setStruggles} placeholder="e.g. Time pressure" rows={2} />
        </div>
        <div>
          <ModalLabel>Functional dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={functionalDimensions} onChange={setFunctionalDimensions} placeholder="e.g. Efficiency" rows={2} />
        </div>
        <div>
          <ModalLabel>Social dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={socialDimensions} onChange={setSocialDimensions} placeholder="e.g. Collaboration" rows={2} />
        </div>
        <div>
          <ModalLabel>Emotional dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={emotionalDimensions} onChange={setEmotionalDimensions} placeholder="e.g. Confidence" rows={2} />
        </div>
        <div>
          <ModalLabel htmlFor="create-job-solutions">Solutions and workarounds</ModalLabel>
          <textarea
            id="create-job-solutions"
            value={solutionsAndWorkarounds}
            onChange={(e) => setSolutionsAndWorkarounds(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            placeholder="Describe solutions and workarounds"
          />
        </div>
      </form>
    </Modal>
  );
}
