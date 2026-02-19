import React, { useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '@/store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CommentsPanel } from '@/components/CommentsPanel';
import { commentKey } from '@/lib/commentKeys';
import { parseStruggles, parseOpportunities, serializeOpportunities, parseRelatedDocuments, getPhaseHealthScore } from '@/lib/utils';
import type { Phase, Journey } from '@/types';
import type { JobOption } from '@/components/OpportunityModal';
import { JobModal } from '@/components/JobModal';
import { OpportunityModal } from '@/components/OpportunityModal';

const BUILDIN_ROWS: { key: string; label: string; asList?: boolean; asDescription?: boolean; asJobs?: boolean; asStruggles?: boolean; asInternalStruggles?: boolean; asOpportunities?: boolean; asDocuments?: boolean; asPhaseHealth?: boolean }[] = [
  { key: 'description', label: 'Description', asList: true, asDescription: true },
  { key: 'phaseHealth', label: 'Phase health', asPhaseHealth: true },
  { key: 'customerJobs', label: 'Customer jobs & goals', asJobs: true },
  { key: 'frontStageActions', label: 'Front stage actions', asList: true },
  { key: 'channels', label: 'Channels', asList: true },
  { key: 'struggles', label: 'Struggles', asStruggles: true },
  { key: 'internalStruggles', label: 'Internal struggles', asInternalStruggles: true },
  { key: 'backStageActions', label: 'Back stage actions', asList: true },
  { key: 'systems', label: 'Systems', asList: true },
  { key: 'relatedProcesses', label: 'Related processes', asList: true },
  { key: 'opportunities', label: 'Opportunities', asOpportunities: true },
  { key: 'relatedDocuments', label: 'Related documents', asDocuments: true },
];

type RowDef =
  | { id: string; key: string; label: string; isCustom: false; asList?: boolean; asDescription?: boolean; asJobs?: boolean; asStruggles?: boolean; asInternalStruggles?: boolean; asOpportunities?: boolean; asDocuments?: boolean; asPhaseHealth?: boolean; thickTopBorder?: boolean }
  | { id: string; key: string; label: string; isCustom: true; thickTopBorder?: boolean };

function getOrderedRows(journey: Journey | null): RowDef[] {
  if (!journey) return BUILDIN_ROWS.map((r) => ({ ...r, id: r.key, isCustom: false as const, thickTopBorder: r.key === 'internalStruggles' }));
  const defaultOrder = BUILDIN_ROWS.map((r) => r.key);
  const rawOrder = journey.rowOrder;
  const baseOrder = Array.isArray(rawOrder) ? rawOrder : defaultOrder;
  const validBaseOrder = baseOrder.filter(
    (id) => BUILDIN_ROWS.some((r) => r.key === id) || (journey.customRows ?? []).some((r) => r.id === id)
  );
  const missingBuiltin = BUILDIN_ROWS.filter((r) => !validBaseOrder.includes(r.key)).map((r) => r.key);
  const order = [...validBaseOrder, ...missingBuiltin];
  const customMap = new Map((journey.customRows ?? []).map((r) => [r.id, r.label]));
  return order.map((id) => {
    const builtin = BUILDIN_ROWS.find((r) => r.key === id);
    if (builtin) return { ...builtin, id: builtin.key, isCustom: false as const, thickTopBorder: builtin.key === 'internalStruggles' };
    return { id, key: id, label: customMap.get(id) ?? 'Row', isCustom: true as const };
  });
}

function parseList(value: string): string[] {
  if (!value || !value.trim()) return [];
  return value
    .split(/\n|;|•/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SortablePhaseHeader({
  phase,
  onDelete,
  isSelected,
  onTitleClick,
}: {
  phase: Phase;
  onDelete: () => void;
  isSelected: boolean;
  onTitleClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasImage = phase.imageUrl?.trim();

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`
        relative min-w-[240px] max-w-[300px] border-b border-r border-stone-200 px-0 align-top
        dark:border-stone-500
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-stone-50 dark:bg-stone-700'}
        ${isDragging ? 'opacity-90 shadow-elevated dark:shadow-elevated-dark' : ''}
      `}
    >
      <div className="flex flex-col">
        {hasImage && (
          <div className="mb-3 px-2 pt-3">
            <img
              src={phase.imageUrl}
              alt=""
              className="max-h-20 w-full rounded-lg object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded p-1 text-stone-400 hover:bg-warm-100 hover:text-stone-600 active:cursor-grabbing dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-300"
            aria-label="Drag to reorder"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTitleClick();
            }}
            className="flex-1 cursor-pointer border-0 bg-transparent p-0 text-left font-semibold text-stone-900 hover:text-accent hover:underline dark:text-stone-100 dark:hover:text-accent"
            title="Click to edit phase"
          >
            {phase.title || 'Untitled phase'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-xl p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label="Delete phase"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </th>
  );
}

function SortableTableRow({
  row,
  children,
  thickTopBorder,
}: {
  row: RowDef;
  children: React.ReactNode;
  thickTopBorder?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const childArray = React.Children.toArray(children);
  const firstTd = childArray[0];
  const rest = childArray.slice(1);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-90 shadow-elevated bg-white dark:bg-stone-800 dark:shadow-elevated-dark' : ''} ${thickTopBorder ? 'border-t-2 border-t-stone-400 dark:border-t-stone-500' : ''}`}
    >
      {React.isValidElement(firstTd) && firstTd.type === 'td' ? (
        <td {...firstTd.props}>
          <div className="flex items-center gap-1">
            <span
              {...attributes}
              {...listeners}
              className="flex flex-shrink-0 cursor-grab touch-none rounded p-1 text-stone-400 hover:bg-warm-100 hover:text-stone-600 active:cursor-grabbing dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-300"
              aria-label="Drag to reorder row"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </span>
            {(firstTd.props as { children?: React.ReactNode }).children}
          </div>
        </td>
      ) : (
        firstTd
      )}
      {rest}
    </tr>
  );
}

function TableCell({
  value,
  hasComment,
  isOverlayVisible,
  onCellClick,
  onAddComment,
  onCopy,
  onCloseOverlay,
  asList = false,
  asDescription = false,
  asJobs = false,
  asStruggles = false,
  asInternalStruggles = false,
  asOpportunities = false,
  asDocuments = false,
  asPhaseHealth = false,
  onOpportunityClick,
  phaseJobs,
  onJobClick,
}: {
  value: string;
  hasComment: boolean;
  isOverlayVisible: boolean;
  onCellClick: () => void;
  onAddComment: (e: React.MouseEvent) => void;
  onCopy: (e: React.MouseEvent) => void;
  onCloseOverlay: (e: React.MouseEvent) => void;
  asList?: boolean;
  asDescription?: boolean;
  asJobs?: boolean;
  asStruggles?: boolean;
  asInternalStruggles?: boolean;
  asOpportunities?: boolean;
  asDocuments?: boolean;
  asPhaseHealth?: boolean;
  onOpportunityClick?: (opportunityId: string) => void;
  phaseJobs?: { id: string; name: string; tag?: string }[];
  onJobClick?: (jobId: string) => void;
}) {
  const cellRef = useRef<HTMLTableCellElement>(null);

  const isEmpty = !value || !value.trim();
  const listItems = asList ? parseList(value) : [];
  const jobItems = asJobs && phaseJobs ? phaseJobs : [];
  const struggleItems = (asStruggles || asInternalStruggles) ? parseStruggles(value) : [];
  const opportunityItems = asOpportunities ? parseOpportunities(value) : [];
  const documentItems = asDocuments ? parseRelatedDocuments(value) : [];

  const jobTagStyle = (tag: string) => {
    if (tag === 'Functional') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
    if (tag === 'Social') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
    if (tag === 'Emotional') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
    return 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200';
  };

  const struggleTagStyle = (tag: string) => {
    if (tag === 'High') return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200';
    if (tag === 'Medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
    if (tag === 'Low') return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
    return 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200';
  };

  const opportunityTagStyle = (tag: string) => {
    if (tag === 'High') return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200';
    if (tag === 'Medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
    if (tag === 'Low') return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
    return 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-200';
  };

  const showOverlay = isOverlayVisible && !asOpportunities && !asDocuments && !asPhaseHealth;

  return (
    <td
      ref={cellRef}
      onClick={asOpportunities || asDocuments || asPhaseHealth ? undefined : onCellClick}
      className={`
        group relative min-w-[240px] max-w-[300px] min-h-[4.5rem] select-text border-b border-r border-stone-200 px-4 py-6 align-top
        transition-colors hover:bg-warm-50/50 dark:border-stone-600 dark:hover:bg-stone-800/50
        ${showOverlay ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-white dark:bg-stone-800'}
        ${hasComment && !asOpportunities && !asDocuments && !asPhaseHealth ? 'border-r-2 border-r-green-400' : ''}
      `}
    >
      {showOverlay && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded bg-stone-800/95 p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onAddComment}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-sm hover:bg-white hover:shadow"
              title="Add comment"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCopy}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-800 shadow-sm hover:bg-white hover:shadow"
              title="Copy"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCloseOverlay}
              className="absolute right-1 top-1 rounded p-1.5 text-stone-400 hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {asJobs ? (
        jobItems.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-100">
            {jobItems.map((job: { id: string; name?: string; tag?: string }) => (
              <li key={job.id} className="flex flex-wrap items-center gap-1.5">
                {onJobClick ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onJobClick(job.id);
                    }}
                    className="line-clamp-1 flex-1 text-left font-medium text-accent hover:underline"
                  >
                    {job.name ?? '—'}
                  </button>
                ) : (
                  <span className="line-clamp-1 flex-1">{job.name ?? '—'}</span>
                )}
                <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${jobTagStyle(job.tag ?? '')}`}>
                  {job.tag}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-stone-400 dark:text-stone-400">—</span>
        )
      ) : (asStruggles || asInternalStruggles) ? (
        struggleItems.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-100">
            {struggleItems.map((item, i) => (
              <li key={i} className="flex flex-wrap items-center gap-1.5">
                <span className="line-clamp-1 flex-1">{item.text || '—'}</span>
                <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${struggleTagStyle(item.tag)}`}>
                  {item.tag}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-stone-400 dark:text-stone-400">—</span>
        )
      ) : asPhaseHealth ? (
        (() => {
          const pct = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
          const isGood = pct >= 60;
          const isMid = pct >= 40 && pct < 60;
          return (
            <div className="rounded-xl border border-stone-200 bg-stone-100/80 px-4 py-3 dark:border-stone-600 dark:bg-stone-700/80">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-stone-500 dark:text-stone-200">Health</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                  {pct}%
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-600">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, rgb(239 68 68), rgb(234 179 8), rgb(34 197 94))',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-sm border border-stone-700 bg-stone-900 shadow-md dark:border-stone-300 dark:bg-white"
                  style={{ left: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-300">
                <span>Bad</span>
                <span>Good</span>
              </div>
            </div>
          );
        })()
      ) : asDocuments ? (
        documentItems.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {documentItems.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 truncate font-medium text-accent hover:underline dark:text-accent"
                >
                  <svg className="h-4 w-4 flex-shrink-0 text-current opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="truncate">{doc.label}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-stone-400 dark:text-stone-400">—</span>
        )
      ) : asOpportunities ? (
        opportunityItems.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-100">
            {opportunityItems.map((opp) => (
              <li key={opp.id} className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpportunityClick?.(opp.id);
                  }}
                  className="line-clamp-1 flex-1 text-left font-medium text-accent hover:underline"
                >
                  {opp.name || '—'}
                </button>
                <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${opportunityTagStyle(opp.tag)}`}>
                  {opp.tag}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-sm text-stone-400 dark:text-stone-400">—</span>
        )
      ) : isEmpty ? (
        <span className="text-sm text-stone-400 dark:text-stone-400">—</span>
      ) : asDescription && listItems.length > 0 ? (
        <p className="text-sm font-semibold text-stone-800 line-clamp-6 dark:text-stone-100">{listItems.join(' ')}</p>
      ) : asList && listItems.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-stone-700 dark:text-stone-100">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-stone-400 dark:bg-stone-500" />
              <span className="line-clamp-2">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-700 line-clamp-6 dark:text-stone-100">{value}</p>
      )}
    </td>
  );
}

export function JourneyMapView() {
  const phases = useStore((s) => {
    const jid = s.selectedJourneyId;
    if (!jid) return [];
    return s.phases
      .filter((p) => p.journeyId === jid)
      .sort((a, b) => a.order - b.order);
  });
  const selectedPhaseId = useStore((s) => s.selectedPhaseId);
  const setSelectedPhaseId = useStore((s) => s.setSelectedPhaseId);
  const deletePhase = useStore((s) => s.deletePhase);
  const reorderPhases = useStore((s) => s.reorderPhases);
  const selectedJourneyId = useStore((s) => s.selectedJourneyId);
  const journeys = useStore((s) => s.journeys);

  const [deleteConfirm, setDeleteConfirm] = useState<{ phaseId: string } | null>(null);
  const [rowToDelete, setRowToDelete] = useState<{ journeyId: string; rowId: string } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ phaseId: string; rowKey: string } | null>(null);
  const [activeCommentCell, setActiveCommentCell] = useState<{ phaseId: string; rowKey: string } | null>(null);
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const [scrollToCommentKey, setScrollToCommentKey] = useState<string | null>(null);
  const commentsPanelRef = useRef<{ scrollToComment: (key: string) => void }>(null);
  const [addRowInput, setAddRowInput] = useState(false);
  const [newRowName, setNewRowName] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowLabel, setEditingRowLabel] = useState('');
  const [opportunityModal, setOpportunityModal] = useState<{ phaseId: string; opportunityId: string } | null>(null);
  const [jobModal, setJobModal] = useState<{ jobId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const journey = journeys.find((j) => j.id === selectedJourneyId) ?? null;
  const orderedRows = getOrderedRows(journey);

  const addJourneyRow = useStore((s) => s.addJourneyRow);
  const updateJourneyRow = useStore((s) => s.updateJourneyRow);
  const deleteJourneyRow = useStore((s) => s.deleteJourneyRow);
  const reorderJourneyRows = useStore((s) => s.reorderJourneyRows);
  const opportunities = useStore((s) => s.opportunities);
  const jobsStore = useStore((s) => s.jobs);
  const phasesStore = useStore((s) => s.phases);
  const insights = useStore((s) => s.insights);
  const updateOpportunity = useStore((s) => s.updateOpportunity);
  const updateJob = useStore((s) => s.updateJob);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const phaseIds = phases.map((p) => p.id);
    const rowIds = orderedRows.map((r) => r.id);
    if (phaseIds.includes(active.id as string)) {
      if (!selectedJourneyId) return;
      const oldIndex = phaseIds.indexOf(active.id as string);
      const newIndex = phaseIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      reorderPhases(selectedJourneyId, arrayMove(phaseIds, oldIndex, newIndex));
      return;
    }
    if (rowIds.includes(active.id as string) && rowIds.includes(over.id as string) && selectedJourneyId && journey) {
      const oldIndex = rowIds.indexOf(active.id as string);
      const newIndex = rowIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const defaultOrder = BUILDIN_ROWS.map((r) => r.key);
      const rawOrder = journey.rowOrder;
      const baseOrder = Array.isArray(rawOrder) ? rawOrder : defaultOrder;
      const validBaseOrder = baseOrder.filter(
        (id) => BUILDIN_ROWS.some((r) => r.key === id) || (journey.customRows ?? []).some((r) => r.id === id)
      );
      const missingBuiltin = BUILDIN_ROWS.filter((r) => !validBaseOrder.includes(r.key)).map((r) => r.key);
      const order = [...validBaseOrder, ...missingBuiltin];
      const newOrder = arrayMove(order, oldIndex, newIndex);
      const validNewOrder = newOrder.filter(
        (id) => BUILDIN_ROWS.some((r) => r.key === id) || (journey.customRows ?? []).some((r) => r.id === id)
      );
      reorderJourneyRows(selectedJourneyId, validNewOrder);
    }
  };

  const handleDeleteClick = (phaseId: string) => {
    setDeleteConfirm({ phaseId });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      deletePhase(deleteConfirm.phaseId);
      setDeleteConfirm(null);
    }
  };

  const handleConfirmDeleteRow = () => {
    if (rowToDelete) {
      deleteJourneyRow(rowToDelete.journeyId, rowToDelete.rowId);
      setRowToDelete(null);
    }
  };

  const handlePhaseTitleClick = (phaseId: string) => {
    setJobModal(null); // Ensure job modal is closed when opening phase
    setSelectedPhaseId(phaseId);
    setCommentsPanelOpen(false);
  };

  const handleCellClick = (phaseId: string, rowKey: string) => {
    if (rowKey === 'opportunities') return;
    setSelectedCell((prev) =>
      prev?.phaseId === phaseId && prev?.rowKey === rowKey ? null : { phaseId, rowKey }
    );
  };

  const handleAddCommentFromOverlay = (phaseId: string, rowKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCommentCell({ phaseId, rowKey });
    setCommentsPanelOpen(true);
    setSelectedPhaseId(null);
    setSelectedCell(null);
  };

  const handleCopyFromOverlay = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value || '').catch(() => {});
    setSelectedCell(null);
  };

  const handleCloseOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCell(null);
  };

  const handleAddRow = () => {
    const name = newRowName.trim();
    if (selectedJourneyId && name) {
      addJourneyRow(selectedJourneyId, name);
      setNewRowName('');
      setAddRowInput(false);
    }
  };

  const handleSaveRowLabel = (rowId: string) => {
    if (selectedJourneyId && editingRowLabel.trim()) {
      updateJourneyRow(selectedJourneyId, rowId, editingRowLabel.trim());
    }
    setEditingRowId(null);
    setEditingRowLabel('');
  };

  const cellComments = useStore((s) => s.cellComments);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Journey map table - min-h-0 needed for flex child to scroll; overflow on single container for sticky */}
        <div className="flex min-h-0 flex-1 flex-col p-8" style={{ direction: 'ltr' }}>
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-stone-200 bg-warm-50/50 dark:border-stone-600 dark:bg-stone-900/50">
            <table className="min-w-max border-collapse bg-white dark:bg-stone-800" style={{ width: 'max-content' }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
              <thead>
                <tr>
                  <th className="sticky left-0 z-30 w-[200px] min-w-[200px] min-h-[4.5rem] border-b border-r border-stone-200 bg-stone-50 px-5 py-6 text-left text-sm font-medium text-stone-700 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.15),4px_0_20px_0_rgba(0,0,0,0.03)] dark:border-stone-500 dark:bg-stone-700 dark:text-stone-300 dark:shadow-[8px_0_12px_-4px_rgba(0,0,0,0.5),4px_0_24px_0_rgba(139,92,246,0.12)]">
                    Phase
                  </th>
                  <SortableContext
                    items={phases.map((p) => p.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {phases.map((phase) => (
                      <SortablePhaseHeader
                        key={phase.id}
                        phase={phase}
                        onDelete={() => handleDeleteClick(phase.id)}
                        isSelected={selectedPhaseId === phase.id}
                        onTitleClick={() => handlePhaseTitleClick(phase.id)}
                      />
                    ))}
                  </SortableContext>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={orderedRows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                {orderedRows.map((row) => (
                  <SortableTableRow key={row.id} row={row} thickTopBorder={row.thickTopBorder}>
                    <td
                      className={`sticky left-0 z-30 min-h-[4.5rem] border-b border-r border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.15),4px_0_20px_0_rgba(0,0,0,0.03)] dark:border-stone-500 dark:bg-stone-700 dark:text-stone-300 dark:shadow-[8px_0_12px_-4px_rgba(0,0,0,0.5),4px_0_24px_0_rgba(139,92,246,0.12)] ${row.thickTopBorder ? 'border-t-2 border-t-stone-400 dark:border-t-stone-500' : ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {row.isCustom && editingRowId === row.id ? (
                          <input
                            value={editingRowLabel}
                            onChange={(e) => setEditingRowLabel(e.target.value)}
                            onBlur={() => handleSaveRowLabel(row.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRowLabel(row.id);
                              if (e.key === 'Escape') {
                                setEditingRowId(null);
                                setEditingRowLabel('');
                              }
                            }}
                            autoFocus
                            className="min-w-0 flex-1 rounded border border-stone-300 px-2 py-1 text-stone-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              if (row.isCustom) {
                                setEditingRowId(row.id);
                                setEditingRowLabel(row.label);
                              }
                            }}
                            className={`flex flex-1 items-center gap-1.5 py-2 ${row.isCustom ? 'cursor-text' : ''}`}
                          >
                            {row.label}
                            {row.key === 'phaseHealth' && (
                              <span
                                className="group/health relative flex cursor-help"
                                title="Phase health is calculated from: customer struggles (reduce score), internal struggles (reduce), opportunities (boost), and job mix (Social/Emotional jobs add health as differentiation potential)."
                              >
                                <svg className="h-4 w-4 text-stone-400 hover:text-stone-600 dark:text-stone-400 dark:hover:text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 w-64 -translate-x-1/2 rounded-lg bg-stone-800 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/health:opacity-100 dark:bg-stone-700">
                                  Base 50. Struggles reduce (High/Med/Low). Opportunities boost. Social &amp; Emotional jobs add up to +25.
                                </span>
                              </span>
                            )}
                          </span>
                        )}
                        {row.isCustom && journey && selectedJourneyId && (
                          <button
                            type="button"
                            onClick={() => setRowToDelete({ journeyId: selectedJourneyId, rowId: row.id })}
                            className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label="Delete row"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    {phases.map((phase) => {
                      const phaseOpportunities = opportunities.filter((o) => o.phaseId === phase.id);
                      const phaseJobIds = phase.jobIds ?? [];
                      const phaseJobsForCell = phaseJobIds
                        .map((jid) => jobsStore.find((j) => j.id === jid))
                        .filter(Boolean) as { id: string; name: string; tag: string }[];
                      const str = row.isCustom
                        ? (phase.customRowValues?.[row.id] ?? '')
                        : row.key === 'phaseHealth'
                          ? String(getPhaseHealthScore(phase, phaseOpportunities, phaseJobsForCell))
                          : row.key === 'opportunities'
                            ? serializeOpportunities(phaseOpportunities.map((o) => ({ id: o.id, name: o.name, tag: o.priority, description: o.description, pointOfDifferentiation: o.pointOfDifferentiation, criticalAssumptions: o.criticalAssumptions, isPriority: o.isPriority })))
                            : row.key === 'customerJobs'
                              ? phaseJobsForCell.map((j) => j.name).join('\n')
                              : (() => {
                                  const raw = phase[row.key as keyof Phase];
                                  return typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
                                })();
                      const keyStr = commentKey(phase.id, row.id);
                      const hasComment = !!(cellComments[keyStr]?.text?.trim());
                      const isOverlayVisible =
                        selectedCell?.phaseId === phase.id && selectedCell?.rowKey === row.id;
                      const asListRow = !row.isCustom && 'asList' in row && row.asList && !('asDescription' in row && row.asDescription);
                      const asJobsRow = !row.isCustom && 'asJobs' in row && row.asJobs;
                      const asStrugglesRow = !row.isCustom && 'asStruggles' in row && row.asStruggles;
                      const asInternalStrugglesRow = !row.isCustom && 'asInternalStruggles' in row && row.asInternalStruggles;
                      const asOpportunitiesRow = !row.isCustom && 'asOpportunities' in row && row.asOpportunities;
                      const asDocumentsRow = !row.isCustom && 'asDocuments' in row && row.asDocuments;
                      const asPhaseHealthRow = !row.isCustom && 'asPhaseHealth' in row && row.asPhaseHealth;
                      return (
                        <TableCell
                          key={phase.id}
                          value={str}
                          hasComment={asOpportunitiesRow || asDocumentsRow || asPhaseHealthRow ? false : hasComment}
                          isOverlayVisible={isOverlayVisible}
                          onCellClick={() => handleCellClick(phase.id, row.id)}
                          onAddComment={(e) => handleAddCommentFromOverlay(phase.id, row.id, e)}
                          onCopy={(e) => handleCopyFromOverlay(str, e)}
                          onCloseOverlay={handleCloseOverlay}
                          asList={asListRow}
                          asDescription={!row.isCustom && 'asDescription' in row && row.asDescription}
                          asJobs={asJobsRow}
                          asStruggles={asStrugglesRow}
                          asInternalStruggles={asInternalStrugglesRow}
                          asOpportunities={asOpportunitiesRow}
                          asDocuments={asDocumentsRow}
                          asPhaseHealth={asPhaseHealthRow}
                          onOpportunityClick={asOpportunitiesRow ? (oppId) => setOpportunityModal({ phaseId: phase.id, opportunityId: oppId }) : undefined}
                          phaseJobs={asJobsRow ? phaseJobsForCell : undefined}
                          onJobClick={asJobsRow ? (jobId) => setJobModal({ jobId }) : undefined}
                        />
                      );
                    })}
                  </SortableTableRow>
                ))}
                </SortableContext>
                {journey && (
                  <tr>
                    <td className="sticky left-0 z-30 border-b border-r border-stone-200 bg-stone-50 px-3 py-2 shadow-[8px_0_12px_-4px_rgba(0,0,0,0.15),4px_0_20px_0_rgba(0,0,0,0.03)] dark:border-stone-500 dark:bg-stone-700 dark:shadow-[8px_0_12px_-4px_rgba(0,0,0,0.5),4px_0_24px_0_rgba(139,92,246,0.12)]">
                      {addRowInput ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={newRowName}
                            onChange={(e) => setNewRowName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddRow();
                              if (e.key === 'Escape') {
                                setAddRowInput(false);
                                setNewRowName('');
                              }
                            }}
                            placeholder="Row name"
                            autoFocus
                            className="flex-1 rounded border border-stone-300 px-2 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                          />
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="rounded bg-accent px-2 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddRowInput(false);
                              setNewRowName('');
                            }}
                            className="rounded px-2 py-1.5 text-sm text-stone-600 hover:bg-warm-100 dark:text-stone-300 dark:hover:bg-stone-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddRowInput(true)}
                          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-stone-300 px-3 py-2 text-sm text-stone-500 hover:border-accent hover:bg-accent-muted/30 hover:text-accent dark:border-stone-600 dark:text-stone-300 dark:hover:border-accent/50 dark:hover:bg-accent/10"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add row
                        </button>
                      )}
                    </td>
                    {phases.map((phase) => (
                      <td
                        key={phase.id}
                        className="min-w-[240px] max-w-[300px] border-b border-r border-stone-200 bg-warm-50/50 dark:border-stone-600 dark:bg-stone-800/50"
                      />
                    ))}
                  </tr>
                )}
              </tbody>
              </DndContext>
            </table>
          </div>
        </div>
      </div>

      <CommentsPanel
        ref={commentsPanelRef}
        isOpen={commentsPanelOpen}
        onClose={() => setCommentsPanelOpen(false)}
        activeCell={activeCommentCell}
        onSetActiveCell={setActiveCommentCell}
        scrollToCommentKey={scrollToCommentKey}
        onScrollDone={() => setScrollToCommentKey(null)}
      />

      {deleteConfirm && (
        <ConfirmDialog
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleConfirmDelete}
          title="Delete phase"
          message="Are you sure you want to delete this phase? This cannot be undone."
        />
      )}

      {rowToDelete && (
        <ConfirmDialog
          isOpen={!!rowToDelete}
          onClose={() => setRowToDelete(null)}
          onConfirm={handleConfirmDeleteRow}
          title="Delete row"
          message="Are you sure you want to delete this row? This cannot be undone."
        />
      )}

      {opportunityModal && (() => {
        const storeOpportunity = opportunities.find((o) => o.id === opportunityModal.opportunityId) ?? null;
        const clientJobs: JobOption[] = storeOpportunity
          ? jobsStore
              .filter((j) => j.clientId === storeOpportunity.clientId)
              .map((j) => ({ key: j.id, label: j.name ?? '—' }))
          : [];
        return (
          <OpportunityModal
            isOpen={!!storeOpportunity}
            onClose={() => setOpportunityModal(null)}
            opportunity={storeOpportunity}
            jobsInJourney={clientJobs}
            onSave={(updated) => {
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
              setOpportunityModal(null);
            }}
          />
        );
      })()}

      {jobModal && (() => {
        const job = jobsStore.find((j) => j.id === jobModal.jobId);
        if (!job) return null;
        return (
          <JobModal
            isOpen
            onClose={() => setJobModal(null)}
            job={job}
            jobIndex={0}
            insights={insights.filter((i) => i.clientId === job.clientId)}
            onSave={(_index, updated) => {
              updateJob(job.id, updated);
              setJobModal(null);
            }}
          />
        );
      })()}
    </>
  );
}
