import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import type { Opportunity, OpportunityTag, OpportunityStage } from '@/types';

const OPPORTUNITY_TAGS: OpportunityTag[] = ['High', 'Medium', 'Low'];
const OPPORTUNITY_STAGES: OpportunityStage[] = ['Backlog', 'In discovery', 'Horizon 1', 'Horizon 2', 'Horizon 3'];

export type JobOption = { key: string; label: string };

interface OpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  jobsInJourney: JobOption[];
  onSave: (updated: Partial<Opportunity> & { id: string }) => void;
  /** When true, render only form + footer (no Modal wrapper) for use inside DetailStackModal */
  embedded?: boolean;
  /** When true with embedded, omit footer (parent provides it) */
  hideFooter?: boolean;
}

export function OpportunityModal({ isOpen, onClose, opportunity, jobsInJourney, onSave, embedded = false, hideFooter = false }: OpportunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState<OpportunityTag>('Medium');
  const [stage, setStage] = useState<OpportunityStage>('Backlog');
  const [isPriority, setIsPriority] = useState(false);
  const [pointOfDifferentiation, setPointOfDifferentiation] = useState('');
  const [criticalAssumptions, setCriticalAssumptions] = useState('');
  const [linkedJobIds, setLinkedJobIds] = useState<string[]>([]);

  useEffect(() => {
    if (opportunity) {
      setName(opportunity.name);
      setDescription(opportunity.description ?? '');
      setTag(opportunity.priority);
      setStage(opportunity.stage);
      setIsPriority(opportunity.isPriority ?? false);
      setPointOfDifferentiation(opportunity.pointOfDifferentiation ?? '');
      setCriticalAssumptions(opportunity.criticalAssumptions ?? '');
      setLinkedJobIds(opportunity.linkedJobIds ?? []);
    }
  }, [opportunity?.id, opportunity?.name, opportunity?.description, opportunity?.priority, opportunity?.stage, opportunity?.isPriority, opportunity?.pointOfDifferentiation, opportunity?.criticalAssumptions, opportunity?.linkedJobIds]);

  const toggleJob = (key: string) => {
    setLinkedJobIds((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;
    onSave({
      id: opportunity.id,
      name: name.trim() || opportunity.name,
      description: description.trim() || undefined,
      priority: tag,
      stage,
      isPriority,
      pointOfDifferentiation: pointOfDifferentiation.trim() || undefined,
      criticalAssumptions: criticalAssumptions.trim() || undefined,
      linkedJobIds,
    });
    onClose();
  };

  if (!opportunity) return null;

  const footer = (
    <div className="flex gap-3">
      <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
        Cancel
      </button>
      <button type="submit" form="edit-opportunity-form" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
        Save
      </button>
    </div>
  );

  const formContent = (
    <form id="edit-opportunity-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <ModalLabel htmlFor="opp-name">Name</ModalLabel>
          <input
            id="opp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Opportunity name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ModalLabel htmlFor="opp-priority">Priority</ModalLabel>
            <select
              id="opp-priority"
              value={tag}
              onChange={(e) => setTag(e.target.value as OpportunityTag)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              {OPPORTUNITY_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <ModalLabel htmlFor="opp-stage">Stage</ModalLabel>
            <select
              id="opp-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as OpportunityStage)}
              className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              {OPPORTUNITY_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsPriority(!isPriority)}
            className={`shrink-0 rounded p-1.5 transition-colors ${
              isPriority
                ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                : 'text-stone-300 hover:text-amber-500 dark:text-stone-500 dark:hover:text-amber-400'
            }`}
            title={isPriority ? 'Remove priority star' : 'Mark as priority'}
            aria-label={isPriority ? 'Remove priority star' : 'Mark as priority'}
          >
            <svg className="h-6 w-6" fill={isPriority ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
          <span className="text-sm text-stone-500 dark:text-stone-400">Priority</span>
        </div>
        <div>
          <ModalLabel htmlFor="opp-desc">Description</ModalLabel>
          <textarea
            id="opp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Optional description"
          />
        </div>
        <div>
          <ModalLabel htmlFor="opp-pod">Point of differentiation</ModalLabel>
          <textarea
            id="opp-pod"
            value={pointOfDifferentiation}
            onChange={(e) => setPointOfDifferentiation(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="What makes this opportunity distinct"
          />
        </div>
        <div>
          <ModalLabel htmlFor="opp-assumptions">Critical assumptions</ModalLabel>
          <textarea
            id="opp-assumptions"
            value={criticalAssumptions}
            onChange={(e) => setCriticalAssumptions(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            placeholder="Key assumptions"
          />
        </div>
        {jobsInJourney.length > 0 && (
          <div>
            <ModalLabel>Linked jobs</ModalLabel>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-300 p-2 dark:border-stone-600 dark:bg-stone-800/50">
              {jobsInJourney.map((job) => (
                <label
                  key={job.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-700/50"
                >
                  <input
                    type="checkbox"
                    checked={linkedJobIds.includes(job.key)}
                    onChange={() => toggleJob(job.key)}
                    className="h-4 w-4 rounded border-stone-300 text-accent focus:ring-accent/20 dark:border-stone-500"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-200">{job.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
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
    <Modal isOpen={isOpen} onClose={onClose} title="Opportunity details" maxWidth="max-w-2xl" footer={footer}>
      {formContent}
    </Modal>
  );
}
