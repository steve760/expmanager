import { useState } from 'react';
import { useStore } from '@/store';
import { getPhaseHealthScore } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhaseHealthBar } from '@/components/ui/PhaseHealthBar';

export function HomeView() {
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const opportunities = useStore((s) => s.opportunities);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);
  const deleteClient = useStore((s) => s.deleteClient);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-[#E6E7E9] p-10 md:p-14 dark:bg-stone-900">
      <div className="flex max-w-2xl flex-col gap-4">
        {clients.map((client) => {
          const projectCount = projects.filter((p) => p.clientId === client.id).length;
          const clientProjectsList = projects.filter((p) => p.clientId === client.id);
          const allJourneyHealths: number[] = [];
          for (const project of clientProjectsList) {
            const projJourneys = journeys.filter((j) => j.projectId === project.id);
            for (const j of projJourneys) {
              const jPhases = phases.filter((p) => p.journeyId === j.id);
              if (jPhases.length === 0) continue;
              const avg =
                jPhases.reduce(
                  (sum, ph) => {
                    const phaseJobs = (ph.jobIds ?? []).map((jid) => jobs.find((x) => x.id === jid)).filter(Boolean) as { tag: string }[];
                    return sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id), phaseJobs);
                  },
                  0
                ) / jPhases.length;
              allJourneyHealths.push(avg);
            }
          }
          const clientHealth =
            allJourneyHealths.length > 0
              ? Math.round(allJourneyHealths.reduce((a, b) => a + b, 0) / allJourneyHealths.length)
              : null;
          return (
            <div
              key={client.id}
              className="group relative rounded-2xl border border-stone-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-elevated hover:shadow-accent/5 dark:border-stone-600/80 dark:bg-stone-800/90 dark:hover:border-[#361D60]/25 dark:hover:shadow-elevated-dark"
            >
              <button
                onClick={() => setSelectedClientId(client.id)}
                className="w-full p-6 pr-12 text-left"
              >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-stone-900 transition-colors group-hover:text-accent dark:text-stone-100 dark:group-hover:text-accent-light">{client.name}</h3>
                    {projectCount > 0 && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent dark:bg-[#361D60]/15 dark:text-accent-light">
                        {projectCount} {projectCount === 1 ? 'Meta-Journey' : 'Meta-Journeys'}
                      </span>
                    )}
                  </div>
                  {client.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-stone-500 dark:text-stone-300">{client.description}</p>
                  )}
                  {clientHealth !== null && (
                    <div className="mt-4 max-w-xs" title="Average health across this client's Meta-Journeys">
                      <PhaseHealthBar pct={clientHealth} />
                    </div>
                  )}
                </div>
              </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ id: client.id, name: client.name });
                }}
                className="absolute right-3 top-3 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                aria-label="Delete client"
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
            deleteClient(deleteConfirm.id);
            setDeleteConfirm(null);
          }}
          title="Delete client"
          message={`Are you sure you want to delete "${deleteConfirm.name}"? All projects and journeys under this client will also be deleted.`}
          requireTypedConfirm="DELETE"
        />
      )}
    </div>
  );
}
