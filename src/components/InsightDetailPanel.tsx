import { useState } from 'react';
import { ModalSectionLabel, ModalLabel, ViewOnlySection } from '@/components/ui/ModalLabel';
import type { Insight, PriorityLevel } from '@/types';

const PRIORITY_LEVELS: PriorityLevel[] = ['High', 'Medium', 'Low'];

interface InsightDetailPanelProps {
  insight: Insight;
  mode: 'view' | 'edit';
  linkedJobs?: { id: string; name: string }[];
  onEdit?: () => void;
  onDelete?: () => void;
  onLinkedJobClick?: (jobId: string) => void;
  onSave?: (data: { title: string; description?: string; priority: PriorityLevel }) => void;
  onCancel?: () => void;
  embedded?: boolean;
  /** When true with embedded edit, omit footer (parent provides it) */
  hideFooter?: boolean;
}

export function InsightDetailPanel({
  insight,
  mode,
  linkedJobs = [],
  onEdit,
  onDelete,
  onLinkedJobClick,
  onSave,
  onCancel,
  embedded = false,
  hideFooter = false,
}: InsightDetailPanelProps) {
  if (mode === 'edit' && onSave) {
    return (
      <InsightEditForm
        insight={insight}
        onSave={onSave}
        onCancel={onCancel}
        embedded={embedded}
        hideFooter={hideFooter}
      />
    );
  }

  return (
    <>
      <div className="space-y-5">
        <ViewOnlySection title="Content">
          <div className="space-y-4">
            <div>
              <ModalSectionLabel>Description</ModalSectionLabel>
              <p className="whitespace-pre-wrap text-sm text-stone-700 dark:text-stone-300">
                {insight.description || '—'}
              </p>
            </div>
            <div>
              <ModalSectionLabel>Priority</ModalSectionLabel>
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
            </div>
          </div>
        </ViewOnlySection>
        {linkedJobs.length > 0 && (
          <ViewOnlySection title="Linked jobs">
            <div className="flex flex-wrap gap-2">
              {linkedJobs.map((j) =>
                onLinkedJobClick ? (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onLinkedJobClick(j.id)}
                    className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-accent-light dark:hover:bg-violet-500/25"
                  >
                    {j.name}
                  </button>
                ) : (
                  <span
                    key={j.id}
                    className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  >
                    {j.name}
                  </span>
                )
              )}
            </div>
          </ViewOnlySection>
        )}
      </div>
      {embedded && (onEdit || onDelete) && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-200 pt-4 dark:border-stone-600">
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-red-200 px-4 py-2.5 font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Edit
            </button>
          )}
        </div>
      )}
    </>
  );
}

function InsightEditForm({
  insight,
  onSave,
  onCancel,
  embedded,
  hideFooter,
}: {
  insight: Insight;
  onSave: (data: { title: string; description?: string; priority: PriorityLevel }) => void;
  onCancel?: () => void;
  embedded?: boolean;
  hideFooter?: boolean;
}) {
  const [title, setTitle] = useState(insight.title ?? '');
  const [description, setDescription] = useState(insight.description ?? '');
  const [priority, setPriority] = useState<PriorityLevel>((insight.priority ?? 'Medium') as PriorityLevel);

  return (
    <>
      <form
        id="edit-insight-form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title: title.trim() || 'Untitled', description: description.trim() || undefined, priority });
        }}
        className="space-y-4"
      >
        <div>
          <ModalLabel htmlFor="edit-insight-title-stack">Title</ModalLabel>
          <input
            id="edit-insight-title-stack"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <div>
          <ModalLabel htmlFor="edit-insight-desc-stack">Description</ModalLabel>
          <textarea
            id="edit-insight-desc-stack"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-300 px-4 py-2.5 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <div>
          <ModalLabel htmlFor="edit-insight-priority-stack">Priority</ModalLabel>
          <select
            id="edit-insight-priority-stack"
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
      {embedded && !hideFooter && onCancel && (
        <div className="mt-4 flex gap-3 border-t border-stone-200 pt-4 dark:border-stone-600">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700">
            Cancel
          </button>
          <button type="submit" form="edit-insight-form-stack" className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover">
            Save
          </button>
        </div>
      )}
    </>
  );
}
