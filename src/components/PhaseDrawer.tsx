import { useEffect, useState, useCallback, useRef } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { SECTION_HEADING_CLASS } from '@/components/ui/ModalLabel';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { JobModal } from '@/components/JobModal';
import { useStore } from '@/store';
import { parseStruggles, serializeStruggles, parseRelatedDocuments, serializeRelatedDocuments, generateId } from '@/lib/utils';
import type { Phase, StruggleItem, StruggleTag, OpportunityTag, RelatedDocument } from '@/types';

const DEBOUNCE_MS = 400;

const LIST_HINT = 'One item per line';

const STRUGGLE_TAGS: StruggleTag[] = ['High', 'Medium', 'Low'];
const OPPORTUNITY_TAGS: OpportunityTag[] = ['High', 'Medium', 'Low'];

export function PhaseDrawer() {
  const phase = useStore((s) => {
    const id = s.selectedPhaseId;
    return id ? s.phases.find((p) => p.id === id) ?? null : null;
  });
  const journey = useStore((s) =>
    phase ? s.journeys.find((j) => j.id === phase.journeyId) ?? null : null
  );
  const project = useStore((s) =>
    journey ? s.projects.find((p) => p.id === journey.projectId) ?? null : null
  );
  const jobs = useStore((s) => s.jobs);
  const insights = useStore((s) => s.insights);
  const updateJob = useStore((s) => s.updateJob);
  const clientJobs = project ? jobs.filter((j) => j.clientId === project.clientId) : [];
  const clientInsights = project ? insights.filter((i) => i.clientId === project.clientId) : [];
  const opportunities = useStore((s) =>
    phase ? s.opportunities.filter((o) => o.phaseId === phase.id).sort((a, b) => a.stageOrder - b.stageOrder) : []
  );
  const updatePhase = useStore((s) => s.updatePhase);
  const deletePhase = useStore((s) => s.deletePhase);
  const setSelectedPhaseId = useStore((s) => s.setSelectedPhaseId);
  const createOpportunity = useStore((s) => s.createOpportunity);
  const updateOpportunity = useStore((s) => s.updateOpportunity);
  const deleteOpportunity = useStore((s) => s.deleteOpportunity);

  const [local, setLocal] = useState<Phase | ReturnType<typeof createEmptyPhase>>(createEmptyPhase());
  const [saved, setSaved] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncFromPhase = useCallback(() => {
    if (phase) {
      const defaults = createEmptyPhase();
      const merged = { ...defaults, ...Object.fromEntries(
        (Object.entries(phase) as [keyof Phase, unknown][]).filter(([, v]) => v !== undefined)
      ) } as Phase;
      setLocal(merged);
      setSaved(true);
    }
  }, [phase?.id, phase?.updatedAt]);

  useEffect(() => {
    syncFromPhase();
  }, [phase?.id, syncFromPhase]);

  const scheduleSave = useCallback(
    (next: Partial<Phase>) => {
      setLocal((prev) => ({ ...prev, ...next }));
      setSaved(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (phase) {
          updatePhase(phase.id, next);
          setSaved(true);
        }
        timerRef.current = null;
      }, DEBOUNCE_MS);
    },
    [phase, updatePhase]
  );

  const handleDelete = () => {
    if (phase) {
      deletePhase(phase.id);
      setSelectedPhaseId(null);
      setDeleteConfirm(false);
    }
  };

  if (!phase) return null;

  return (
    <>
      <Drawer
        isOpen={!!phase}
        onClose={() => setSelectedPhaseId(null)}
        title={local.title || 'Phase details'}
      >
        <div className="space-y-8">
          <div className="h-5">
            {!saved && <p className="text-sm text-amber-600">Saving...</p>}
            {saved && !phase?.title && <p className="text-sm text-stone-400 dark:text-stone-200">Changes auto-save</p>}
            {saved && phase?.title && <p className="text-sm text-emerald-600">✓ Saved</p>}
          </div>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Overview</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Title, description, and channels. These map to the first rows in the journey table.</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Title</label>
                <input
                  type="text"
                  value={local.title ?? ''}
                  onChange={(e) => scheduleSave({ title: e.target.value })}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
                <textarea
                  value={local.description ?? ''}
                  onChange={(e) => scheduleSave({ description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Channels</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.channels ?? ''}
                  onChange={(e) => scheduleSave({ channels: e.target.value })}
                  rows={2}
                  placeholder="e.g. Email, Web, In-person"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Image</label>
                <input
                  type="url"
                  value={local.imageUrl ?? ''}
                  onChange={(e) => scheduleSave({ imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
                {local.imageUrl && (
                  <img
                    src={local.imageUrl}
                    alt="Preview"
                    className="mt-2 max-h-32 rounded-lg object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Customer</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Customer jobs & goals assigned to this phase. Matches the Customer jobs row in the journey table.</p>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Customer jobs & goals</label>
              <p className="mb-3 text-sm text-stone-500 dark:text-stone-200">Select jobs from the Jobs tab to assign to this phase.</p>
              <div className="space-y-3">
                {(local.jobIds ?? []).map((jobId) => {
                  const job = clientJobs.find((j) => j.id === jobId);
                  if (!job) return null;
                  return (
                    <div
                      key={job.id}
                      className="flex gap-2 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-600 dark:bg-stone-700/50"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedJobId(job.id)}
                        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-left text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        <span className="block truncate">{job.name || 'Untitled job'}</span>
                        <span className={`mt-0.5 inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          job.tag === 'Functional' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200' :
                          job.tag === 'Social' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                        }`}>
                          {job.tag}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => scheduleSave({ jobIds: (local.jobIds ?? []).filter((id) => id !== job.id) })}
                        className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label="Remove job from phase"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) scheduleSave({ jobIds: [...(local.jobIds ?? []), id] });
                    e.target.value = '';
                  }}
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
                >
                  <option value="">+ Add job to phase</option>
                  {clientJobs
                    .filter((j) => !(local.jobIds ?? []).includes(j.id))
                    .map((j) => (
                      <option key={j.id} value={j.id}>{j.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Experience (front stage)</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Front stage actions and struggles. These match the experience rows in the journey table.</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Front stage actions</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.frontStageActions ?? ''}
                  onChange={(e) => scheduleSave({ frontStageActions: e.target.value })}
                  rows={3}
                  placeholder="e.g. Visit website, Call support (one per line)"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Struggles</label>
                <p className="mb-3 text-sm text-stone-500 dark:text-stone-200">Add struggles with text and priority (High, Medium, Low)</p>
                <div className="space-y-3">
                  {parseStruggles(local.struggles ?? '').map((item, index) => {
                    const items = parseStruggles(local.struggles ?? '');
                    const updateItems = (next: StruggleItem[]) =>
                      scheduleSave({ struggles: serializeStruggles(next) });
                    return (
                      <div
                        key={index}
                        className="flex gap-2 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-600 dark:bg-stone-700/50"
                      >
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const next = [...items];
                            next[index] = { ...next[index], text: e.target.value };
                            updateItems(next);
                          }}
                          placeholder="Struggle description"
                          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        />
                        <select
                          value={item.tag}
                          onChange={(e) => {
                            const next = [...items];
                            next[index] = { ...next[index], tag: e.target.value as StruggleTag };
                            updateItems(next);
                          }}
                          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        >
                          {STRUGGLE_TAGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => updateItems(items.filter((_, i) => i !== index))}
className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        aria-label="Remove struggle"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const items = parseStruggles(local.struggles ?? '');
                      scheduleSave({
                        struggles: serializeStruggles([...items, { text: '', tag: 'Medium' }]),
                      });
                    }}
className="w-full rounded-xl border-2 border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 hover:border-accent hover:bg-accent-muted/30 hover:text-accent dark:border-stone-600 dark:text-stone-200 dark:hover:border-accent/50 dark:hover:bg-accent/10"
                >
                  + Add struggle
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Operations (back stage)</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Internal struggles, back stage actions, systems, and related processes. These match the rows in the journey table.</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Internal struggles</label>
                <p className="mb-3 text-sm text-stone-500 dark:text-stone-200">Internal team or process struggles with priority (High, Medium, Low)</p>
                <div className="space-y-3">
                  {parseStruggles(local.internalStruggles ?? '').map((item, index) => {
                    const items = parseStruggles(local.internalStruggles ?? '');
                    const updateItems = (next: StruggleItem[]) =>
                      scheduleSave({ internalStruggles: serializeStruggles(next) });
                    return (
                      <div
                        key={index}
                        className="flex gap-2 rounded-xl border border-stone-200 bg-warm-50/50 p-3 dark:border-stone-600 dark:bg-stone-700/50"
                      >
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const next = [...items];
                            next[index] = { ...next[index], text: e.target.value };
                            updateItems(next);
                          }}
                          placeholder="Internal struggle description"
                          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        />
                        <select
                          value={item.tag}
                          onChange={(e) => {
                            const next = [...items];
                            next[index] = { ...next[index], tag: e.target.value as StruggleTag };
                            updateItems(next);
                          }}
                          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        >
                          {STRUGGLE_TAGS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => updateItems(items.filter((_, i) => i !== index))}
                          className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          aria-label="Remove"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const items = parseStruggles(local.internalStruggles ?? '');
                      scheduleSave({ internalStruggles: serializeStruggles([...items, { text: '', tag: 'Medium' }]) });
                    }}
                    className="w-full rounded-xl border-2 border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 hover:border-accent hover:bg-accent-muted/30 hover:text-accent dark:border-stone-600 dark:text-stone-200 dark:hover:border-accent/50 dark:hover:bg-accent/10"
                  >
                    + Add internal struggle
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Back stage actions</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.backStageActions ?? ''}
                  onChange={(e) => scheduleSave({ backStageActions: e.target.value })}
                  rows={2}
                  placeholder="e.g. Update record, Notify team"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Systems</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.systems ?? ''}
                  onChange={(e) => scheduleSave({ systems: e.target.value })}
                  rows={2}
                  placeholder="e.g. CRM, ERP, Booking system"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Related processes</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.relatedProcesses ?? ''}
                  onChange={(e) => scheduleSave({ relatedProcesses: e.target.value })}
                  rows={2}
                  placeholder="e.g. Handover, Approval workflow"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Opportunities</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Opportunities for this phase. Shown in the Opportunities row in the journey table.</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Opportunities (notes)</label>
                <p className="mb-1.5 text-sm text-stone-500 dark:text-stone-200">{LIST_HINT}</p>
                <textarea
                  value={local.opportunities ?? ''}
                  onChange={(e) => scheduleSave({ opportunities: e.target.value })}
                  rows={2}
                  placeholder="e.g. Improve wait time, Add self-service option"
                  className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
                />
              </div>
            </div>
            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">Opportunity items</label>
              <p className="mb-3 text-sm text-stone-500 dark:text-stone-200">Add opportunities with name and priority (High, Medium, or Low). Click an opportunity in the table to add details.</p>
              <div className="space-y-3">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex gap-2 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-600 dark:bg-stone-700/50"
                  >
                    <input
                      type="text"
                      value={opp.name}
                      onChange={(e) => updateOpportunity(opp.id, { name: e.target.value.trim() || opp.name })}
                      placeholder="Opportunity name"
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <select
                      value={opp.priority}
                      onChange={(e) => updateOpportunity(opp.id, { priority: e.target.value as OpportunityTag })}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    >
                      {OPPORTUNITY_TAGS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteOpportunity(opp.id)}
                      className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      aria-label="Remove opportunity"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (phase && journey && project) {
                      createOpportunity({
                        clientId: project.clientId,
                        projectId: project.id,
                        journeyId: journey.id,
                        phaseId: phase.id,
                        name: 'New opportunity',
                        priority: 'Medium',
                      });
                    }
                  }}
                  disabled={!phase || !journey || !project}
                  className="w-full rounded-xl border-2 border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 hover:border-accent hover:bg-accent-muted/30 hover:text-accent dark:border-stone-600 dark:text-stone-200 dark:hover:border-accent/50 dark:hover:bg-accent/10 disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  + Add opportunity
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
            <h3 className={SECTION_HEADING_CLASS}>Related documents</h3>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-200">Links to SharePoint, Jira, Confluence, or other documents. Matches the Related documents row in the journey table.</p>
            <div className="space-y-3">
              {parseRelatedDocuments(local.relatedDocuments ?? '').map((doc) => {
                const docs = parseRelatedDocuments(local.relatedDocuments ?? '');
                const updateDocs = (next: RelatedDocument[]) =>
                  scheduleSave({ relatedDocuments: serializeRelatedDocuments(next) });
                return (
                  <div
                    key={doc.id}
                    className="flex gap-2 rounded-xl border border-stone-200 bg-warm-50/50 p-3 dark:border-stone-600 dark:bg-stone-700/50"
                  >
                    <input
                      type="text"
                      value={doc.label}
                      onChange={(e) => {
                        const next = docs.map((d) => d.id === doc.id ? { ...d, label: e.target.value } : d);
                        updateDocs(next);
                      }}
                      placeholder="Label (e.g. Jira ticket, Confluence page)"
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <input
                      type="url"
                      value={doc.url}
                      onChange={(e) => {
                        const next = docs.map((d) => d.id === doc.id ? { ...d, url: e.target.value } : d);
                        updateDocs(next);
                      }}
                      placeholder="https://..."
                      className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    />
                    <button
                      type="button"
                      onClick={() => updateDocs(docs.filter((d) => d.id !== doc.id))}
                      className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      aria-label="Remove document"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  const docs = parseRelatedDocuments(local.relatedDocuments ?? '');
                  scheduleSave({
                    relatedDocuments: serializeRelatedDocuments([
                      ...docs,
                      { id: generateId(), label: '', url: '' },
                    ]),
                  });
                }}
                className="w-full rounded-xl border-2 border-dashed border-stone-300 px-4 py-3 text-sm text-stone-500 hover:border-accent hover:bg-accent-muted/30 hover:text-accent dark:border-stone-600 dark:text-stone-200 dark:hover:border-accent/50 dark:hover:bg-accent/10"
              >
                + Add document link
              </button>
            </div>
          </section>

          {journey && (journey.customRows?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-warm-50/50 p-5 dark:border-stone-600 dark:bg-stone-800/50">
              <h3 className={SECTION_HEADING_CLASS}>Custom rows</h3>
              <div className="space-y-5">
                {(journey.customRows ?? []).map((row) => (
                  <div key={row.id}>
                    <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-300">{row.label}</label>
                    <textarea
                      value={((local.customRowValues ?? {}) as Record<string, string>)[row.id] ?? ''}
                      onChange={(e) =>
                        scheduleSave({
                          customRowValues: {
                            ...(local.customRowValues ?? {}),
                            [row.id]: e.target.value,
                          },
                        })
                      }
                      rows={2}
                      className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="border-t border-stone-200 pt-6 dark:border-stone-600">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
            >
              Delete phase
            </button>
          </div>
        </div>
      </Drawer>

      {selectedJobId && (() => {
        const job = clientJobs.find((j) => j.id === selectedJobId);
        if (!job) return null;
        return (
          <JobModal
            isOpen
            onClose={() => setSelectedJobId(null)}
            job={job}
            jobIndex={0}
            insights={clientInsights}
            onSave={(_index, updated) => {
              updateJob(job.id, updated);
              setSelectedJobId(null);
            }}
          />
        );
      })()}

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete phase"
        message="Are you sure you want to delete this phase? This action cannot be undone."
      />
    </>
  );
}

function createEmptyPhase() {
  return {
    id: '',
    journeyId: '',
    order: 0,
    title: '',
    description: '',
    imageUrl: '',
    struggles: '',
    internalStruggles: '',
    relatedDocuments: '',
    opportunities: '',
    frontStageActions: '',
    backStageActions: '',
    systems: '',
    relatedProcesses: '',
    channels: '',
    jobIds: [] as string[],
    customRowValues: {} as Record<string, string>,
    createdAt: '',
    updatedAt: '',
  };
}
