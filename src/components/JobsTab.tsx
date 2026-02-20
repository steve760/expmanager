import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store';
import type { CustomerJobTag, Job, Opportunity, PriorityLevel } from '@/types';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

function truncateDescription(text: string | undefined, maxLen: number): string {
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}
import { LABEL_CLASS } from '@/components/ui/ModalLabel';
import { JobReadOnlyModal } from '@/components/JobReadOnlyModal';
import { JobModal } from '@/components/JobModal';
import { CreateJobModal } from '@/components/modals/CreateJobModal';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';
import { DetailStackModal, type DetailStackEntry } from '@/components/DetailStackModal';
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

function SortableJobRow({
  job,
  linked,
  tagStyle,
  onRowClick,
  onOpportunityClick,
}: {
  job: JobRow;
  linked: Opportunity[];
  tagStyle: string;
  onRowClick: () => void;
  onOpportunityClick: (o: Opportunity) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: job.key,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={onRowClick}
      className={`cursor-pointer border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/60 ${
        isDragging ? 'bg-stone-100 dark:bg-stone-800 opacity-90' : ''
      }`}
    >
      <td className="w-10 px-2 py-3">
        <div className="flex items-center gap-1">
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab touch-none rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-600 active:cursor-grabbing dark:hover:bg-stone-600 dark:hover:text-stone-300"
            aria-label="Drag to reorder"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-medium text-stone-900 dark:text-stone-100">{job.name ?? '—'}</span>
      </td>
      <td className="max-w-[200px] px-4 py-3">
        <span className="text-stone-600 dark:text-stone-300" title={job.description}>
          {truncateDescription(job.description, 80)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tagStyle}`}>{job.tag}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          job.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200' :
          job.priority === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200' :
          'bg-stone-100 text-stone-700 dark:bg-stone-600 dark:text-stone-200'
        }`}>
          {job.priority ?? 'Medium'}
        </span>
      </td>
      <td className="max-w-[180px] px-4 py-3 text-stone-600 dark:text-stone-300">
        {(job.projectNames?.length ?? 0) > 0 ? (
          <span className="flex flex-wrap gap-1" title={job.projectNames?.join(', ')}>
            {job.projectNames!.map((name) => (
              <span key={name} className="inline-flex rounded-md bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-700">
                {name}
              </span>
            ))}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="max-w-[180px] px-4 py-3 text-stone-600 dark:text-stone-300">
        {(job.journeyNames?.length ?? 0) > 0 ? (
          <span className="flex flex-wrap gap-1" title={job.journeyNames?.join(', ')}>
            {job.journeyNames!.map((name) => (
              <span key={name} className="inline-flex rounded-md bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-700">
                {name}
              </span>
            ))}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="max-w-[180px] px-4 py-3 text-stone-600 dark:text-stone-300">
        {(job.phaseTitles?.length ?? 0) > 0 ? (
          <span className="flex flex-wrap gap-1" title={job.phaseTitles?.join(', ')}>
            {job.phaseTitles!.map((title, i) => (
              <span key={`${title}-${i}`} className="inline-flex rounded-md bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-stone-700">
                {title}
              </span>
            ))}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="max-w-[160px] px-4 py-3">
        <span className="line-clamp-2 text-stone-600 dark:text-stone-300">
          {job.struggles && job.struggles.length > 0 ? job.struggles.join(', ') : '—'}
        </span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {linked.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {linked.map((o) => (
              <button
                key={o.id}
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
        ) : (
          <span className="text-stone-400 dark:text-stone-500">—</span>
        )}
      </td>
    </tr>
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
  const updateInsight = useStore((s) => s.updateInsight);
  const deleteInsight = useStore((s) => s.deleteInsight);

  const [detailStack, setDetailStack] = useState<DetailStackEntry[]>([]);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [deleteJobConfirm, setDeleteJobConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteInsightConfirm, setDeleteInsightConfirm] = useState<{ id: string; name: string } | null>(null);
  const [filterMetaJourney, setFilterMetaJourney] = useState<string>('');
  const [filterJourney, setFilterJourney] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [manualOrder, setManualOrder] = useState<string[]>([]);

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

  const handleSort = useCallback((col: SortColumn) => {
    setSortColumn((prev) => {
      if (prev === col) {
        setSortAsc((a) => !a);
        return col;
      }
      setSortAsc(true);
      return col;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const keys = sortedJobs.map((j) => j.key);
    const oldIndex = keys.indexOf(active.id as string);
    const newIndex = keys.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...keys];
    const [removed] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, removed);
    setManualOrder(next);
  }, [sortedJobs]);

  const Th = ({ column, label }: { column: SortColumn | null; label: string }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/80"
      onClick={() => column && handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortColumn === column && <span className="text-accent">{sortAsc ? '↑' : '↓'}</span>}
      </div>
    </th>
  );

  if (!client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-end justify-between gap-4 border-b border-stone-200/80 bg-white px-6 py-4 dark:border-stone-600/80 dark:bg-stone-900">
        <div className="flex flex-wrap items-end gap-4">
          <span className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Filter by:</span>
        <div>
          <label htmlFor="filter-meta-journey" className={LABEL_CLASS}>Meta-Journey</label>
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
        <div>
          <label htmlFor="filter-journey" className={LABEL_CLASS}>Journey</label>
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
        <div>
          <label htmlFor="filter-type" className={LABEL_CLASS}>Type</label>
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
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80">
                    <th className="w-10 px-2 py-3" aria-label="Reorder" />
                    <Th column="title" label="Title" />
                    <Th column="description" label="Description" />
                    <Th column="type" label="Primary Type" />
                    <Th column="priority" label="Priority" />
                    <Th column="metaJourney" label="Meta-Journey" />
                    <Th column="journey" label="Journey" />
                    <Th column="phase" label="Phase" />
                    <Th column="struggles" label="Struggles" />
                    <Th column="opportunities" label="Linked Opportunities" />
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={sortedJobs.map((j) => j.key)} strategy={verticalListSortingStrategy}>
                    {sortedJobs.map((job) => (
                      <SortableJobRow
                        key={job.key}
                        job={job}
                        linked={getLinkedOpportunities(job.id)}
                        tagStyle={jobTagStyle(job.tag)}
                                                onRowClick={() => setDetailStack([{ type: 'job', id: job.id, mode: 'view' }])}
                        onOpportunityClick={(o) =>
                          setDetailStack([
                            { type: 'job', id: job.id, mode: 'view' },
                            { type: 'opportunity', id: o.id, mode: 'view' },
                          ])
                        }
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
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
                  onClose={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }])}
                  job={job}
                  jobIndex={0}
                  insights={insights.filter((i) => i.clientId === clientId)}
                  onSave={(_index, updated) => {
                    updateJob(job.id, updated);
                    setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }]);
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
                linkedInsights={(job.insightIds ?? []).map((id) => insights.find((i) => i.id === id)).filter(Boolean).map((i) => ({ id: i!.id, title: i!.title ?? '—' }))}
                linkedOpportunities={getLinkedOpportunities(job.id).map((o) => ({ id: o.id, name: o.name }))}
                onOpportunityClick={(opp) => setDetailStack((prev) => [...prev, { type: 'opportunity', id: opp.id, mode: 'view' }])}
                onInsightClick={(ins) => setDetailStack((prev) => [...prev, { type: 'insight', id: ins.id, mode: 'view' }])}
                onEdit={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'edit' }])}
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
                  onClose={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }])}
                  opportunity={opp}
                  jobsInJourney={jobs.filter((j) => j.clientId === clientId).map((j) => ({ key: j.id, label: j.name ?? '—' }))}
                  onSave={(updated) => {
                    updateOpportunityStore(updated.id, { name: updated.name, description: updated.description, priority: updated.priority, stage: updated.stage, isPriority: updated.isPriority, pointOfDifferentiation: updated.pointOfDifferentiation, criticalAssumptions: updated.criticalAssumptions, linkedJobIds: updated.linkedJobIds });
                    setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }]);
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
                onEdit={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'edit' }])}
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
                  setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }]);
                }}
                onCancel={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }])}
              />
            );
          }
          return (
            <InsightDetailPanel
              insight={insight}
              mode="view"
              linkedJobs={linkedJobsForInsight}
              embedded
              onEdit={() => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'edit' }])}
              onDelete={() => setDeleteInsightConfirm({ id: insight.id, name: insight.title ?? 'this insight' })}
              onLinkedJobClick={(jobId) => setDetailStack((prev) => [...prev, { type: 'job', id: jobId, mode: 'view' }])}
            />
          );
        }}
        renderFooter={(entry) => {
          const onClose = () => setDetailStack([]);
          const onEdit = () => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'edit' }]);
          const onCancel = () => setDetailStack((prev) => [...prev.slice(0, -1), { ...entry, mode: 'view' }]);

          if (entry.mode === 'edit') {
            if (entry.type === 'job') {
              return null;
            }
            if (entry.type === 'opportunity') {
              return (
                <div className="flex gap-3">
                  <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
                    Cancel
                  </button>
                  <button type="submit" form="edit-opportunity-form" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
                    Save
                  </button>
                </div>
              );
            }
            if (entry.type === 'insight') {
              return (
                <div className="flex gap-3">
                  <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
                    Cancel
                  </button>
                  <button type="submit" form="edit-insight-form-stack" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
                    Save
                  </button>
                </div>
              );
            }
            return null;
          }

          // View mode: always show Edit + Close (and Delete for job/insight) in the bottom bar
          if (entry.type === 'job') {
            const job = allJobs.find((j) => j.id === entry.id) ?? jobs.find((j) => j.id === entry.id);
            return (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteJobConfirm({ id: entry.id, name: job?.name ?? 'this job' })}
                  className="rounded-xl border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Edit
                </button>
                <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
                  Close
                </button>
              </div>
            );
          }
          if (entry.type === 'opportunity') {
            return (
              <div className="flex gap-3">
                <button type="button" onClick={onEdit} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
                  Edit
                </button>
                <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
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
                  className="rounded-xl border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Edit
                </button>
                <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
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
