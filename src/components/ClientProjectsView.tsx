import { useState } from 'react';
import { useStore } from '@/store';
import { getPhaseHealthScore } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function ClientProjectsView() {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const opportunities = useStore((s) => s.opportunities);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const setCreateProjectModalOpen = useStore((s) => s.setCreateProjectModalOpen);
  const setSelection = useStore((s) => s.setSelection);
  const setOpportunitiesClientId = useStore((s) => s.setOpportunitiesClientId);
  const setJobsClientId = useStore((s) => s.setJobsClientId);
  const deleteProject = useStore((s) => s.deleteProject);
  const deleteClient = useStore((s) => s.deleteClient);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'client' | 'project'; id: string; name: string } | null>(null);

  const client = clients.find((c) => c.id === selectedClientId);
  const clientProjects = projects.filter((p) => p.clientId === selectedClientId);

  if (!client) return null;

  return (
    <div className="flex flex-1 flex-col overflow-auto p-10 md:p-14">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">{client.name}</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-300">Projects</p>
          </div>
          <button
            onClick={() => setDeleteConfirm({ type: 'client', id: client.id, name: client.name })}
            className="rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            aria-label="Delete client"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setJobsClientId(client.id)}
            className="rounded-2xl border border-accent/40 bg-accent/10 px-6 py-3 text-sm font-semibold text-accent shadow-soft transition-all duration-200 hover:bg-accent/20 hover:shadow-glow active:translate-y-0 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-accent-light dark:hover:bg-violet-500/20 dark:hover:shadow-glow-dark"
          >
            View Jobs
          </button>
          <button
            onClick={() => setOpportunitiesClientId(client.id)}
            className="rounded-2xl border border-accent/40 bg-accent/10 px-6 py-3 text-sm font-semibold text-accent shadow-soft transition-all duration-200 hover:bg-accent/20 hover:shadow-glow active:translate-y-0 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-accent-light dark:hover:bg-violet-500/20 dark:hover:shadow-glow-dark"
          >
            Manage Opportunities
          </button>
          <button
            onClick={() => setCreateProjectModalOpen(true)}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 dark:hover:shadow-glow-dark"
          >
            Add project
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {clientProjects.map((project) => {
          const projectJourneys = journeys.filter((j) => j.projectId === project.id);
          const journeyCount = projectJourneys.length;
          const projectPhases = phases.filter((p) => projectJourneys.some((j) => j.id === p.journeyId));
          const avgHealth =
            projectPhases.length > 0
              ? Math.round(
                  projectPhases.reduce((sum, ph) => {
                    const phaseJobs = (ph.jobIds ?? []).map((jid) => jobs.find((x) => x.id === jid)).filter(Boolean) as { tag: string }[];
                    return sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id), phaseJobs);
                  }, 0) / projectPhases.length
                )
              : null;
          const isGood = avgHealth !== null && avgHealth >= 60;
          const isMid = avgHealth !== null && avgHealth >= 40 && avgHealth < 60;

          return (
            <div
              key={project.id}
              className="group relative rounded-2xl border border-stone-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-elevated hover:shadow-accent/5 dark:border-stone-600/80 dark:bg-stone-800/90 dark:hover:border-violet-500/25 dark:hover:shadow-elevated-dark"
            >
              <button
                onClick={() => setSelection(client.id, project.id, null)}
                className="w-full p-6 pr-12 text-left"
              >
              <h3 className="font-semibold text-stone-900 transition-colors group-hover:text-accent dark:text-stone-100 dark:group-hover:text-accent-light">{project.name}</h3>
              {project.description && (
                <p className="mt-2 line-clamp-2 text-sm text-stone-500 dark:text-stone-300">{project.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {journeyCount > 0 && (
                  <span className="inline-flex rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent dark:bg-violet-500/15 dark:text-accent-light">
                    {journeyCount} {journeyCount === 1 ? 'journey' : 'journeys'}
                  </span>
                )}
                {avgHealth !== null && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isGood
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : isMid
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                    }`}
                    title="Average phase health across all journeys"
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    />
                    {avgHealth}% health
                  </span>
                )}
              </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ type: 'project', id: project.id, name: project.name });
                }}
                className="absolute right-3 top-3 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                aria-label="Delete project"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {deleteConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (deleteConfirm.type === 'client') {
              deleteClient(deleteConfirm.id);
            } else {
              deleteProject(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }}
          title={deleteConfirm.type === 'client' ? 'Delete client' : 'Delete project'}
          message={
            deleteConfirm.type === 'client'
              ? `Are you sure you want to delete "${deleteConfirm.name}"? All projects and journeys under this client will also be deleted.`
              : `Are you sure you want to delete "${deleteConfirm.name}"? All journeys and phases under this project will also be deleted.`
          }
          requireTypedConfirm="DELETE"
        />
      )}
    </div>
  );
}
