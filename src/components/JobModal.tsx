import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { modalButtonPrimary, modalButtonSecondary } from '@/components/ui/Modal';
import { ModalSectionLabel, ModalLabel } from '@/components/ui/ModalLabel';
import type { PriorityLevel } from '@/types';

/** Job shape used for editing – compatible with store Job and CustomerJobItem */
export type JobFormData = {
  id?: string;
  clientId?: string;
  name?: string;
  text?: string;
  description?: string;
  tag?: 'Functional' | 'Social' | 'Emotional';
  struggles?: string[];
  functionalDimensions?: string[];
  socialDimensions?: string[];
  emotionalDimensions?: string[];
  solutionsAndWorkarounds?: string;
  priority?: PriorityLevel;
  isPriority?: boolean;
  linkedInsightIds?: string[];
  insightIds?: string[];
};

export type JobOption = { key: string; label: string };

const JOB_TAGS: JobFormData['tag'][] = ['Functional', 'Social', 'Emotional'];
const PRIORITIES: PriorityLevel[] = ['High', 'Medium', 'Low'];

function arrayFromText(value: string): string[] {
  return value
    .trim()
    ?.split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
}

function textFromArray(arr: string[] | undefined): string {
  return (arr ?? []).join('\n');
}

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobFormData;
  jobIndex: number;
  insights?: { id: string; title?: string; clientId?: string }[];
  onSave: (index: number, updated: Partial<JobFormData>) => void;
  /** When true, render only form + footer (no Modal wrapper) for use inside DetailStackModal */
  embedded?: boolean;
  /** When true with embedded, omit footer (parent provides it e.g. DetailStackModal renderFooter) */
  hideFooter?: boolean;
  /** Optional form id for submit button association when embedded (avoids duplicate ids in stack modals) */
  formId?: string;
}

export function JobModal({ isOpen, onClose, job, jobIndex, insights = [], onSave, embedded = false, hideFooter = false, formId: formIdProp }: JobModalProps) {
  const [name, setName] = useState(job.name ?? job.text ?? '');
  const [description, setDescription] = useState(job.description ?? '');
  const [tag, setTag] = useState<JobFormData['tag']>(job.tag ?? 'Functional');
  const [struggles, setStruggles] = useState(textFromArray(job.struggles));
  const [functionalDimensions, setFunctionalDimensions] = useState(textFromArray(job.functionalDimensions));
  const [socialDimensions, setSocialDimensions] = useState(textFromArray(job.socialDimensions));
  const [emotionalDimensions, setEmotionalDimensions] = useState(textFromArray(job.emotionalDimensions));
  const [solutionsAndWorkarounds, setSolutionsAndWorkarounds] = useState(job.solutionsAndWorkarounds ?? '');
  const [priority, setPriority] = useState<PriorityLevel>(job.priority ?? (job.isPriority ? 'High' : 'Medium'));
  const [linkedInsightIds, setLinkedInsightIds] = useState<Set<string>>(
    () => new Set(job.linkedInsightIds ?? job.insightIds ?? [])
  );

  useEffect(() => {
    if (!isOpen) return;
    setName(job.name ?? job.text ?? '');
    setDescription(job.description ?? '');
    setTag((job.tag as JobFormData['tag']) ?? 'Functional');
    setStruggles(textFromArray(job.struggles));
    setFunctionalDimensions(textFromArray(job.functionalDimensions));
    setSocialDimensions(textFromArray(job.socialDimensions));
    setEmotionalDimensions(textFromArray(job.emotionalDimensions));
    setSolutionsAndWorkarounds(job.solutionsAndWorkarounds ?? '');
    setPriority(job.priority ?? (job.isPriority ? 'High' : 'Medium'));
    setLinkedInsightIds(new Set(job.linkedInsightIds ?? job.insightIds ?? []));
  }, [isOpen, job]);

  const handleSave = () => {
    const insightIds = linkedInsightIds.size ? Array.from(linkedInsightIds) : undefined;
    onSave(jobIndex, {
      name: name || undefined,
      description: description || undefined,
      tag,
      struggles: arrayFromText(struggles),
      functionalDimensions: arrayFromText(functionalDimensions),
      socialDimensions: arrayFromText(socialDimensions),
      emotionalDimensions: arrayFromText(emotionalDimensions),
      solutionsAndWorkarounds: solutionsAndWorkarounds || undefined,
      priority,
      isPriority: priority === 'High',
      linkedInsightIds: insightIds,
      insightIds,
    });
    onClose();
  };

  const toggleInsight = (id: string) => {
    setLinkedInsightIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formId = formIdProp ?? 'job-edit-form';
  const footer = !hideFooter ? (
    <div className="flex flex-wrap gap-3 justify-end">
      <button type="button" onClick={onClose} className={modalButtonSecondary}>
        Cancel
      </button>
      <button type="submit" form={formId} className={modalButtonPrimary}>
        Save
      </button>
    </div>
  ) : null;

  const formContent = (
    <form
      id={formId}
      onSubmit={(e) => { e.preventDefault(); handleSave(); }}
      className="space-y-5"
    >
        <div>
          <ModalLabel htmlFor="job-edit-name">Name</ModalLabel>
          <input
            id="job-edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-description">Description</ModalLabel>
          <textarea
            id="job-edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalSectionLabel>Primary type</ModalSectionLabel>
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value as JobFormData['tag'])}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            {JOB_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-priority">Priority</ModalLabel>
          <select
            id="job-edit-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-struggles">Struggles (one per line)</ModalLabel>
          <textarea
            id="job-edit-struggles"
            value={struggles}
            onChange={(e) => setStruggles(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-functional">Functional dimensions (one per line)</ModalLabel>
          <textarea
            id="job-edit-functional"
            value={functionalDimensions}
            onChange={(e) => setFunctionalDimensions(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-social">Social dimensions (one per line)</ModalLabel>
          <textarea
            id="job-edit-social"
            value={socialDimensions}
            onChange={(e) => setSocialDimensions(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-emotional">Emotional dimensions (one per line)</ModalLabel>
          <textarea
            id="job-edit-emotional"
            value={emotionalDimensions}
            onChange={(e) => setEmotionalDimensions(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        <div>
          <ModalLabel htmlFor="job-edit-solutions">Solutions and workarounds</ModalLabel>
          <textarea
            id="job-edit-solutions"
            value={solutionsAndWorkarounds}
            onChange={(e) => setSolutionsAndWorkarounds(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>

        {insights.length > 0 && (
          <div>
            <ModalSectionLabel>Linked insights</ModalSectionLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {insights.map((ins) => (
                <label key={ins.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 dark:border-stone-600">
                  <input
                    type="checkbox"
                    checked={linkedInsightIds.has(ins.id)}
                    onChange={() => toggleInsight(ins.id)}
                    className="rounded border-stone-300 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-300">{ins.title ?? '—'}</span>
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
        {footer}
      </>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit job"
      maxWidth="max-w-[52.5rem]"
      footer={footer}
    >
      {formContent}
    </Modal>
  );
}
