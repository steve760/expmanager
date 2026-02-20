import { Modal } from '@/components/ui/Modal';
import { ModalSectionLabel, ViewOnlySection } from '@/components/ui/ModalLabel';
import type { Opportunity, OpportunityStage } from '@/types';

interface OpportunityReadOnlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  clientName?: string;
  projectName?: string;
  journeyName?: string;
  phaseTitle?: string;
  linkedJobLabels?: { key: string; label: string }[];
  onEdit?: () => void;
  /** When set, clicking a linked job opens it (e.g. push to stack) */
  onLinkedJobClick?: (jobId: string) => void;
  /** When true, render only content + footer (no Modal wrapper) for use inside DetailStackModal */
  embedded?: boolean;
  /** When provided, show Back button (for layered modals) */
  onBack?: () => void;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function FieldSection({ label, value, className = '' }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <ModalSectionLabel>{label}</ModalSectionLabel>
      <div className="text-sm text-stone-700 dark:text-stone-300">{value ?? '—'}</div>
    </div>
  );
}

function OpportunityReadOnlyContent({
  opportunity,
  clientName,
  projectName,
  journeyName,
  phaseTitle,
  linkedJobLabels = [],
  onEdit,
  onClose: _onClose,
  onLinkedJobClick,
  embedded,
}: {
  opportunity: Opportunity;
  clientName?: string;
  projectName?: string;
  journeyName?: string;
  phaseTitle?: string;
  linkedJobLabels: { key: string; label: string }[];
  onEdit?: () => void;
  onClose: () => void;
  onLinkedJobClick?: (jobId: string) => void;
  embedded?: boolean;
}) {
  const priorityStyle = (p: string) => {
    if (p === 'High') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    if (p === 'Medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
  };

  const stageStyle = (s: OpportunityStage) => {
    if (s === 'Horizon 1' || s === 'Horizon 2' || s === 'Horizon 3') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (s === 'In discovery') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
  };

  const linkedJobIds = opportunity.linkedJobIds ?? [];
  const linkedLabels = linkedJobIds
    .map((key) => linkedJobLabels.find((j) => j.key === key)?.label ?? key)
    .filter(Boolean);

  return (
    <>
      <div className="space-y-5">
        <ViewOnlySection title="Overview">
          <div className="space-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {opportunity.isPriority && (
                <svg className="h-5 w-5 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              )}
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{opportunity.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyle(opportunity.priority)}`}>
                {opportunity.priority}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageStyle(opportunity.stage)}`}>
                {opportunity.stage}
              </span>
            </div>
            {clientName && <FieldSection label="Client" value={clientName} />}
            <FieldSection
              label="Location"
              value={[projectName, journeyName, phaseTitle].filter(Boolean).join(' • ') || '—'}
            />
          </div>
        </ViewOnlySection>

        <ViewOnlySection title="Stage & priority">
          <div className="space-y-4">
            <FieldSection
              label="Stage"
              value={<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageStyle(opportunity.stage)}`}>{opportunity.stage}</span>}
            />
            <FieldSection label="Stage order" value={String(opportunity.stageOrder)} />
            <FieldSection label="Priority" value={opportunity.priority} />
            <FieldSection label="Is priority" value={opportunity.isPriority ? 'Yes' : 'No'} />
          </div>
        </ViewOnlySection>

        <ViewOnlySection title="Details">
          <div className="space-y-4">
            <FieldSection
              label="Description"
              value={opportunity.description ? <span className="whitespace-pre-wrap">{opportunity.description}</span> : '—'}
            />
            <FieldSection
              label="Point of differentiation"
              value={opportunity.pointOfDifferentiation ? <span className="whitespace-pre-wrap">{opportunity.pointOfDifferentiation}</span> : '—'}
            />
            <FieldSection
              label="Critical assumptions"
              value={opportunity.criticalAssumptions ? <span className="whitespace-pre-wrap">{opportunity.criticalAssumptions}</span> : '—'}
            />
          </div>
        </ViewOnlySection>

        {linkedLabels.length > 0 && (
          <ViewOnlySection title="Linked jobs">
            <div className="flex flex-wrap gap-2">
              {onLinkedJobClick
                ? linkedJobIds.map((jobId) => {
                    const label = linkedJobLabels.find((j) => j.key === jobId)?.label ?? jobId;
                    return (
                      <button
                        key={jobId}
                        type="button"
                        onClick={() => onLinkedJobClick(jobId)}
                        className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 dark:border-[#361D60]/40 dark:bg-[#361D60]/15 dark:text-accent-light dark:hover:bg-[#361D60]/25"
                      >
                        {label}
                      </button>
                    );
                  })
                : linkedLabels.map((l, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
                    >
                      {l}
                    </span>
                  ))}
            </div>
          </ViewOnlySection>
        )}

        <ViewOnlySection title="Dates">
          <div className="space-y-2">
            <FieldSection label="Created at" value={formatDate(opportunity.createdAt)} />
            <FieldSection label="Updated at" value={formatDate(opportunity.updatedAt)} />
          </div>
        </ViewOnlySection>
      </div>
      {embedded && onEdit && (
        <div className="mt-4 flex gap-3 border-t border-stone-200 pt-4 dark:border-stone-600">
          <button type="button" onClick={onEdit} className="rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
            Edit
          </button>
        </div>
      )}
    </>
  );
}

export function OpportunityReadOnlyModal({
  isOpen,
  onClose,
  opportunity,
  clientName,
  projectName,
  journeyName,
  phaseTitle,
  linkedJobLabels = [],
  onEdit,
  onLinkedJobClick,
  embedded = false,
  onBack,
}: OpportunityReadOnlyModalProps) {
  if (!opportunity) return null;

  const footer = (
    <div className="flex gap-3">
      {onEdit && (
        <button type="button" onClick={onEdit} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
          Edit
        </button>
      )}
      <button type="button" onClick={onClose} className={`rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover ${onEdit ? 'flex-1' : 'w-full'}`}>
        Close
      </button>
    </div>
  );

  if (embedded) {
    return (
      <OpportunityReadOnlyContent
        opportunity={opportunity}
        clientName={clientName}
        projectName={projectName}
        journeyName={journeyName}
        phaseTitle={phaseTitle}
        linkedJobLabels={linkedJobLabels}
        onEdit={onEdit}
        onClose={onClose}
        onLinkedJobClick={onLinkedJobClick}
        embedded
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Opportunity details" maxWidth="max-w-2xl" footer={footer} onBack={onBack}>
      <OpportunityReadOnlyContent
        opportunity={opportunity}
        clientName={clientName}
        projectName={projectName}
        journeyName={journeyName}
        phaseTitle={phaseTitle}
        linkedJobLabels={linkedJobLabels}
        onEdit={onEdit}
        onClose={onClose}
        onLinkedJobClick={onLinkedJobClick}
      />
    </Modal>
  );
}
