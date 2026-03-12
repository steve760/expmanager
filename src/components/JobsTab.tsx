import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/store';
import type { CustomerJobTag, Job, Opportunity, PriorityLevel } from '@/types';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

function truncateDescription(text: string | undefined, maxLen: number): string {
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

/** Format job recency: relative for recent (e.g. "Updated 2 days ago"), short date for older (e.g. "Created 14 Mar 2025"). */
function formatJobRecency(job: { createdAt: string; updatedAt: string }): string {
  const updated = new Date(job.updatedAt).getTime();
  const created = new Date(job.createdAt).getTime();
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
import { LABEL_CLASS } from '@/components/ui/ModalLabel';
import { JobReadOnlyModal } from '@/components/JobReadOnlyModal';
import { JobModal } from '@/components/JobModal';
import { CreateJobModal } from '@/components/modals/CreateJobModal';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';
import { DetailStackModal, type DetailStackEntry } from '@/components/DetailStackModal';
import { modalButtonDanger, modalButtonPrimary, modalButtonSecondary } from '@/components/ui/Modal';
import { InsightDetailPanel } from '@/components/InsightDetailPanel';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const JOB_TAGS: CustomerJobTag[] = ['Functional', 'Social', 'Emotional'];

type SortColumn =
  | 'title'
  | 'description'
  | 'type'
  | 'priority'
  | 'metaJourney'
  | 'journey'
  | 'phase'
  | 'struggles'
  | 'opportunities';

export type JobPlacement = {
  projectId: string;
  projectName: string;
  journeyId: string;
  journeyName: string;
  phaseId: string;
  phaseTitle: string;
};

export type JobRow = Job & {
  key: string;
  /** Single value for sort/backward compat; derived from arrays */
  projectName?: string;
  journeyName?: string;
  phaseTitle?: string;
  /** First project/journey for legacy single-value use */
  projectId?: string;
  journeyId?: string;
  /** All placements: a job can be assigned to multiple meta-journeys, journeys, phases */
  projectIds: string[];
  projectNames: string[];
  journeyIds: string[];
  journeyNames: string[];
  phaseTitles: string[];
  placements: JobPlacement[];
};

function jobTagStyle(tag: CustomerJobTag): string {
  if (tag === 'Functional') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
  if (tag === 'Social') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
}

function JobCard({
  job,
  journeyLabel,
  linkedOpportunities,
  priority,
  onOpportunityClick,
  onClick,
}: {
  job: JobRow;
  journeyLabel: string;
  linkedOpportunities: Opportunity[];
  priority: PriorityLevel;
  onOpportunityClick: (o: Opportunity) => void;
  onClick: () => void;
}) {
  const priorityStyles =
    priority === 'High'
      ? 'border-l-red-500 bg-red-500/5 dark:bg-red-500/10'
      : priority === 'Medium'
        ? 'border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
        : 'border-l-stone-300 dark:border-l-stone-500 bg-stone-500/5 dark:bg-stone-500/10';
  const evidence = truncateDescription(job.description, 160);

  return (
    <article
      onClick={onClick}
      className={`group relative cursor-pointer rounded-lg border border-stone-200 bg-white p-4 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow-md dark:border-stone-600 dark:bg-stone-800 dark:hover:border-stone-500 dark:hover:shadow-md ${priorityStyles} border-l-4`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {journeyLabel ? (
          <span className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-600 dark:text-stone-300">
            {journeyLabel}
          </span>
        ) : null}
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${jobTagStyle(job.tag)}`}>
          {job.tag}
        </span>
      </div>
      <h3 className="mb-1.5 font-semibold text-stone-900 dark:text-stone-100">
        {job.name ?? '—'}
      </h3>
      <p className="mb-3 text-sm leading-snug text-stone-600 dark:text-stone-400">
        {evidence}
      </p>
      {linkedOpportunities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedOpportunities.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpportunityClick(o);
              }}
              className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/25 dark:bg-[#361D60]/20 dark:text-accent-light dark:hover:bg-[#361D60]/30"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
        {formatJobRecency(job)}
      </p>
    </article>
  );
}

export function JobsTab({ clientId }: { clientId: string }) {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const insights = useStore((s) => s.insights);
  const opportunities = useStore((s) => s.opportunities);
  const createJob = useStore((s) => s.createJob);
  const updateJob = useStore((s) => s.updateJob);
  const deleteJob = useStore((s) => s.deleteJob);
  const updateOpportunityStore = useStore((s) => s.updateOpportunity);
  const moveOpportunityToStage = useStore((s) => s.moveOpportunityToStage);
  const updateInsight = useStore((s) => s.updateInsight);
  const deleteInsight = useStore((s) => s.deleteInsight);
  const deleteOpportunity = useStore((s) => s.deleteOpportunity);

  const [detailStack, setDetailStack] = useState<DetailStackEntry[]>([]);

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

  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteInsightConfirm, setDeleteInsightConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteOpportunityConfirm, setDeleteOpportunityConfirm] = useState<{ id: string; name: string } | null>(null);
  const [filterMetaJourney, setFilterMetaJourney] = useState<string>('');
  const [filterJourney, setFilterJourney] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, _setSortColumn] = useState<SortColumn | null>(null);
  const [sortAsc, _setSortAsc] = useState<boolean>(true);
  const [manualOrder, _setManualOrder] = useState<string[]>([]);

  const client = clients.find((c) => c.id === clientId);
  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const clientJourneys = journeys.filter((j) => clientProjects.some((p) => p.id === j.projectId));

  const allJobs: JobRow[] = useMemo(() => {
    const clientJobsList = jobs.filter((j) => j.clientId === clientId);
    return clientJobsList.map((job) => {
      const phaseRefs = phases.filter((p) => (p.jobIds ?? []).includes(job.id));
      const projectIds: string[] = [];
      const projectNames: string[] = [];
      const journeyIds: string[] = [];
      const journeyNames: string[] = [];
      const phaseTitles: string[] = [];
      const placements: JobPlacement[] = [];
      const seenProject = new Set<string>();
      const seenJourney = new Set<string>();
      for (const phase of phaseRefs) {
        const journey = journeys.find((j) => j.id === phase.journeyId);
        const project = journey ? projects.find((p) => p.id === journey.projectId) : null;
        if (project && !seenProject.has(project.id)) {
          seenProject.add(project.id);
          projectIds.push(project.id);
          projectNames.push(project.name);
        }
        if (journey && !seenJourney.has(journey.id)) {
          seenJourney.add(journey.id);
          journeyIds.push(journey.id);
          journeyNames.push(journey.name);
        }
        phaseTitles.push(phase.title ?? 'Phase');
        if (journey && project) {
          placements.push({
            projectId: project.id,
            projectName: project.name,
            journeyId: journey.id,
            journeyName: journey.name,
            phaseId: phase.id,
            phaseTitle: phase.title ?? 'Phase',
          });
        }
      }
      const firstProjectId = projectIds[0];
      const firstJourneyId = journeyIds[0];
      return {
        ...job,
        key: job.id,
        projectIds,
        projectNames,
        journeyIds,
        journeyNames,
        phaseTitles,
        placements,
        projectName: projectNames.length > 0 ? projectNames.join(', ') : '—',
        journeyName: journeyNames.length > 0 ? journeyNames.join(', ') : '—',
        phaseTitle: phaseTitles.length > 0 ? phaseTitles.join(', ') : '—',
        projectId: firstProjectId,
        journeyId: firstJourneyId,
      };
    });
  }, [jobs, clientId, phases, journeys, projects]);

  const filteredJobs = useMemo(() => {
    return allJobs.filter((job) => {
      if (filterMetaJourney && !(job.projectIds ?? []).includes(filterMetaJourney)) return false;
      if (filterJourney && !(job.journeyIds ?? []).includes(filterJourney)) return false;
      if (filterType && job.tag !== filterType) return false;
      if (filterPriority && (job.priority ?? 'Medium') !== filterPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (job.name ?? '').toLowerCase();
        const desc = (job.description ?? '').toLowerCase();
        const meta = (job.projectName ?? '').toLowerCase();
        const journey = (job.journeyName ?? '').toLowerCase();
        const phase = (job.phaseTitle ?? '').toLowerCase();
        const struggles = (job.struggles ?? []).join(' ').toLowerCase();
        const tag = job.tag.toLowerCase();
        if (
          !title.includes(q) &&
          !desc.includes(q) &&
          !meta.includes(q) &&
          !journey.includes(q) &&
          !phase.includes(q) &&
          !struggles.includes(q) &&
          !tag.includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allJobs, filterMetaJourney, filterJourney, filterType, filterPriority, searchQuery]);

  const clientOpportunities = useMemo(
    () => opportunities.filter((o) => o.clientId === clientId),
    [opportunities, clientId]
  );

  const getLinkedOpportunities = useCallback(
    (jobId: string) =>
      clientOpportunities.filter((o) => (o.linkedJobIds ?? []).includes(jobId)),
    [clientOpportunities]
  );

  const sortedJobs = useMemo(() => {
    const sorted = [...filteredJobs];
    const prioritySortOrder = (p: PriorityLevel) => (p === 'High' ? 0 : p === 'Medium' ? 1 : 2);
    sorted.sort((a, b) => {
      const prioA = prioritySortOrder((a.priority ?? 'Medium') as PriorityLevel);
      const prioB = prioritySortOrder((b.priority ?? 'Medium') as PriorityLevel);
      if (prioA !== prioB) return prioA - prioB;

      if (!sortColumn) {
        if (manualOrder.length > 0) {
          const idxA = manualOrder.indexOf(a.key);
          const idxB = manualOrder.indexOf(b.key);
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          if (idxA >= 0) return -1;
          if (idxB >= 0) return 1;
        }
        return 0;
      }

      const cmp = (x: string, y: string) => (x === y ? 0 : x < y ? -1 : 1);
      const getVal = (j: JobRow): string => {
        switch (sortColumn) {
          case 'title': return (j.name ?? '').toLowerCase();
          case 'description': return (j.description ?? '').toLowerCase();
          case 'type': return j.tag;
          case 'priority': return j.priority ?? 'Medium';
          case 'metaJourney': return (j.projectName ?? '').toLowerCase();
          case 'journey': return (j.journeyName ?? '').toLowerCase();
          case 'phase': return (j.phaseTitle ?? '').toLowerCase();
          case 'struggles': return (j.struggles ?? []).join(' ').toLowerCase();
          case 'opportunities': return String(getLinkedOpportunities(j.id).length).padStart(4, '0');
          default: return '';
        }
      };
      return sortAsc ? cmp(getVal(a), getVal(b)) : cmp(getVal(b), getVal(a));
    });
    return sorted;
  }, [filteredJobs, sortColumn, sortAsc, manualOrder, getLinkedOpportunities]);

  const jobsByPriority = useMemo(() => {
    const groups: Record<PriorityLevel, JobRow[]> = { High: [], Medium: [], Low: [] };
    for (const job of sortedJobs) {
      const p = (job.priority ?? 'Medium') as PriorityLevel;
      if (groups[p]) groups[p].push(job);
    }
    return groups;
  }, [sortedJobs]);

  if (!client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-stone-200/80 bg-white px-6 py-4 dark:border-stone-600/80 dark:bg-stone-900">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Filter by:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-meta-journey" className={`shrink-0 ${LABEL_CLASS.replace('block ', '')}`}>Meta-Journey</label>
            <select
              id="filter-meta-journey"
              value={filterMetaJourney}
              onChange={(e) => setFilterMetaJourney(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">Select</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-journey" className={`shrink-0 ${LABEL_CLASS.replace('block ', '')}`}>Journey</label>
            <select
              id="filter-journey"
              value={filterJourney}
              onChange={(e) => setFilterJourney(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">Select</option>
              {clientJourneys.map((j) => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-type" className={`shrink-0 ${LABEL_CLASS.replace('block ', '')}`}>Type</label>
            <select
              id="filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
            >
              <option value="">Select</option>
              {JOB_TAGS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="filter-priority" className={`shrink-0 ${LABEL_CLASS.replace('block ', '')}`}>Priority</label>
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
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search jobs..."
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:placeholder-stone-500"
          />
          <button
            onClick={() => setCreateJobOpen(true)}
            className="rounded-2xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-accent-hover dark:hover:shadow-glow-dark"
          >
            Add job
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {sortedJobs.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center">
            <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-stone-800">
              <p className="text-sm text-stone-600 dark:text-stone-400">
                No jobs yet. Create jobs here, then assign them to phases in the Meta-Journeys tab.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {(['High', 'Medium', 'Low'] as const).map((priority) => {
              const list = jobsByPriority[priority];
              if (list.length === 0) return null;
              return (
                <section key={priority}>
                  <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {priority.toUpperCase()} PRIORITY ({list.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {list.map((job) => (
                      <JobCard
                        key={job.key}
                        job={job}
                        journeyLabel={job.journeyNames?.[0] ?? ''}
                        linkedOpportunities={getLinkedOpportunities(job.id)}
                        priority={(job.priority ?? 'Medium') as PriorityLevel}
                        onOpportunityClick={(o) =>
                          setDetailStack([
                            { type: 'job', id: job.id, mode: 'view' },
                            { type: 'opportunity', id: o.id, mode: 'view' },
                          ])
                        }
                        onClick={() => setDetailStack([{ type: 'job', id: job.id, mode: 'view' }])}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <DetailStackModal
        isOpen={detailStack.length > 0}
        stack={detailStack}
        onBack={() => setDetailStack((prev) => prev.slice(0, -1))}
        onClose={() => setDetailStack([])}
        getTitle={(entry) => {
          if (entry.type === 'job') {
            const j = allJobs.find((x) => x.id === entry.id) ?? jobs.find((x) => x.id === entry.id);
            return j?.name ?? '—';
          }
          if (entry.type === 'opportunity') {
            const o = clientOpportunities.find((x) => x.id === entry.id);
            return o?.name ?? '—';
          }
          const i = insights.find((x) => x.id === entry.id);
          return i?.title ?? '—';
        }}
        renderPanel={(entry) => {
          if (entry.type === 'job') {
            const jobRow = allJobs.find((j) => j.id === entry.id);
            const job = jobRow ?? jobs.find((j) => j.id === entry.id);
            if (!job) return <p className="text-sm text-stone-500">Job not found.</p>;
            const jobWithMeta = jobRow
              ? {
                  ...jobRow,
                  projectName: jobRow.projectName ?? '—',
                  journeyName: jobRow.journeyName ?? '—',
                  phaseTitle: jobRow.phaseTitle ?? '—',
                  placements: jobRow.placements?.length
                    ? jobRow.placements.map((p) => ({ projectName: p.projectName, journeyName: p.journeyName, phaseTitle: p.phaseTitle }))
                    : undefined,
                }
              : { ...job, projectName: '—', journeyName: '—', phaseTitle: '—' };
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
                linkedInsights={(job.insightIds ?? []).map((id) => insights.find((i) => i.id === id)).filter(Boolean).map((i) => ({ id: i!.id, title: i!.title ?? '—' }))}
                linkedOpportunities={getLinkedOpportunities(job.id).map((o) => ({ id: o.id, name: o.name }))}
                onOpportunityClick={(opp) => setDetailStack((prev) => [...prev, { type: 'opportunity', id: opp.id, mode: 'view' }])}
                onInsightClick={(ins) => setDetailStack((prev) => [...prev, { type: 'insight', id: ins.id, mode: 'view' }])}
                onEdit={switchCurrentToEdit}
                onDelete={() => setDeleteJobConfirm({ id: job.id, name: job.name ?? 'this job' })}
              />
            );
          }
          if (entry.type === 'opportunity') {
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
                    updateOpportunityStore(updated.id, { name: updated.name, description: updated.description, priority: updated.priority, isPriority: updated.isPriority, pointOfDifferentiation: updated.pointOfDifferentiation, criticalAssumptions: updated.criticalAssumptions, linkedJobIds: updated.linkedJobIds });
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
                onEdit={switchCurrentToEdit}
                onLinkedJobClick={(jobId) => setDetailStack((prev) => [...prev, { type: 'job', id: jobId, mode: 'view' }])}
              />
            );
          }
          const insight = insights.find((i) => i.id === entry.id);
          if (!insight) return <p className="text-sm text-stone-500">Insight not found.</p>;
          const linkedJobsForInsight = jobs.filter((j) => (j.insightIds ?? []).includes(insight.id)).map((j) => ({ id: j.id, name: j.name ?? '—' }));
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
              onEdit={switchCurrentToEdit}
              onDelete={() => setDeleteInsightConfirm({ id: insight.id, name: insight.title ?? 'this insight' })}
              onLinkedJobClick={(jobId) => setDetailStack((prev) => [...prev, { type: 'job', id: jobId, mode: 'view' }])}
            />
          );
        }}
        renderFooter={(entry) => {
          const onClose = () => setDetailStack([]);

          if (entry.mode === 'edit') {
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
            return null;
          }

          // View mode: consistent CTAs
          if (entry.type === 'job') {
            const job = allJobs.find((j) => j.id === entry.id) ?? jobs.find((j) => j.id === entry.id);
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); switchCurrentToEdit(); }}
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
                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); switchCurrentToEdit(); }} className={`flex-1 ${modalButtonSecondary}`}>
                  Edit
                </button>
                <button type="button" onClick={onClose} className={`flex-1 ${modalButtonPrimary}`}>
                  Close
                </button>
              </div>
            );
          }
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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); switchCurrentToEdit(); }}
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

      <CreateJobModal
        isOpen={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        clientId={clientId}
        insights={insights.filter((i) => i.clientId === clientId)}
        onCreate={(data) => {
          createJob(clientId, data);
          setCreateJobOpen(false);
        }}
      />

    </div>
  );
}
