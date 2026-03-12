import { Modal } from '@/components/ui/Modal';
import { modalButtonDanger, modalButtonPrimary, modalButtonSecondary } from '@/components/ui/Modal';
import { ModalSectionLabel, ViewOnlySection, VALUE_CLASS } from '@/components/ui/ModalLabel';
import type { CustomerJobItem, CustomerJobTag } from '@/types';

export type JobPlacementDisplay = {
  projectName: string;
  journeyName: string;
  phaseTitle: string;
};

export type JobWithMeta = CustomerJobItem & {
  id?: string;
  insightIds?: string[];
  journeyName: string;
  phaseTitle: string;
  projectName: string;
  phaseId?: string;
  jobIndex?: number;
  key?: string;
  /** When a job is assigned to multiple meta-journeys/journeys/phases */
  placements?: JobPlacementDisplay[];
};

interface JobReadOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobWithMeta | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (updated: Partial<CustomerJobItem>) => void;
  linkedOpportunities?: { id: string; name: string }[];
  onOpportunityClick?: (opp: { id: string; name: string }) => void;
  linkedInsights?: { id: string; title: string }[];
  /** When set, clicking a linked insight opens it (e.g. push to stack) instead of doing nothing */
  onInsightClick?: (insight: { id: string; title: string }) => void;
  /** When true, render only content + footer (no Modal wrapper) for use inside DetailStackModal */
  embedded?: boolean;
  /** When true with embedded, do not render the inline Edit/Delete footer (parent e.g. DetailStackModal provides it) */
  hideEmbeddedFooter?: boolean;
  /** When provided, show Back button (for layered modals) */
  onBack?: () => void;
}

function jobTagStyle(tag: CustomerJobTag): string {
  if (tag === 'Functional') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
  if (tag === 'Social') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
}

function FieldSection({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <ModalSectionLabel>{label}</ModalSectionLabel>
      <div className={VALUE_CLASS}>{value ?? '—'}</div>
    </div>
  );
}

