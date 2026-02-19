import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { parseListPreservingBlanks } from '@/lib/utils';
import type { CustomerJobItem, CustomerJobTag, Job, PriorityLevel, Insight } from '@/types';

const JOB_TAGS: CustomerJobTag[] = ['Functional', 'Social', 'Emotional'];
const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: (CustomerJobItem | Job) | null;
  jobIndex: number;
  insights?: Insight[];
  onSave: (index: number, updated: Partial<Job & CustomerJobItem>) => void;
  /** When true, render only form + footer (no Modal wrapper) for use inside DetailStackModal */
  embedded?: boolean;
  /** When true with embedded, omit footer (parent provides it e.g. DetailStackModal renderFooter) */
  hideFooter?: boolean;
}

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

export function JobModal({ isOpen, onClose, job, jobIndex, insights = [], onSave, embedded = false, hideFooter = false }: JobModalProps) {
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

  useEffect(() => {
    if (job) {
      setName(job.name ?? (job as CustomerJobItem).text ?? '');
      setDescription(job.description ?? '');
      setTag(job.tag ?? 'Functional');
      setPriority((job as Job).priority ?? ((job as CustomerJobItem).isPriority ? 'High' : 'Medium'));
      setSelectedInsightIds((job as Job).insightIds ?? []);
      setStruggles(job.struggles ?? []);
      setFunctionalDimensions(job.functionalDimensions ?? []);
      setSocialDimensions(job.socialDimensions ?? []);
      setEmotionalDimensions(job.emotionalDimensions ?? []);
      setSolutionsAndWorkarounds(job.solutionsAndWorkarounds ?? '');
    }
  }, [job?.name, (job as CustomerJobItem)?.text, job?.description, job?.tag, (job as Job)?.priority, (job as Job)?.insightIds, (job as CustomerJobItem)?.isPriority, job?.struggles, job?.functionalDimensions, job?.socialDimensions, job?.emotionalDimensions, job?.solutionsAndWorkarounds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (job == null) return;
    onSave(jobIndex, {
      name: name.trim() || job.name || (job as CustomerJobItem).text || 'Untitled job',
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
  };

  if (!job) return null;

  const footer = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        Cancel
      </button>
      <button type="submit" form="edit-job-form" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
        Save
      </button>
    </div>
  );

  const formContent = (
    <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="job-name">Name</ModalLabel>
          <input
            id="job-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Job name"
          />
        </div>
        <div>
          <ModalLabel htmlFor="job-desc">Description</ModalLabel>
          <textarea
            id="job-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Job description"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <ModalLabel htmlFor="job-tag">Primary type</ModalLabel>
            <select
              id="job-tag"
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
            <ModalLabel htmlFor="job-priority">Priority</ModalLabel>
            <select
              id="job-priority"
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
          <ListEditor value={struggles} onChange={setStruggles} placeholder="e.g. Time pressure&#10;Lack of information" rows={2} />
        </div>
        <div>
          <ModalLabel>Functional dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={functionalDimensions} onChange={setFunctionalDimensions} placeholder="e.g. Efficiency&#10;Accuracy" rows={2} />
        </div>
        <div>
          <ModalLabel>Social dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={socialDimensions} onChange={setSocialDimensions} placeholder="e.g. Collaboration&#10;Status" rows={2} />
        </div>
        <div>
          <ModalLabel>Emotional dimensions</ModalLabel>
          <p className="mb-1 text-sm text-stone-500 dark:text-stone-400">One item per line</p>
          <ListEditor value={emotionalDimensions} onChange={setEmotionalDimensions} placeholder="e.g. Confidence&#10;Anxiety" rows={2} />
        </div>
        <div>
          <ModalLabel htmlFor="job-solutions">Solutions and workarounds</ModalLabel>
          <textarea
            id="job-solutions"
            value={solutionsAndWorkarounds}
            onChange={(e) => setSolutionsAndWorkarounds(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Describe solutions and workarounds"
          />
        </div>
      </form>
  );

  if (embedded) {
    return (
      <>
        {formContent}
        {!hideFooter && (
          <div className="mt-4 shrink-0 border-t border-stone-200 pt-4 dark:border-stone-600">{footer}</div>
        )}
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Job details" maxWidth="max-w-2xl" footer={footer}>
      {formContent}
    </Modal>
  );
}
