import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import type { Insight, PriorityLevel } from '@/types';
import { CreateInsightModal } from '@/components/modals/CreateInsightModal';
import { JobReadOnlyModal, type JobWithMeta } from '@/components/JobReadOnlyModal';
import { JobModal } from '@/components/JobModal';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';
import { DetailStackModal, type DetailStackEntry } from '@/components/DetailStackModal';
import { InsightDetailPanel } from '@/components/InsightDetailPanel';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LABEL_CLASS, ModalLabel, ModalSectionLabel, VALUE_CLASS } from '@/components/ui/ModalLabel';
import { modalButtonDanger, modalButtonPrimary, modalButtonSecondary } from '@/components/ui/Modal';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

type SortColumn = 'title' | 'description' | 'priority' | 'linkedJobs';

function truncateDescription(text: string | undefined, maxLen: number): string {
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/** Format insight recency: relative for recent (e.g. "Updated 2 days ago"), short date for older (e.g. "Created 14 Mar 2025"). */
function formatInsightRecency(insight: { createdAt: string; updatedAt: string }): string {
  const updated = new Date(insight.updatedAt).getTime();
  const created = new Date(insight.createdAt).getTime();
  const isUpdated = updated > created + 60 * 1000;
  const ref = isUpdated ? updated : created;
  const label = isUpdated ? 'Updated' : 'Created';
  const now = Date.now();
  const diffMs = now - ref;
  const diffDays = diffMs / (24 * 60 * 60 * 1000);

  if (diffDays < 1) {
    const diffHours = diffMs / (60 * 60 * 1000);
    if (diffHours < 1) {
      const diffMins = Math.round(diffMs / (60 * 1000));
      if (diffMins < 1) return `${label} just now`;
      return `${label} ${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    }
    const h = Math.round(diffHours);
    return `${label} ${h} hour${h === 1 ? '' : 's'} ago`;
  }
  if (diffDays < 7) {
    const d = Math.round(diffDays);
    return `${label} ${d} day${d === 1 ? '' : 's'} ago`;
  }

  const d = new Date(ref);
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${label} ${dateStr}`;
}

/** Derive journey name for an insight from its linked jobs (first linked job's journey). */
function getJourneyNameForInsight(
  insightId: string,
  jobs: { id: string; insightIds?: string[] }[],
  phases: { id: string; journeyId: string; jobIds?: string[] }[],
  journeys: { id: string; name: string }[]
): string {
  const linkedJob = jobs.find((j) => (j.insightIds ?? []).includes(insightId));
  if (!linkedJob) return '';
  const phase = phases.find((p) => (p.jobIds ?? []).includes(linkedJob.id));
  if (!phase) return '';
  const journey = journeys.find((j) => j.id === phase.journeyId);
  return journey?.name ?? '';
}

function InsightCard({
  insight,
  journeyLabel,
  linkedJobs,
  priority,
  onLinkedJobClick,
  onClick,
}: {
  insight: Insight;
  journeyLabel: string;
  linkedJobs: { id: string; name: string }[];
  priority: PriorityLevel;
  onLinkedJobClick?: (jobId: string) => void;
  onClick: () => void;
}) {
  const priorityStyles =
    priority === 'High'
      ? 'border-l-red-500 bg-red-500/5 dark:bg-red-500/10'
      : priority === 'Medium'
        ? 'border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
        : 'border-l-stone-300 dark:border-l-stone-500 bg-stone-500/5 dark:bg-stone-500/10';
  const evidence = truncateDescription(insight.description, 160);

  return (
    <article
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md dark:border-stone-600 dark:bg-stone-800 dark:hover:border-stone-500 dark:hover:shadow-md ${priorityStyles} border-l-4`}
    >
      {journeyLabel ? (
        <span className="mb-2 inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-600 dark:text-stone-300">
          {journeyLabel}
        </span>
      ) : null}
      <h3 className="mb-1.5 font-semibold text-stone-900 dark:text-stone-100">
        {insight.title ?? '—'}
      </h3>
      <p className="mb-3 text-sm leading-snug text-stone-600 dark:text-stone-400">
        {evidence}
      </p>
      {linkedJobs.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {linkedJobs.map((j) =>
          onLinkedJobClick ? (
            <button
              key={j.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLinkedJobClick(j.id);
              }}
              className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/25 dark:bg-[#361D60]/20 dark:text-accent-light dark:hover:bg-[#361D60]/30"
            >
              {j.name}
            </button>
          ) : (
            <span key={j.id} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-600 dark:text-stone-300">
              {j.name}
            </span>
          )
        )}
      </div>
      )}
      <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
        {formatInsightRecency(insight)}
      </p>
    </article>
  );
}

interface InsightsTabProps {
  clientId: string;
  /** Optional: when a linked job is clicked, call this (e.g. switch tab). If not provided, job opens in modal on this page. */
  onLinkedJobClick?: (jobId: string) => void;
}

export function InsightsTab({ clientId, onLinkedJobClick }: InsightsTabProps) {
  const insights = useStore((s) => s.insights);
  const jobs = useStore((s) => s.jobs);
  const opportunities = useStore((s) => s.opportunities);
  const phases = useStore((s) => s.phases);
  const journeys = useStore((s) => s.journeys);
  const projects = useStore((s) => s.projects);
  const clients = useStore((s) => s.clients);
  const createInsight = useStore((s) => s.createInsight);
  const updateInsight = useStore((s) => s.updateInsight);
  const deleteInsight = useStore((s) => s.deleteInsight);
  const reorderInsights = useStore((s) => s.reorderInsights);
  const updateJob = useStore((s) => s.updateJob);
  const deleteJob = useStore((s) => s.deleteJob);
  const updateOpportunity = useStore((s) => s.updateOpportunity);
  const deleteOpportunity = useStore((s) => s.deleteOpportunity);
  const moveOpportunityToStage = useStore((s) => s.moveOpportunityToStage);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailStack, setDetailStack] = useState<DetailStackEntry[]>([]);
  const [deleteInsightConfirm, setDeleteInsightConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteOpportunityConfirm, setDeleteOpportunityConfirm] = useState<{ id: string; name: string } | null>(null);

  const clientOpportunities = useMemo(
    () => opportunities.filter((o) => o.clientId === clientId),
    [opportunities, clientId]
  );

  const switchCurrentToEdit = useCallback(() => {
    setDetailStack((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.mode === 'edit') return prev;
      return [...prev.slice(0, -1), { ...last, mode: 'edit' as const }];
    });
  }, []);

  const switchCurrentToView = useCallback(() => {
    setDetailStack((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.mode === 'view') return prev;
      return [...prev.slice(0, -1), { ...last, mode: 'view' as const }];
    });
  }, []);

  const getJobWithMeta = useCallback((jobId: string): JobWithMeta | null => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return null;
    const phaseRefs = phases.filter((p) => (p.jobIds ?? []).includes(job.id));
    const firstPhase = phaseRefs[0];
    const journey = firstPhase ? journeys.find((j) => j.id === firstPhase.journeyId) : null;
    const project = journey ? projects.find((p) => p.id === journey.projectId) : null;
    return {
      ...job,
      projectName: project?.name ?? '—',
      journeyName: journey?.name ?? '—',
      phaseTitle: firstPhase?.title ?? '—',
    };
  }, [jobs, phases, journeys, projects]);

  const getLinkedOpportunities = useCallback(
    (jobId: string) =>
      clientOpportunities.filter((o) => (o.linkedJobIds ?? []).includes(jobId)),
    [clientOpportunities]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterLinkedJobs, setFilterLinkedJobs] = useState<'any' | 'has' | 'none'>('any');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const getLinkedJobs = useCallback(
    (insightId: string) =>
      jobs
        .filter((j) => (j.insightIds ?? []).includes(insightId))
        .map((j) => ({ id: j.id, name: j.name })),
    [jobs]
  );

  const clientInsights = useMemo(
    () => insights.filter((i) => i.clientId === clientId),
    [insights, clientId]
  );

  const filteredInsights = useMemo(() => {
    return clientInsights.filter((ins) => {
      if (filterPriority && (ins.priority ?? 'Medium') !== filterPriority) return false;
      if (filterLinkedJobs !== 'any') {
        const count = getLinkedJobs(ins.id).length;
        if (filterLinkedJobs === 'has' && count === 0) return false;
        if (filterLinkedJobs === 'none' && count > 0) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (ins.title ?? '').toLowerCase();
        const desc = (ins.description ?? '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [clientInsights, filterPriority, filterLinkedJobs, searchQuery, getLinkedJobs]);

  const sortedInsights = useMemo(() => {
    const sorted = [...filteredInsights];
    const cmp = (x: string, y: string) => (x === y ? 0 : x < y ? -1 : 1);
    sorted.sort((a, b) => {
      if (sortColumn) {
        const getVal = (ins: Insight): string => {
          switch (sortColumn) {
            case 'title':
              return (ins.title ?? '').toLowerCase();
            case 'description':
              return (ins.description ?? '').toLowerCase();
            case 'priority':
              return ins.priority ?? 'Medium';
            case 'linkedJobs': {
              const n = getLinkedJobs(ins.id).length;
              return String(n).padStart(4, '0');
            }
            default:
              return '';
          }
        };
        return sortAsc ? cmp(getVal(a), getVal(b)) : cmp(getVal(b), getVal(a));
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });
    return sorted;
  }, [filteredInsights, sortColumn, sortAsc, getLinkedJobs]);

  const insightsByPriority = useMemo(() => {
    const groups: Record<PriorityLevel, Insight[]> = { High: [], Medium: [], Low: [] };
    for (const ins of sortedInsights) {
      const p = (ins.priority ?? 'Medium') as PriorityLevel;
      if (groups[p]) groups[p].push(ins);
    }
    return groups;
  }, [sortedInsights]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-stone-200/80 bg-white px-6 py-4 dark:border-stone-600/80 dark:bg-stone-900">
        <div className="flex flex-wrap items-end gap-4">
          <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Filter by:</span>
          <div>
            <label htmlFor="filter-priority" className={LABEL_CLASS}>Priority</label>
            <select
              id="filter-priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">Select</option>
              {PRIORITY_LEVELS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-linked-jobs" className={LABEL_CLASS}>Linked jobs</label>
            <select
              id="filter-linked-jobs"
              value={filterLinkedJobs}
              onChange={(e) => setFilterLinkedJobs(e.target.value as 'any' | 'has' | 'none')}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="any">Any</option>
              <option value="has">Has linked jobs</option>
              <option value="none">No linked jobs</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search insights..."
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder-stone-500"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-accent-hover dark:hover:shadow-glow-dark"
          >
            Add insight
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {sortedInsights.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center">
            <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-stone-800">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                No insights yet. Create research insights here, then link them to jobs when creating or editing jobs.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {(['High', 'Medium', 'Low'] as const).map((priority) => {
              const list = insightsByPriority[priority];
              if (list.length === 0) return null;
              return (
                <section key={priority}>
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {priority.toUpperCase()} PRIORITY ({list.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((insight) => (
                      <InsightCard
                        key={insight.id}
                        insight={insight}
                        getLinkedJobs={getLinkedJobs}
                        onRowClick={() => setDetailStack([{ type: 'insight', id: insight.id, mode: 'view' }])}
                        onLinkedJobClick={onLinkedJobClick ?? ((jobId) => setDetailStack([{ type: 'job', id: jobId, mode: 'view' }]))}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <CreateInsightModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        clientId={clientId}
        onCreate={(data) => {
          createInsight(clientId, data);
          setCreateOpen(false);
        }}
      />

      <DetailStackModal
        isOpen={detailStack.length > 0}
        stack={detailStack}
        onBack={() => setDetailStack((prev) => prev.slice(0, -1))}
        onClose={() => setDetailStack([])}
        getTitle={(entry) => {
          if (entry.type === 'insight') {
            const i = insights.find((x) => x.id === entry.id);
            return i?.title ?? '—';
          }
          if (entry.type === 'job') {
            const j = jobs.find((x) => x.id === entry.id);
            return j?.name ?? '—';
          }
          const o = clientOpportunities.find((x) => x.id === entry.id);
          return o?.name ?? '—';
        }}
        renderPanel={(entry) => {
          if (entry.type === 'insight') {
            const insight = insights.find((i) => i.id === entry.id);
            if (!insight) return <p className="text-sm text-stone-500">Insight not found.</p>;
            const linkedJobsForInsight = jobs
              .filter((j) => (j.insightIds ?? []).includes(insight.id))
              .map((j) => ({ id: j.id, name: j.name ?? '—' }));
            if (entry.mode === 'edit') {
              return (
                <InsightDetailPanel
                  insight={insight}
                  mode="edit"
                  embedded
                  hideFooter
                  onSave={(data) => {
                    updateInsight(insight.id, data);
                    switchCurrentToView();
                  }}
                  onCancel={switchCurrentToView}
                />
              );
            }
            return (
              <InsightDetailPanel
                insight={insight}
                mode="view"
                linkedJobs={linkedJobsForInsight}
                embedded
                onLinkedJobClick={(jobId) => setDetailStack((prev) => [...prev, { type: 'job', id: jobId, mode: 'view' }])}
              />
            );
          }

          if (entry.type === 'job') {
            const jobWithMeta = getJobWithMeta(entry.id);
            if (!jobWithMeta) return <p className="text-sm text-stone-500">Job not found.</p>;
            const job = jobs.find((j) => j.id === entry.id)!;
            if (entry.mode === 'edit') {
              const jobFormId = `edit-job-form-${entry.id}`;
              return (
                <JobModal
                  isOpen
                  onClose={switchCurrentToView}
                  job={job}
                  jobIndex={0}
                  insights={insights.filter((i) => i.clientId === clientId)}
                  onSave={(_index, updated) => {
                    updateJob(job.id, updated);
                    switchCurrentToView();
                  }}
                  embedded
                  hideFooter
                  formId={jobFormId}
                />
              );
            }
            return (
              <JobReadOnlyModal
                isOpen
                onClose={() => setDetailStack([])}
                job={jobWithMeta}
                embedded
                hideEmbeddedFooter
                linkedInsights={(job.insightIds ?? [])
                  .map((id) => insights.find((i) => i.id === id))
                  .filter(Boolean)
                  .map((i) => ({ id: i!.id, title: i!.title ?? '—' }))}
                linkedOpportunities={getLinkedOpportunities(job.id).map((o) => ({ id: o.id, name: o.name }))}
                onOpportunityClick={(opp) => setDetailStack((prev) => [...prev, { type: 'opportunity', id: opp.id, mode: 'view' }])}
                onInsightClick={(ins) => setDetailStack((prev) => [...prev, { type: 'insight', id: ins.id, mode: 'view' }])}
              />
            );
          }

          // opportunity
          const opp = clientOpportunities.find((o) => o.id === entry.id);
          if (!opp) return <p className="text-sm text-stone-500">Opportunity not found.</p>;
          if (entry.mode === 'edit') {
            return (
              <OpportunityModal
                isOpen
                onClose={switchCurrentToView}
                opportunity={opp}
                jobsInJourney={jobs.filter((j) => j.clientId === clientId).map((j) => ({ key: j.id, label: j.name ?? '—' }))}
                onSave={(updated) => {
                  if (updated.stage != null && updated.stage !== opp.stage) {
                    moveOpportunityToStage(updated.id, updated.stage, 0);
                  }
                  updateOpportunity(updated.id, { name: updated.name, description: updated.description, priority: updated.priority, isPriority: updated.isPriority, pointOfDifferentiation: updated.pointOfDifferentiation, criticalAssumptions: updated.criticalAssumptions, linkedJobIds: updated.linkedJobIds });
                  switchCurrentToView();
                }}
                embedded
                hideFooter
              />
            );
          }
          return (
            <OpportunityReadOnlyModal
              isOpen
              onClose={() => setDetailStack([])}
              opportunity={opp}
              embedded
              clientName={clients.find((c) => c.id === opp.clientId)?.name}
              projectName={projects.find((p) => p.id === opp.projectId)?.name}
              journeyName={journeys.find((j) => j.id === opp.journeyId)?.name}
              phaseTitle={phases.find((p) => p.id === opp.phaseId)?.title}
              linkedJobLabels={jobs.filter((j) => (opp.linkedJobIds ?? []).includes(j.id)).map((j) => ({ key: j.id, label: j.name ?? '—' }))}
              onLinkedJobClick={(jobId) => setDetailStack((prev) => [...prev, { type: 'job', id: jobId, mode: 'view' }])}
            />
          );
        }}
        renderFooter={(entry) => {
          const onClose = () => setDetailStack([]);

          if (entry.mode === 'edit') {
            if (entry.type === 'insight') {
              return (
                <div className="flex gap-3">
                  <button type="button" onClick={switchCurrentToView} className={`flex-1 ${modalButtonSecondary}`}>
                    Cancel
                  </button>
                  <button type="submit" form="edit-insight-form-stack" className={`flex-1 ${modalButtonPrimary}`}>
                    Save
                  </button>
                </div>
              );
            }
            if (entry.type === 'job') {
              const jobFormId = `edit-job-form-${entry.id}`;
              return (
                <div className="flex gap-3">
                  <button type="button" onClick={switchCurrentToView} className={`flex-1 ${modalButtonSecondary}`}>
                    Cancel
                  </button>
                  <button type="submit" form={jobFormId} className={`flex-1 ${modalButtonPrimary}`}>
                    Save
                  </button>
                </div>
              );
            }
            if (entry.type === 'opportunity') {
              return (
                <div className="flex gap-3">
                  <button type="button" onClick={switchCurrentToView} className={`flex-1 ${modalButtonSecondary}`}>
                    Cancel
                  </button>
                  <button type="submit" form="edit-opportunity-form" className={`flex-1 ${modalButtonPrimary}`}>
                    Save
                  </button>
                </div>
              );
            }
            return null;
          }

          // View mode
          if (entry.type === 'insight') {
            const insight = insights.find((i) => i.id === entry.id);
            return (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteInsightConfirm({ id: entry.id, name: insight?.title ?? 'this insight' })}
                  className={modalButtonDanger}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={switchCurrentToEdit}
                  className={`flex-1 ${modalButtonSecondary}`}
                >
                  Edit
                </button>
                <button type="button" onClick={onClose} className={`flex-1 ${modalButtonPrimary}`}>
                  Close
                </button>
              </div>
            );
          }

          if (entry.type === 'job') {
            const job = jobs.find((j) => j.id === entry.id);
            return (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteJobConfirm({ id: entry.id, name: job?.name ?? 'this job' })}
                  className={modalButtonDanger}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={switchCurrentToEdit}
                  className={`flex-1 ${modalButtonSecondary}`}
                >
                  Edit
                </button>
                <button type="button" onClick={onClose} className={`flex-1 ${modalButtonPrimary}`}>
                  Close
                </button>
              </div>
            );
          }
          if (entry.type === 'opportunity') {
            const opp = clientOpportunities.find((o) => o.id === entry.id);
            return (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteOpportunityConfirm({ id: entry.id, name: opp?.name ?? 'this opportunity' })}
                  className={modalButtonDanger}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={switchCurrentToEdit}
                  className={`flex-1 ${modalButtonSecondary}`}
                >
                  Edit
                </button>
                <button type="button" onClick={onClose} className={`flex-1 ${modalButtonPrimary}`}>
                  Close
                </button>
              </div>
            );
          }
          return null;
        }}
      />

      {deleteInsightConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteInsightConfirm(null)}
          onConfirm={() => {
            deleteInsight(deleteInsightConfirm.id);
            setDetailStack((prev) => prev.filter((e) => !(e.type === 'insight' && e.id === deleteInsightConfirm.id)));
            setDeleteInsightConfirm(null);
          }}
          title="Delete insight"
          message={`Are you sure you want to delete "${deleteInsightConfirm.name}"? It will be unlinked from any jobs that reference it.`}
        />
      )}

      {deleteJobConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteJobConfirm(null)}
          onConfirm={() => {
            deleteJob(deleteJobConfirm.id);
            setDetailStack((prev) => prev.filter((e) => !(e.type === 'job' && e.id === deleteJobConfirm.id)));
            setDeleteJobConfirm(null);
          }}
          title="Delete job"
          message={`Are you sure you want to delete "${deleteJobConfirm.name}"? It will be removed from any phases and opportunities it's linked to.`}
        />
      )}

      {deleteOpportunityConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteOpportunityConfirm(null)}
          onConfirm={() => {
            deleteOpportunity(deleteOpportunityConfirm.id);
            setDetailStack((prev) => prev.filter((e) => !(e.type === 'opportunity' && e.id === deleteOpportunityConfirm.id)));
            setDeleteOpportunityConfirm(null);
          }}
          title="Delete opportunity"
          message={`Are you sure you want to delete "${deleteOpportunityConfirm.name}"?`}
        />
      )}
    </div>
  );
}
