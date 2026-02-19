import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store';
import type { Opportunity, OpportunityStage, OpportunityTag } from '@/types';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';

const OPPORTUNITY_STAGES: OpportunityStage[] = ['Backlog', 'In discovery', 'Horizon 1', 'Horizon 2', 'Horizon 3'];
const OPPORTUNITY_TAGS: OpportunityTag[] = ['High', 'Medium', 'Low'];

function priorityStyle(p: string) {
  if (p === 'High') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
  if (p === 'Medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
}

function OpportunityCard({
  opp,
  projectName,
  journeyName,
  phaseTitle,
  isDragging,
  dragHandleProps,
  onCardClick,
}: {
  opp: Opportunity;
  projectName: string;
  journeyName: string;
  phaseTitle: string;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onCardClick?: (opp: Opportunity) => void;
}) {
  return (
    <div
      role={onCardClick ? 'button' : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick ? () => onCardClick(opp) : undefined}
      onKeyDown={onCardClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardClick(opp); } } : undefined}
      className={`
        min-w-0 w-full rounded-lg border border-stone-200 bg-white p-3 text-left text-sm transition-all
        hover:border-accent/30 dark:border-stone-600 dark:bg-stone-800 dark:hover:border-accent/40
        ${onCardClick ? 'cursor-pointer' : ''}
        ${isDragging ? 'opacity-90 shadow-elevated ring-2 ring-accent/50' : 'shadow-soft'}
      `}
    >
      <div className="flex min-w-0 items-start gap-2">
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing dark:hover:bg-stone-700 dark:hover:text-stone-300"
            aria-label="Drag to reorder"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {opp.isPriority && (
              <svg className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            )}
            <span className="font-medium text-stone-900 dark:text-stone-100 truncate">{opp.name}</span>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${priorityStyle(opp.priority)}`}>
              {opp.priority}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-sm text-stone-500 dark:text-stone-400">
            <span>{projectName}</span>
            <span>•</span>
            <span>{journeyName}</span>
            {phaseTitle && (
              <>
                <span>•</span>
                <span>{phaseTitle}</span>
              </>
            )}
          </div>
          {opp.description && (
            <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-300">{opp.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableOpportunityCard({
  opp,
  projectName,
  journeyName,
  phaseTitle,
  disabled,
  onCardClick,
}: {
  opp: Opportunity;
  projectName: string;
  journeyName: string;
  phaseTitle: string;
  disabled?: boolean;
  onCardClick?: (opp: Opportunity) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opp.id,
    data: { opportunity: opp },
    disabled,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}>
      <OpportunityCard
        opp={opp}
        projectName={projectName}
        journeyName={journeyName}
        phaseTitle={phaseTitle}
        isDragging={isDragging}
        dragHandleProps={disabled ? undefined : { ...attributes, ...listeners }}
        onCardClick={onCardClick}
      />
    </div>
  );
}

function KanbanColumn({
  stage,
  opportunities,
  projects,
  journeys,
  phases,
  canEdit,
  onOpportunityClick,
}: {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  projects: { id: string; name: string }[];
  journeys: { id: string; name: string; projectId: string }[];
  phases: { id: string; title: string; journeyId: string }[];
  canEdit: boolean;
  onOpportunityClick?: (opp: Opportunity) => void;
}) {
  void canEdit;
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';
  const getJourneyName = (id: string) => journeys.find((j) => j.id === id)?.name ?? '—';
  const getPhaseTitle = (id: string) => phases.find((p) => p.id === id)?.title ?? '';

  const itemIds = opportunities.map((o) => o.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[280px] min-w-0 flex-1 basis-0 flex-col border-b border-r border-stone-200 bg-white last:border-r-0 dark:border-stone-600 dark:bg-stone-800 transition-colors ${
        isOver ? 'bg-accent/5 dark:bg-accent/10' : ''
      }`}
      style={{ minWidth: '330px' }}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {opportunities.map((opp) => (
            <SortableOpportunityCard
              key={opp.id}
              opp={opp}
              projectName={getProjectName(opp.projectId)}
              journeyName={getJourneyName(opp.journeyId)}
              phaseTitle={getPhaseTitle(opp.phaseId)}
              disabled={!canEdit}
              onCardClick={onOpportunityClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function OpportunitiesDashboard() {
  const opportunitiesClientId = useStore((s) => s.opportunitiesClientId);
  const setOpportunitiesClientId = useStore((s) => s.setOpportunitiesClientId);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const opportunities = useStore((s) => s.opportunities);
  const moveOpportunityToStage = useStore((s) => s.moveOpportunityToStage);
  const reorderOpportunitiesInStage = useStore((s) => s.reorderOpportunitiesInStage);
  const updateOpportunity = useStore((s) => s.updateOpportunity);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewOpportunity, setViewOpportunity] = useState<Opportunity | null>(null);
  const [editOpportunity, setEditOpportunity] = useState<Opportunity | null>(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterJourney, setFilterJourney] = useState<string>('');
  const [filterPhase, setFilterPhase] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterShowPriorityOnly, setFilterShowPriorityOnly] = useState(false);
  const [filterStage, setFilterStage] = useState<string>('');

  const client = clients.find((c) => c.id === opportunitiesClientId);
  const canEdit = true;

  const filteredOpportunities = useMemo(() => {
    let list = opportunities.filter((o) => o.clientId === opportunitiesClientId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)
      );
    }
    if (filterShowPriorityOnly) list = list.filter((o) => o.isPriority);
    if (filterProject) list = list.filter((o) => o.projectId === filterProject);
    if (filterJourney) list = list.filter((o) => o.journeyId === filterJourney);
    if (filterPhase) list = list.filter((o) => o.phaseId === filterPhase);
    if (filterPriority) list = list.filter((o) => o.priority === filterPriority);
    if (filterStage) list = list.filter((o) => o.stage === filterStage);
    return list;
  }, [
    opportunities,
    opportunitiesClientId,
    search,
    filterShowPriorityOnly,
    filterProject,
    filterJourney,
    filterPhase,
    filterPriority,
    filterStage,
  ]);

  const opportunitiesByStage = useMemo(() => {
    const map: Record<OpportunityStage, Opportunity[]> = {
      Backlog: [],
      'In discovery': [],
      'Horizon 1': [],
      'Horizon 2': [],
      'Horizon 3': [],
    };
    OPPORTUNITY_STAGES.forEach((s) => {
      map[s] = filteredOpportunities
        .filter((o) => o.stage === s)
        .sort((a, b) => a.stageOrder - b.stageOrder);
    });
    return map;
  }, [filteredOpportunities]);

  const clientProjects = projects.filter((p) => p.clientId === opportunitiesClientId);
  const clientJourneys = journeys.filter((j) => clientProjects.some((p) => p.id === j.projectId));
  const clientPhases = phases.filter((p) => clientJourneys.some((j) => j.id === p.journeyId));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const oppId = String(active.id);
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp || opp.clientId !== opportunitiesClientId) return;

    const overId = String(over.id);
    const isStage = OPPORTUNITY_STAGES.includes(overId as OpportunityStage);

    let targetStage: OpportunityStage;
    let targetIndex: number;

    if (isStage) {
      targetStage = overId as OpportunityStage;
      targetIndex = 0;
    } else {
      const overOpp = opportunities.find((o) => o.id === overId);
      if (!overOpp) return;
      targetStage = overOpp.stage;
      const inTarget = filteredOpportunities
        .filter((o) => o.stage === targetStage)
        .sort((a, b) => a.stageOrder - b.stageOrder);
      targetIndex = inTarget.findIndex((o) => o.id === overId);
      if (targetIndex < 0) targetIndex = 0;
    }

    if (opp.stage === targetStage) {
      const inStage = opportunitiesByStage[targetStage];
      const currentIndex = inStage.findIndex((o) => o.id === oppId);
      if (currentIndex === targetIndex) return;
      const reordered = [...inStage];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, removed);
      reorderOpportunitiesInStage(opp.clientId, targetStage, reordered.map((o) => o.id));
    } else {
      moveOpportunityToStage(oppId, targetStage, targetIndex);
    }
  };

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null;
  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name ?? '—';
  const getJourneyName = (id: string) => journeys.find((j) => j.id === id)?.name ?? '—';
  const getPhaseTitle = (id: string) => phases.find((p) => p.id === id)?.title ?? '';

  if (!opportunitiesClientId || !client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-stone-600/80 dark:bg-stone-900/80">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpportunitiesClientId(null)}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Opportunities – {client.name}
          </h2>
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap items-end gap-3 border-b border-stone-200/80 bg-stone-50/50 px-6 py-3 dark:border-stone-600/80 dark:bg-stone-800/30">
        <input
          type="search"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
        />
        <div>
          <label htmlFor="filter-project" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Meta-Journey</label>
          <select
            id="filter-project"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-journey" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Journey</label>
          <select
            id="filter-journey"
            value={filterJourney}
            onChange={(e) => setFilterJourney(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select</option>
            {clientJourneys.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-phase" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Phase</label>
          <select
            id="filter-phase"
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select</option>
            {clientPhases.map((p) => (
              <option key={p.id} value={p.id}>{p.title || 'Untitled'}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-stage" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Stage</label>
          <select
            id="filter-stage"
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select</option>
            {OPPORTUNITY_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-priority" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Priority</label>
          <select
            id="filter-priority"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select</option>
            {OPPORTUNITY_TAGS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={filterShowPriorityOnly}
            onChange={(e) => setFilterShowPriorityOnly(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/20 dark:border-stone-500"
          />
          <span className="text-sm text-stone-600 dark:text-stone-300">Priority only</span>
        </label>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-stone-200 bg-warm-50/50 dark:border-stone-600 dark:bg-stone-900/50">
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* Table-like header row - distinct headers like journey table */}
            <div className="flex border-b border-stone-200 bg-stone-50 dark:border-stone-500 dark:bg-stone-700">
              {OPPORTUNITY_STAGES.map((stage) => (
                <div
                  key={stage}
                  className="flex min-w-0 flex-1 basis-0 items-center border-r border-stone-200 px-4 py-3 last:border-r-0 dark:border-stone-500"
                style={{ minWidth: '330px' }}
                >
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                    {stage}
                  </span>
                </div>
              ))}
            </div>
            {/* Kanban columns - droppable cells */}
            <div className="flex bg-white dark:bg-stone-800">
              {OPPORTUNITY_STAGES.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  opportunities={opportunitiesByStage[stage]}
                  projects={clientProjects}
                  journeys={clientJourneys}
                  phases={clientPhases}
                  canEdit={canEdit}
                  onOpportunityClick={(opp) => setViewOpportunity(opp)}
                />
              ))}
            </div>

            <DragOverlay>
              {activeOpp ? (
                <div className="w-[390px] min-w-0">
                  <OpportunityCard
                    opp={activeOpp}
                    projectName={getProjectName(activeOpp.projectId)}
                    journeyName={getJourneyName(activeOpp.journeyId)}
                    phaseTitle={getPhaseTitle(activeOpp.phaseId)}
                    isDragging
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {viewOpportunity && (
        <OpportunityReadOnlyModal
          isOpen={!!viewOpportunity}
          onClose={() => setViewOpportunity(null)}
          opportunity={viewOpportunity}
          clientName={clients.find((c) => c.id === viewOpportunity.clientId)?.name}
          projectName={projects.find((p) => p.id === viewOpportunity.projectId)?.name}
          journeyName={journeys.find((j) => j.id === viewOpportunity.journeyId)?.name}
          phaseTitle={phases.find((p) => p.id === viewOpportunity.phaseId)?.title}
          linkedJobLabels={(() => {
            return (viewOpportunity.linkedJobIds ?? [])
              .map((jid) => {
                const j = jobs.find((j) => j.id === jid);
                return j ? { key: j.id, label: j.name ?? '—' } : { key: jid, label: '—' };
              });
          })()}
          onEdit={() => {
            setEditOpportunity(viewOpportunity);
            setViewOpportunity(null);
          }}
        />
      )}
      {editOpportunity && (
        <OpportunityModal
          isOpen={!!editOpportunity}
          onClose={() => setEditOpportunity(null)}
          opportunity={editOpportunity}
          jobsInJourney={jobs
            .filter((j) => j.clientId === editOpportunity.clientId)
            .map((j) => ({ key: j.id, label: j.name ?? '—' }))}
          onSave={(updated) => {
            if (updated.stage != null && updated.stage !== editOpportunity.stage) {
              moveOpportunityToStage(updated.id, updated.stage, 0);
            }
            updateOpportunity(updated.id, {
              name: updated.name,
              description: updated.description,
              priority: updated.priority,
              stage: updated.stage,
              isPriority: updated.isPriority,
              pointOfDifferentiation: updated.pointOfDifferentiation,
              criticalAssumptions: updated.criticalAssumptions,
              linkedJobIds: updated.linkedJobIds,
            });
            setEditOpportunity(null);
          }}
        />
      )}
    </div>
  );
}
