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
import type { Insight, PriorityLevel } from '@/types';
import { CreateInsightModal } from '@/components/modals/CreateInsightModal';
import { JobReadOnlyModal, type JobWithMeta } from '@/components/JobReadOnlyModal';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LABEL_CLASS, ModalLabel, ModalSectionLabel } from '@/components/ui/ModalLabel';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

type SortColumn = 'title' | 'description' | 'priority' | 'linkedJobs';

function truncateDescription(text: string | undefined, maxLen: number): string {
  if (!text) return '—';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…';
}

interface InsightsTabProps {
  clientId: string;
  /** Optional: when a linked job is clicked, call this (e.g. switch tab). If not provided, job opens in modal on this page. */
  onLinkedJobClick?: (jobId: string) => void;
}

function SortableInsightRow({
  insight,
  getLinkedJobs,
  onRowClick,
  onLinkedJobClick,
}: {
  insight: Insight;
  getLinkedJobs: (id: string) => { id: string; name: string }[];
  onRowClick: () => void;
  onLinkedJobClick?: (jobId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: insight.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const linked = getLinkedJobs(insight.id);

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
      </td>
      <td className="overflow-hidden px-4 py-3">
        <span className="block truncate font-medium text-stone-900 dark:text-stone-100" title={insight.title ?? undefined}>{insight.title ?? '—'}</span>
      </td>
      <td className="overflow-hidden px-4 py-3">
        <span className="block truncate text-stone-600 dark:text-stone-300" title={insight.description}>
          {truncateDescription(insight.description, 80)}
        </span>
      </td>
      <td className="overflow-hidden px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            insight.priority === 'High'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
              : insight.priority === 'Medium'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                : 'bg-stone-100 text-stone-700 dark:bg-stone-600 dark:text-stone-200'
          }`}
        >
          {insight.priority ?? 'Medium'}
        </span>
      </td>
      <td className="overflow-hidden px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {linked.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {linked.map((j) =>
              onLinkedJobClick ? (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => onLinkedJobClick(j.id)}
                  className="rounded-md bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/25 dark:bg-[#361D60]/20 dark:text-accent-light dark:hover:bg-[#361D60]/30"
                >
                  {j.name}
                </button>
              ) : (
                <span key={j.id} className="text-stone-600 dark:text-stone-300">
                  {j.name}
                </span>
              )
            )}
          </div>
        ) : (
          <span className="text-stone-400 dark:text-stone-500">—</span>
        )}
      </td>
    </tr>
  );
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

  type ViewStackEntry = { type: 'insight' | 'job' | 'opportunity'; id: string };
  const [createOpen, setCreateOpen] = useState(false);
  const [editInsight, setEditInsight] = useState<Insight | null>(null);
  const [viewStack, setViewStack] = useState<ViewStackEntry[]>([]);
  const [deleteInsightConfirm, setDeleteInsightConfirm] = useState<{ id: string; name: string } | null>(null);

  const clientOpportunities = useMemo(
    () => opportunities.filter((o) => o.clientId === clientId),
    [opportunities, clientId]
  );
  const currentView = viewStack[viewStack.length - 1] ?? null;
  const viewInsight = currentView?.type === 'insight' ? insights.find((i) => i.id === currentView.id) ?? null : null;
  const viewJobId = currentView?.type === 'job' ? currentView.id : null;
  const viewOpportunity = currentView?.type === 'opportunity' ? clientOpportunities.find((o) => o.id === currentView.id) ?? null : null;

  const getLinkedOpportunities = useCallback(
    (jobId: string) =>
      clientOpportunities.filter((o) => (o.linkedJobIds ?? []).includes(jobId)),
    [clientOpportunities]
  );
  const viewJobWithMeta = useMemo((): JobWithMeta | null => {
    if (!viewJobId) return null;
    const job = jobs.find((j) => j.id === viewJobId);
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
  }, [viewJobId, jobs, phases, journeys, projects]);

  const handleBack = useCallback(() => setViewStack((prev) => prev.slice(0, -1)), []);
  const handleCloseView = useCallback(() => setViewStack([]), []);
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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const ids = sortedInsights.map((i) => i.id);
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const next = [...ids];
      const [removed] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, removed);
      reorderInsights(clientId, next);
    },
    [sortedInsights, clientId, reorderInsights]
  );

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
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-600 dark:bg-stone-800">
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col style={{ width: '2.5rem' }} />
                  <col style={{ width: 'calc((100% - 2.5rem) / 4)' }} />
                  <col style={{ width: 'calc((100% - 2.5rem) / 4)' }} />
                  <col style={{ width: 'calc((100% - 2.5rem) / 4)' }} />
                  <col style={{ width: 'calc((100% - 2.5rem) / 4)' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 dark:border-stone-600 dark:bg-stone-800/80">
                    <th className="w-10 px-2 py-3" aria-label="Reorder" />
                    <Th column="title" label="Title" />
                    <Th column="description" label="Description" />
                    <Th column="priority" label="Priority" />
                    <Th column="linkedJobs" label="Linked Jobs" />
                  </tr>
                </thead>
                <tbody>
                  <SortableContext items={sortedInsights.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    {sortedInsights.map((insight) => (
                      <SortableInsightRow
                        key={insight.id}
                        insight={insight}
                        getLinkedJobs={getLinkedJobs}
                        onRowClick={() => setViewStack([{ type: 'insight', id: insight.id }])}
                        onLinkedJobClick={onLinkedJobClick ?? ((jobId) => setViewStack([{ type: 'job', id: jobId }]))}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
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

      {viewInsight && (
        <Modal
          isOpen
          onClose={handleCloseView}
          title={viewInsight.title ?? 'Insight'}
          onBack={viewStack.length > 1 ? handleBack : undefined}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDeleteInsightConfirm({ id: viewInsight.id, name: viewInsight.title ?? 'this insight' })}
                className="rounded-xl border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
              <div className="flex flex-1 gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditInsight(viewInsight);
                    handleCloseView();
                  }}
                  className="rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleCloseView}
                  className="rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <ModalSectionLabel>Description</ModalSectionLabel>
              <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                {viewInsight.description || '—'}
              </p>
            </div>
            <div>
              <ModalSectionLabel>Priority</ModalSectionLabel>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  viewInsight.priority === 'High'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                    : viewInsight.priority === 'Medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                      : 'bg-stone-100 text-stone-700 dark:bg-stone-600 dark:text-stone-200'
                }`}
              >
                {viewInsight.priority ?? 'Medium'}
              </span>
            </div>
            {getLinkedJobs(viewInsight.id).length > 0 && (
              <div>
                <ModalSectionLabel>Linked jobs</ModalSectionLabel>
                <div className="flex flex-wrap gap-2">
                  {getLinkedJobs(viewInsight.id).map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => setViewStack((prev) => [...prev, { type: 'job', id: j.id }])}
                      className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 dark:border-[#361D60]/40 dark:bg-[#361D60]/15 dark:text-accent-light dark:hover:bg-[#361D60]/25"
                    >
                      {j.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {viewJobWithMeta && (
        <JobReadOnlyModal
          isOpen
          onClose={handleCloseView}
          job={viewJobWithMeta}
          linkedInsights={(viewJobWithMeta.insightIds ?? [])
            .map((id: string) => insights.find((i) => i.id === id))
            .filter(Boolean)
            .map((i) => ({ id: (i as { id: string; title?: string }).id, title: (i as { id: string; title?: string }).title ?? '—' }))}
          linkedOpportunities={getLinkedOpportunities(viewJobWithMeta.id ?? '').map((o) => ({ id: o.id, name: o.name }))}
          onInsightClick={(ins) => setViewStack((prev) => [...prev, { type: 'insight', id: ins.id }])}
          onOpportunityClick={(opp) => setViewStack((prev) => [...prev, { type: 'opportunity', id: opp.id }])}
          onBack={viewStack.length > 1 ? handleBack : undefined}
        />
      )}

      {viewOpportunity && (
        <OpportunityReadOnlyModal
          isOpen
          onClose={handleCloseView}
          opportunity={viewOpportunity}
          clientName={clients.find((c) => c.id === viewOpportunity.clientId)?.name}
          projectName={projects.find((p) => p.id === viewOpportunity.projectId)?.name}
          journeyName={journeys.find((j) => j.id === viewOpportunity.journeyId)?.name}
          phaseTitle={phases.find((p) => p.id === viewOpportunity.phaseId)?.title}
          linkedJobLabels={(viewOpportunity.linkedJobIds ?? []).map((jid) => {
            const j = jobs.find((x) => x.id === jid);
            return j ? { key: j.id, label: j.name ?? '—' } : { key: jid, label: '—' };
          })}
          onLinkedJobClick={(jobId) => setViewStack((prev) => [...prev, { type: 'job', id: jobId }])}
          onBack={viewStack.length > 1 ? handleBack : undefined}
        />
      )}

      {deleteInsightConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteInsightConfirm(null)}
          onConfirm={() => {
            deleteInsight(deleteInsightConfirm.id);
            setViewStack([]);
            setEditInsight(null);
            setDeleteInsightConfirm(null);
          }}
          title="Delete insight"
          message={`Are you sure you want to delete "${deleteInsightConfirm.name}"? It will be unlinked from any jobs that reference it.`}
        />
      )}

      {editInsight && (
        <Modal
          isOpen
          onClose={() => setEditInsight(null)}
          title="Edit insight"
          maxWidth="max-w-2xl"
          footer={
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditInsight(null)}
                className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-insight-form"
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover"
              >
                Save
              </button>
            </div>
          }
        >
          <EditInsightForm
            insight={editInsight}
            onSave={(data) => {
              updateInsight(editInsight.id, data);
              setEditInsight(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function EditInsightForm({
  insight,
  onSave,
}: {
  insight: Insight;
  onSave: (data: { title: string; description?: string; priority: PriorityLevel }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(insight.title ?? '');
  const [description, setDescription] = useState(insight.description ?? '');
  const [priority, setPriority] = useState<PriorityLevel>((insight.priority ?? 'Medium') as PriorityLevel);

  return (
    <form
      id="edit-insight-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title: title.trim() || 'Untitled', description: description.trim() || undefined, priority });
      }}
      className="space-y-4"
    >
      <div>
        <ModalLabel htmlFor="edit-insight-title">Title</ModalLabel>
        <input
          id="edit-insight-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <div>
        <ModalLabel htmlFor="edit-insight-desc">Description</ModalLabel>
        <textarea
          id="edit-insight-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
        />
      </div>
      <div>
        <ModalLabel htmlFor="edit-insight-priority">Priority</ModalLabel>
        <select
          id="edit-insight-priority"
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
  );
}
