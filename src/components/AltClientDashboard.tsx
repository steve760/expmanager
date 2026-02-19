import { useState, useMemo, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import { getPhaseHealthScore } from '@/lib/utils';
import type { CustomerJobTag } from '@/types';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';
import { JobReadOnlyModal, type JobWithMeta } from '@/components/JobReadOnlyModal';
import { JobModal } from '@/components/JobModal';
import { SECTION_HEADING_CLASS } from '@/components/ui/ModalLabel';

const JOB_TAG_ORDER: CustomerJobTag[] = ['Functional', 'Social', 'Emotional'];
const OPPORTUNITY_PRIORITIES = ['High', 'Medium', 'Low'] as const;

function PhaseHealthBar({ pct }: { pct: number }) {
  const value = Math.min(100, Math.max(0, pct));
  const isGood = value >= 60;
  const isMid = value >= 40 && value < 60;
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
          {Math.round(value)}%
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
          style={{ left: `${value}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-stone-300">
        <span>Bad</span>
        <span>Good</span>
      </div>
    </div>
  );
}

function jobTagStyle(tag: CustomerJobTag): string {
  if (tag === 'Functional') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
  if (tag === 'Social') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
}

export function AltClientDashboard() {
  const altDashboardClientId = useStore((s) => s.altDashboardClientId);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const insights = useStore((s) => s.insights);
  const opportunities = useStore((s) => s.opportunities);
  const updateJob = useStore((s) => s.updateJob);
  const setSelection = useStore((s) => s.setSelection);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);
  const setJobsClientId = useStore((s) => s.setJobsClientId);
  const setOpportunitiesClientId = useStore((s) => s.setOpportunitiesClientId);
  const goHome = useStore((s) => s.goHome);
  const updateOpportunity = useStore((s) => s.updateOpportunity);

  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [viewOpportunity, setViewOpportunity] = useState<typeof opportunities[0] | null>(null);
  const [viewJob, setViewJob] = useState<(JobWithMeta & { key: string; jobId?: string }) | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [editOpportunity, setEditOpportunity] = useState<typeof opportunities[0] | null>(null);
  const [filterJobType, setFilterJobType] = useState<string>('');
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterJourney, setFilterJourney] = useState<string>('');
  const [filterOppProject, setFilterOppProject] = useState<string>('');
  const [filterOppJourney, setFilterOppJourney] = useState<string>('');
  const [filterOppPriority, setFilterOppPriority] = useState<string>('');
  const [filterOppPriorityOnly, setFilterOppPriorityOnly] = useState(true);
  const [filterJobPriorityOnly, setFilterJobPriorityOnly] = useState(true);
  const [projectsWidthPct, setProjectsWidthPct] = useState(66.67); // 2/3 default
  const resizeStartRef = useRef<{ x: number; widthPct: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, widthPct: projectsWidthPct };
  }, [projectsWidthPct]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeStartRef.current || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaPct = (deltaX / container.width) * 100;
    const newPct = Math.min(80, Math.max(20, resizeStartRef.current.widthPct + deltaPct));
    setProjectsWidthPct(newPct);
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizeStartRef.current = null;
    window.removeEventListener('mousemove', handleResizeMove);
    window.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    handleResizeStart(e);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [handleResizeStart, handleResizeMove, handleResizeEnd]);

  const client = clients.find((c) => c.id === altDashboardClientId);
  const clientProjects = projects.filter((p) => p.clientId === altDashboardClientId);
  const clientJourneys = journeys.filter((j) => clientProjects.some((p) => p.id === j.projectId));
  const clientPhases = phases.filter((p) => clientJourneys.some((j) => j.id === p.journeyId));
  const clientOpportunities = opportunities.filter((o) => o.clientId === altDashboardClientId);

  const jobsList = useMemo(() => {
    type JobRow = JobWithMeta & { journeyId: string; projectId: string; key: string; jobId: string };
    const list: JobRow[] = [];
    for (const phase of clientPhases) {
      const journey = journeys.find((j) => j.id === phase.journeyId);
      const project = journey ? projects.find((p) => p.id === journey.projectId) : null;
      for (const jid of phase.jobIds ?? []) {
        const job = jobs.find((j) => j.id === jid);
        if (!job) continue;
        list.push({
          ...job,
          journeyName: journey?.name ?? '—',
          journeyId: phase.journeyId,
          phaseId: phase.id,
          phaseTitle: phase.title ?? '',
          projectId: project?.id ?? '',
          projectName: project?.name ?? '—',
          key: `${phase.id}-${jid}`,
          jobId: job.id,
        });
      }
    }
    return list;
  }, [clientPhases, journeys, projects, jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobsList;
    if (filterJobPriorityOnly) list = list.filter((j) => j.isPriority);
    if (filterJobType) list = list.filter((j) => j.tag === filterJobType);
    if (filterProject) list = list.filter((j) => j.projectId === filterProject);
    if (filterJourney) list = list.filter((j) => j.journeyId === filterJourney);
    return list;
  }, [jobsList, filterJobPriorityOnly, filterJobType, filterProject, filterJourney]);

  const filteredOpportunities = useMemo(() => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    let list = [...clientOpportunities];
    if (filterOppPriorityOnly) list = list.filter((o) => o.isPriority);
    if (filterOppProject) list = list.filter((o) => o.projectId === filterOppProject);
    if (filterOppJourney) list = list.filter((o) => o.journeyId === filterOppJourney);
    if (filterOppPriority) list = list.filter((o) => o.priority === filterOppPriority);
    return list.sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99));
  }, [clientOpportunities, filterOppPriorityOnly, filterOppProject, filterOppJourney, filterOppPriority]);

  const toggleJobPriority = useCallback((jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    updateJob(jobId, { isPriority: !job.isPriority });
  }, [jobs, updateJob]);

  const toggleOpportunityPriority = useCallback((opp: typeof opportunities[0]) => {
    updateOpportunity(opp.id, { isPriority: !opp.isPriority });
  }, [updateOpportunity]);

  if (!altDashboardClientId || !client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-stone-600/80 dark:bg-stone-900/80">
        <div className="flex w-full flex-wrap items-center gap-4">
          <button
            onClick={goHome}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="relative">
            <button
              onClick={() => setClientDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-left shadow-soft dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{client.name}</span>
              <svg className={`h-5 w-5 text-stone-500 transition-transform dark:text-stone-400 ${clientDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {clientDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setClientDropdownOpen(false)} />
                <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-[200px] overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-elevated dark:border-stone-600 dark:bg-stone-800 dark:shadow-elevated-dark">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 ${
                        c.id === altDashboardClientId ? 'bg-accent/10 font-medium text-accent dark:bg-violet-500/20 dark:text-accent-light' : 'text-stone-700 dark:text-stone-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setJobsClientId(client.id)}
              className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-accent-light dark:hover:bg-violet-500/20"
            >
              View Jobs
            </button>
            <button
              onClick={() => setOpportunitiesClientId(client.id)}
              className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-accent-light dark:hover:bg-violet-500/20"
            >
              Manage Opportunities
            </button>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 overflow-hidden p-6 md:p-10">
        <div
          className="flex min-w-0 shrink-0 flex-col gap-8 overflow-auto pr-4"
          style={{ width: `${projectsWidthPct}%` }}
        >
          {/* Projects - 2-col grid when multiple, always above opportunities */}
          <section>
            <h3 className={SECTION_HEADING_CLASS}>Meta-Journeys</h3>
            <div
              className={
                clientProjects.length > 1
                  ? 'grid grid-cols-2 gap-4'
                  : 'space-y-4'
              }
            >
              {clientProjects.map((project) => {
                const projectJourneys = journeys.filter((j) => j.projectId === project.id);
                const projectPhases = phases.filter((p) => projectJourneys.some((j) => j.id === p.journeyId));
                const avgHealth =
                  projectPhases.length > 0
                    ? projectPhases.reduce((sum, ph) => {
                        const phaseJobs = (ph.jobIds ?? []).map((jid) => jobs.find((x) => x.id === jid)).filter(Boolean) as { tag: string }[];
                        return sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id), phaseJobs);
                      }, 0) / projectPhases.length
                    : null;
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-soft dark:border-stone-600/80 dark:bg-stone-800/90"
                  >
                    <button
                      type="button"
                      onClick={() => client && setSelection(client.id, project.id, null)}
                      className="w-full text-left transition-colors hover:opacity-90"
                    >
                      <h4 className="font-semibold text-stone-900 dark:text-stone-100">{project.name}</h4>
                      {project.description && (
                        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{project.description}</p>
                      )}
                      {avgHealth !== null && (
                        <div className="mt-4 max-w-xs">
                          <PhaseHealthBar pct={avgHealth} />
                        </div>
                      )}
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {projectJourneys.map((j) => (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => client && setSelection(client.id, project.id, j.id)}
                          className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent/25 dark:bg-violet-500/15 dark:text-accent-light dark:hover:bg-violet-500/25"
                        >
                          {j.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Opportunities */}
          <section>
            <h3 className={SECTION_HEADING_CLASS}>Opportunities</h3>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <button
                type="button"
                onClick={() => setFilterOppPriorityOnly(!filterOppPriorityOnly)}
                className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  filterOppPriorityOnly
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600'
                }`}
                title={filterOppPriorityOnly ? 'Showing priority only – click to show all' : 'Showing all – click for priority only'}
              >
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill={filterOppPriorityOnly ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                {filterOppPriorityOnly ? 'Priority' : 'All'}
              </span>
              </button>
              <div>
                <label htmlFor="filter-opp-project" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Meta-Journey</label>
                <select
                  id="filter-opp-project"
                  value={filterOppProject}
                  onChange={(e) => setFilterOppProject(e.target.value)}
                  className="min-w-0 flex-1 basis-24 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="">Select</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-opp-journey" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Journey</label>
                <select
                  id="filter-opp-journey"
                  value={filterOppJourney}
                  onChange={(e) => setFilterOppJourney(e.target.value)}
                  className="min-w-0 flex-1 basis-24 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="">Select</option>
                  {clientJourneys.map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-opp-priority" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Priority</label>
                <select
                  id="filter-opp-priority"
                  value={filterOppPriority}
                  onChange={(e) => setFilterOppPriority(e.target.value)}
                  className="min-w-0 flex-1 basis-24 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                >
                  <option value="">Select</option>
                  {OPPORTUNITY_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              {filteredOpportunities.length === 0 ? (
                <p className="text-sm text-stone-400 dark:text-stone-500">
                  {clientOpportunities.length === 0
                    ? 'No opportunities yet.'
                    : filterOppPriorityOnly
                      ? 'No priority opportunities. Click "All" to see all.'
                      : 'No opportunities match filters.'}
                </p>
              ) : (
                filteredOpportunities.map((opp) => {
                  const journey = journeys.find((j) => j.id === opp.journeyId);
                  const priorityStyle = (p: string) => {
                    if (p === 'High') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
                    if (p === 'Medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
                    return 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300';
                  };
                  return (
                    <div
                      key={opp.id}
                      className="flex w-full items-center gap-2 rounded-xl border border-stone-200 bg-stone-100/80 transition-colors hover:border-accent/30 dark:border-stone-600 dark:bg-stone-700/80 dark:hover:border-violet-500/40"
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleOpportunityPriority(opp); }}
                        className={`shrink-0 rounded p-1 transition-colors ${
                          opp.isPriority ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400' : 'text-stone-300 hover:text-amber-500 dark:text-stone-500'
                        }`}
                        title={opp.isPriority ? 'Remove priority' : 'Mark as priority'}
                        aria-label={opp.isPriority ? 'Remove priority' : 'Mark as priority'}
                      >
                        <svg className="h-4 w-4" fill={opp.isPriority ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewOpportunity(opp)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-3 text-left"
                      >
                        <span className="font-medium text-stone-900 dark:text-stone-100">{opp.name}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityStyle(opp.priority)}`}>{opp.priority}</span>
                          <span className="text-sm text-stone-500 dark:text-stone-400">{journey?.name ?? '—'}</span>
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Resize handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          onMouseDown={handleResizeMouseDown}
          className="flex w-2 shrink-0 cursor-col-resize items-stretch justify-center py-2 hover:bg-stone-100 dark:hover:bg-stone-700"
          title="Drag to resize"
        >
          <div className="w-0.5 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>

        {/* Jobs sidebar */}
        <aside className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-soft dark:border-stone-600/80 dark:bg-stone-800/90">
          <h3 className={SECTION_HEADING_CLASS}>Jobs</h3>
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => setFilterJobPriorityOnly(!filterJobPriorityOnly)}
              className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                filterJobPriorityOnly
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600'
              }`}
              title={filterJobPriorityOnly ? 'Showing priority only – click to show all' : 'Showing all – click for priority only'}
            >
              <span className="inline-flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill={filterJobPriorityOnly ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                {filterJobPriorityOnly ? 'Priority' : 'All'}
              </span>
            </button>
            <div>
              <label htmlFor="filter-job-type" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Type</label>
              <select
                id="filter-job-type"
                value={filterJobType}
                onChange={(e) => setFilterJobType(e.target.value)}
                className="min-w-0 flex-1 basis-20 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Select</option>
                {JOB_TAG_ORDER.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-job-project" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Meta-Journey</label>
              <select
                id="filter-job-project"
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="min-w-0 flex-1 basis-20 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Select</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-job-journey" className="mb-1 block text-xs font-medium text-stone-500 dark:text-stone-400">Journey</label>
              <select
                id="filter-job-journey"
                value={filterJourney}
                onChange={(e) => setFilterJourney(e.target.value)}
                className="min-w-0 flex-1 basis-20 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              >
                <option value="">Select</option>
                {clientJourneys.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-2">
            {filteredJobs.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-stone-500">
                {filterJobPriorityOnly
                  ? 'No priority jobs. Click "All" to see all.'
                  : 'No jobs match filters.'}
              </p>
            ) : (
              filteredJobs.map((job) => (
                <div
                  key={job.key}
                  className="flex w-full items-start gap-2 rounded-xl border border-stone-200 bg-stone-100/80 transition-colors hover:border-accent/30 dark:border-stone-600 dark:bg-stone-700/80 dark:hover:border-violet-500/40"
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleJobPriority(job.jobId); }}
                    className={`shrink-0 rounded p-1 transition-colors ${
                      job.isPriority ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400' : 'text-stone-300 hover:text-amber-500 dark:text-stone-500'
                    }`}
                    title={job.isPriority ? 'Remove priority' : 'Mark as priority'}
                    aria-label={job.isPriority ? 'Remove priority' : 'Mark as priority'}
                  >
                    <svg className="h-4 w-4" fill={job.isPriority ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewJob(job)}
                    className="min-w-0 flex-1 px-1 py-2 text-left"
                  >
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-2">{job.name ?? job.text ?? '—'}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                      <span>{job.journeyName}</span>
                      <span>•</span>
                      <span>{job.phaseTitle || '—'}</span>
                    </div>
                    <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${jobTagStyle(job.tag)}`}>
                      {job.tag}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {viewOpportunity && (
        <OpportunityReadOnlyModal
          isOpen={!!viewOpportunity}
          onClose={() => { setViewOpportunity(null); setViewJob(null); }}
          opportunity={viewOpportunity}
          clientName={clients.find((c) => c.id === viewOpportunity.clientId)?.name}
          projectName={projects.find((p) => p.id === viewOpportunity.projectId)?.name}
          journeyName={journeys.find((j) => j.id === viewOpportunity.journeyId)?.name}
          phaseTitle={phases.find((p) => p.id === viewOpportunity.phaseId)?.title}
          linkedJobLabels={(viewOpportunity.linkedJobIds ?? [])
            .map((jid) => {
              const j = jobs.find((x) => x.id === jid);
              return j ? { key: j.id, label: j.name } : null;
            })
            .filter(Boolean) as { key: string; label: string }[]}
          onEdit={() => {
            setEditOpportunity(viewOpportunity);
            setViewOpportunity(null);
          }}
          onBack={viewJob ? () => setViewOpportunity(null) : undefined}
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
      {viewJob && (
        <JobReadOnlyModal
          isOpen={!!viewJob}
          onClose={() => setViewJob(null)}
          job={viewJob}
          linkedInsights={(viewJob.insightIds ?? [])
            .map((id) => insights.find((i) => i.id === id))
            .filter(Boolean)
            .map((i) => ({ id: i!.id, title: i!.title ?? '—' }))}
          linkedOpportunities={clientOpportunities
            .filter((o) => (o.linkedJobIds ?? []).includes(viewJob.id))
            .map((o) => ({ id: o.id, name: o.name }))}
          onOpportunityClick={(opp) => {
            setViewOpportunity(clientOpportunities.find((o) => o.id === opp.id) ?? null);
          }}
          onEdit={viewJob.jobId ? () => { setEditJobId(viewJob.jobId!); setViewJob(null); } : undefined}
        />
      )}
      {editJobId && (() => {
        const job = jobs.find((j) => j.id === editJobId);
        if (!job) return null;
        return (
          <JobModal
            isOpen
            onClose={() => setEditJobId(null)}
            job={job}
            jobIndex={0}
            insights={insights.filter((i) => i.clientId === job.clientId)}
            onSave={(_index, updated) => {
              updateJob(job.id, updated);
              setEditJobId(null);
            }}
          />
        );
      })()}
    </div>
  );
}
