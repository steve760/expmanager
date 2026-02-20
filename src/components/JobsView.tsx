import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import { parseCustomerJobs, serializeCustomerJobs } from '@/lib/utils';
import type { CustomerJobTag, CustomerJobItem, Opportunity } from '@/types';
import { JobReadOnlyModal, type JobWithMeta } from '@/components/JobReadOnlyModal';
import { JobModal } from '@/components/JobModal';
import { OpportunityReadOnlyModal } from '@/components/OpportunityReadOnlyModal';
import { OpportunityModal } from '@/components/OpportunityModal';

const JOB_TAG_ORDER: CustomerJobTag[] = ['Emotional', 'Social', 'Functional'];

function JobCard({
  job,
  tagStyle,
  onClick,
  onTogglePriority,
}: {
  job: JobWithMeta & { key: string };
  tagStyle: string;
  onClick: () => void;
  onTogglePriority?: () => void;
}) {
  const canTogglePriority = job.phaseId != null && job.jobIndex != null && !!onTogglePriority;

  return (
    <div className="rounded-xl border border-stone-200/80 bg-white shadow-soft transition-all hover:border-accent/20 hover:shadow-elevated dark:border-stone-600/80 dark:bg-stone-800 dark:shadow-elevated-dark dark:hover:border-[#361D60]/30">
      <div className="flex items-start gap-2 p-4">
        {canTogglePriority && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePriority?.();
            }}
            className={`shrink-0 rounded p-1 transition-colors ${
              job.isPriority
                ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                : 'text-stone-300 hover:text-amber-500 dark:text-stone-500 dark:hover:text-amber-400'
            }`}
            title={job.isPriority ? 'Remove priority' : 'Mark as priority'}
            aria-label={job.isPriority ? 'Remove priority' : 'Mark as priority'}
          >
            <svg className="h-5 w-5" fill={job.isPriority ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onClick}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-medium text-stone-900 dark:text-stone-100">
                {job.name ?? job.text ?? '—'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                <span className="font-medium">{job.journeyName}</span>
                {job.phaseTitle && (
                  <>
                    <span>•</span>
                    <span>{job.phaseTitle}</span>
                  </>
                )}
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tagStyle}`}>
              {job.tag}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

export function JobsView() {
  const jobsClientId = useStore((s) => s.jobsClientId);
  const setJobsClientId = useStore((s) => s.setJobsClientId);
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const opportunities = useStore((s) => s.opportunities);
  const storeJobs = useStore((s) => s.jobs);

  const [viewJob, setViewJob] = useState<(JobWithMeta & { key: string }) | null>(null);
  const [editJob, setEditJob] = useState<(JobWithMeta & { key: string }) | null>(null);
  const [viewOpportunity, setViewOpportunity] = useState<Opportunity | null>(null);
  const [editOpportunity, setEditOpportunity] = useState<Opportunity | null>(null);
  const [filterShowPriorityOnly, setFilterShowPriorityOnly] = useState(false);

  const updateOpportunity = useStore((s) => s.updateOpportunity);
  const updatePhase = useStore((s) => s.updatePhase);

  const client = clients.find((c) => c.id === jobsClientId);
  const clientProjects = projects.filter((p) => p.clientId === jobsClientId);
  const clientJourneys = journeys.filter((j) => clientProjects.some((p) => p.id === j.projectId));
  const clientPhases = phases.filter((p) => clientJourneys.some((j) => j.id === p.journeyId));

  const jobsByTag = useMemo(() => {
    type JobRow = JobWithMeta & { key: string };
    const grouped: Record<CustomerJobTag, JobRow[]> = {
      Functional: [],
      Social: [],
      Emotional: [],
    };

    for (const phase of clientPhases) {
      const journey = journeys.find((j) => j.id === phase.journeyId);
      const project = journey ? projects.find((p) => p.id === journey.projectId) : null;
      const journeyName = journey?.name ?? '—';
      const projectName = project?.name ?? '—';
      const phaseTitle = phase.title ?? '';
      const jobs = parseCustomerJobs(phase.customerJobs ?? '');

      jobs.forEach((job, idx) => {
        const tag = (job.tag ?? 'Functional') as CustomerJobTag;
        if (grouped[tag]) {
          grouped[tag].push({
            ...job,
            tag,
            journeyName,
            phaseTitle,
            projectName,
            phaseId: phase.id,
            jobIndex: idx,
            key: `${phase.id}-${idx}`,
          });
        }
      });
    }

    return grouped;
  }, [clientPhases, journeys, projects]);

  const filteredJobsByTag = useMemo(() => {
    if (!filterShowPriorityOnly) return jobsByTag;
    const filtered: typeof jobsByTag = { Functional: [], Social: [], Emotional: [] };
    (['Functional', 'Social', 'Emotional'] as const).forEach((tag) => {
      filtered[tag] = jobsByTag[tag].filter((j) => j.isPriority);
    });
    return filtered;
  }, [jobsByTag, filterShowPriorityOnly]);

  const priorityJobs = useMemo(() => {
    const list: typeof jobsByTag.Functional = [];
    JOB_TAG_ORDER.forEach((tag) => {
      filteredJobsByTag[tag].forEach((job) => {
        if (job.isPriority) list.push(job);
      });
    });
    return list;
  }, [filteredJobsByTag]);

  const totalJobs = JOB_TAG_ORDER.reduce((sum, tag) => sum + filteredJobsByTag[tag].length, 0);

  const clientOpportunities = useMemo(
    () => opportunities.filter((o) => o.clientId === jobsClientId),
    [opportunities, jobsClientId]
  );

  const getLinkedOpportunities = (jobKey: string) =>
    clientOpportunities.filter((o) => (o.linkedJobIds ?? []).includes(jobKey));

  const toggleJobPriority = (phaseId: string, jobIndex: number) => {
    const phase = phases.find((p) => p.id === phaseId);
    if (!phase) return;
    const jobs = parseCustomerJobs(phase.customerJobs ?? '');
    const next = [...jobs];
    next[jobIndex] = { ...next[jobIndex], isPriority: !next[jobIndex].isPriority };
    updatePhase(phaseId, { customerJobs: serializeCustomerJobs(next) });
  };

  const tagStyle = (tag: CustomerJobTag) => {
    if (tag === 'Functional') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200';
    if (tag === 'Social') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
  };

  if (!jobsClientId || !client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm dark:border-stone-600/80 dark:bg-stone-900/80">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setJobsClientId(null)}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Jobs – {client.name}
            </h2>
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
      </div>

      <div className="flex-1 overflow-auto p-10 md:p-14">
        {totalJobs === 0 ? (
          <p className="text-stone-500 dark:text-stone-400">No customer jobs yet. Add jobs to phases in your journey maps.</p>
        ) : (
          <div className="space-y-10">
            {priorityJobs.length > 0 && (
              <section>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
                  <svg className="h-4 w-4 text-amber-500 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Priority ({priorityJobs.length})
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {priorityJobs.map((job) => (
                    <JobCard
                      key={job.key}
                      job={job}
                      tagStyle={tagStyle(job.tag)}
                      onClick={() => setViewJob(job)}
                      onTogglePriority={job.phaseId != null && job.jobIndex != null ? () => toggleJobPriority(job.phaseId!, job.jobIndex!) : undefined}
                    />
                  ))}
                </div>
              </section>
            )}
            {JOB_TAG_ORDER.map((tag) => {
              const jobs = filteredJobsByTag[tag];
              if (jobs.length === 0) return null;
              return (
                <section key={tag}>
                  <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">
                    {tag} ({jobs.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {jobs.map((job) => (
                      <JobCard
                        key={job.key}
                        job={job}
                        tagStyle={tagStyle(job.tag)}
                        onClick={() => setViewJob(job)}
                        onTogglePriority={job.phaseId != null && job.jobIndex != null ? () => toggleJobPriority(job.phaseId!, job.jobIndex!) : undefined}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {viewJob && (
        <JobReadOnlyModal
          isOpen={!!viewJob}
          onClose={() => setViewJob(null)}
          job={viewJob}
          linkedOpportunities={getLinkedOpportunities(viewJob.key).map((o) => ({ id: o.id, name: o.name }))}
          onOpportunityClick={(opp) => {
            const full = clientOpportunities.find((o) => o.id === opp.id);
            if (full) setViewOpportunity(full);
          }}
          onEdit={
            viewJob.phaseId != null && viewJob.jobIndex != null
              ? () => {
                  setEditJob(viewJob);
                  setViewJob(null);
                }
              : undefined
          }
        />
      )}
      {editJob && editJob.phaseId != null && editJob.jobIndex != null && (() => {
        const phase = phases.find((p) => p.id === editJob.phaseId);
        if (!phase) return null;
        const jobs = parseCustomerJobs(phase.customerJobs ?? '');
        const job = jobs[editJob.jobIndex];
        if (!job) return null;
        return (
          <JobModal
            isOpen
            onClose={() => setEditJob(null)}
            job={job}
            jobIndex={editJob.jobIndex}
            onSave={(index: number, updated) => {
              const next = [...jobs];
              const u = updated as Partial<CustomerJobItem & { priority?: string }>;
              next[index] = {
                ...job,
                ...u,
                name: u.name ?? job.name ?? job.text ?? 'Untitled job',
                isPriority: u.priority ? u.priority === 'High' : (u.isPriority ?? false),
              };
              updatePhase(phase.id, { customerJobs: serializeCustomerJobs(next) });
              setEditJob(null);
            }}
          />
        );
      })()}
      {viewOpportunity && (
        <OpportunityReadOnlyModal
          isOpen={!!viewOpportunity}
          onClose={() => { setViewOpportunity(null); setViewJob(null); }}
          opportunity={viewOpportunity}
          clientName={clients.find((c) => c.id === viewOpportunity.clientId)?.name}
          projectName={projects.find((p) => p.id === viewOpportunity.projectId)?.name}
          journeyName={journeys.find((j) => j.id === viewOpportunity.journeyId)?.name}
          phaseTitle={phases.find((p) => p.id === viewOpportunity.phaseId)?.title}
          linkedJobLabels={(() => {
            const phase = phases.find((p) => p.id === viewOpportunity.phaseId);
            if (!phase) return [];
            const jobs = parseCustomerJobs(phase.customerJobs ?? '');
            return jobs.map((j, i) => ({ key: `${phase.id}-${i}`, label: j.name ?? j.text ?? '—' }));
          })()}
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
          jobsInJourney={storeJobs
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
    </div>
  );
}