function JobReadOnlyContent({
  job,
  onEdit,
  onDelete,
  onClose: _onClose,
  linkedOpportunities = [],
  linkedInsights = [],
  onOpportunityClick,
  onInsightClick,
  embedded,
  hideEmbeddedFooter,
}: {
  job: JobWithMeta;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
  linkedOpportunities: { id: string; name: string }[];
  linkedInsights: { id: string; title: string }[];
  onOpportunityClick?: (opp: { id: string; name: string }) => void;
  onInsightClick?: (insight: { id: string; title: string }) => void;
  embedded?: boolean;
  hideEmbeddedFooter?: boolean;
}) {
  const j = job as unknown as { priority?: string; isPriority?: boolean };
  const priority = j.priority ?? (j.isPriority ? 'High' : 'Medium');

  const embeddedFooter = embedded && !hideEmbeddedFooter && (onEdit || onDelete) && (
    <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-200 pt-4 dark:border-stone-600">
      {onDelete && (
        <button type="button" onClick={onDelete} className={modalButtonDanger}>
          Delete
        </button>
      )}
      {onEdit && (
        <button type="button" onClick={onEdit} className={modalButtonSecondary}>
          Edit
        </button>
      )}
    </div>
  );

  const content = (
    <div className="space-y-6">
      <ViewOnlySection title="Overview">
        <div className="space-y-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${jobTagStyle(job.tag)}`}>
              {job.tag}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200' :
              priority === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
              'bg-stone-100 text-stone-700 dark:bg-stone-600 dark:text-stone-200'
            }`}>
              {priority}
            </span>
          </div>
          {job.placements && job.placements.length > 0 ? (
            <div className="pt-1">
              <ModalSectionLabel>Assigned to</ModalSectionLabel>
              <div className={`space-y-2 ${VALUE_CLASS}`}>
                {job.placements.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{p.projectName}</span>
                    <span className="text-stone-400 dark:text-stone-500" aria-hidden="true">›</span>
                    <span>{p.journeyName}</span>
                    <span className="text-stone-400 dark:text-stone-500" aria-hidden="true">›</span>
                    <span>{p.phaseTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <FieldSection label="Location" value={[job.projectName, job.journeyName, job.phaseTitle].filter(Boolean).join(' • ') || '—'} />
            </div>
          )}
        </div>
      </ViewOnlySection>

      <ViewOnlySection title="Details">
        <div className="space-y-4">
          <FieldSection label="Description" value={job.description ? <span className="whitespace-pre-wrap">{job.description}</span> : '—'} />
          <FieldSection label="Primary type" value={job.tag} />
          <FieldSection
            label="Struggles"
            value={job.struggles && job.struggles.length > 0 ? <span className="whitespace-pre-wrap">{job.struggles.join('\n')}</span> : '—'}
          />
          <FieldSection
            label="Functional dimensions"
            value={job.functionalDimensions && job.functionalDimensions.length > 0 ? <span className="whitespace-pre-wrap">{job.functionalDimensions.join('\n')}</span> : '—'}
          />
          <FieldSection
            label="Social dimensions"
            value={job.socialDimensions && job.socialDimensions.length > 0 ? <span className="whitespace-pre-wrap">{job.socialDimensions.join('\n')}</span> : '—'}
          />
          <FieldSection
            label="Emotional dimensions"
            value={job.emotionalDimensions && job.emotionalDimensions.length > 0 ? <span className="whitespace-pre-wrap">{job.emotionalDimensions.join('\n')}</span> : '—'}
          />
          <FieldSection
            label="Solutions and workarounds"
            value={job.solutionsAndWorkarounds ? <span className="whitespace-pre-wrap">{job.solutionsAndWorkarounds}</span> : '—'}
          />
        </div>
      </ViewOnlySection>

      {(linkedInsights.length > 0 || linkedOpportunities.length > 0) && (
        <ViewOnlySection title="Links">
          <div className="space-y-5">
            {linkedInsights.length > 0 && (
              <div>
                <ModalSectionLabel>Linked insights</ModalSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {linkedInsights.map((ins) =>
                    onInsightClick ? (
                      <button
                        key={ins.id}
                        type="button"
                        onClick={() => onInsightClick(ins)}
                        className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 dark:border-[#361D60]/40 dark:bg-[#361D60]/15 dark:text-accent-light dark:hover:bg-[#361D60]/25"
                      >
                        {ins.title}
                      </button>
                    ) : (
                      <span
                        key={ins.id}
                        className="inline-block rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm leading-snug text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
                      >
                        {ins.title}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
            {linkedOpportunities.length > 0 && (
              <div>
                <ModalSectionLabel>Linked opportunities</ModalSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {linkedOpportunities.map((opp) => (
                    <button
                      key={opp.id}
                      type="button"
                      onClick={() => onOpportunityClick?.(opp)}
                      className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 dark:border-[#361D60]/40 dark:bg-[#361D60]/15 dark:text-accent-light dark:hover:bg-[#361D60]/25"
                    >
                      {opp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ViewOnlySection>
      )}
    </div>
  );

  return (
    <>
      {content}
      {embeddedFooter}
    </>
  );
}

export function JobReadOnlyModal({ isOpen, onClose, job, onEdit, onDelete, linkedOpportunities = [], linkedInsights = [], onOpportunityClick, onInsightClick, embedded = false, hideEmbeddedFooter = false, onBack }: JobReadOnlyModalProps) {
  if (!job) return null;

  if (embedded) {
    return (
      <>
        <JobReadOnlyContent
          job={job}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={onClose}
          linkedOpportunities={linkedOpportunities}
          linkedInsights={linkedInsights}
          onOpportunityClick={onOpportunityClick}
          onInsightClick={onInsightClick}
          embedded
          hideEmbeddedFooter={hideEmbeddedFooter}
        />
      </>
    );
  }

  const footer = (
    <div className="flex flex-wrap gap-3">
      {onDelete && (
        <button type="button" onClick={onDelete} className={modalButtonDanger}>
          Delete
        </button>
      )}
      <div className="flex flex-1 gap-3 justify-end">
        {onEdit && (
          <button type="button" onClick={onEdit} className={modalButtonSecondary}>
            Edit
          </button>
        )}
        <button type="button" onClick={onClose} className={modalButtonPrimary}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Job details" maxWidth="max-w-[52.5rem]" footer={footer} onBack={onBack}>
      <JobReadOnlyContent
        job={job}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onClose}
        linkedOpportunities={linkedOpportunities}
        linkedInsights={linkedInsights}
        onOpportunityClick={onOpportunityClick}
        onInsightClick={onInsightClick}
      />
    </Modal>
  );
}
