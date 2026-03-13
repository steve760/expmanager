import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/store';
import { getPhaseHealthScore } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PhaseHealthBar } from '@/components/ui/PhaseHealthBar';

export function JourneysRoute() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const phases = useStore((s) => s.phases);
  const jobs = useStore((s) => s.jobs);
  const opportunities = useStore((s) => s.opportunities);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const setSelection = useStore((s) => s.setSelection);
  const setCreateProjectModalOpen = useStore((s) => s.setCreateProjectModalOpen);
  const setCreateJourneyModalOpen = useStore((s) => s.setCreateJourneyModalOpen);
  const deleteProject = useStore((s) => s.deleteProject);
  const deleteJourney = useStore((s) => s.deleteJourney);

  const client = clients.find((c) => c.id === clientId);

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'project' | 'journey'; id: string; name: string } | null>(null);

  const clientProjects = client ? projects.filter((p) => p.clientId === client.id) : [];
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;
  const projectJourneys = selectedProject ? journeys.filter((j) => j.projectId === selectedProject.id) : [];

  // Clear stale project selection if it doesn't belong to this client
  useEffect(() => {
    if (!client) return;
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);
      if (!project || project.clientId !== client.id) {
        setSelection(client.id, null, null);
      }
    }
  }, [client?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!client) return null;

  return (
    <>
      {selectedProjectId && (
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-3 dark:border-stone-600 dark:bg-stone-900">
          <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm" aria-label="Breadcrumb">
            <button
              onClick={() => setSelection(client.id, null, null)}
              className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-accent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-accent-light"
              aria-label="Back to Meta-Journeys"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {selectedProject && (
              <>
                <span className="shrink-0 text-stone-300 dark:text-stone-500">›</span>
                <span className="shrink-0 font-medium text-accent dark:text-accent-light">{selectedProject.name}</span>
              </>
            )}
          </nav>
          {selectedProject && (
            <button
              onClick={() => setCreateJourneyModalOpen(true)}
              className="rounded-2xl bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 dark:hover:shadow-glow-dark"
            >
              Add journey
            </button>
          )}
        </div>
      )}

      {!selectedProjectId ? (
        <div className="flex-1 overflow-auto p-8 md:p-14">
          {clientProjects.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center">
              <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-stone-800">
                <div className="mb-4 flex justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-2xl dark:bg-stone-600" aria-hidden>
                    🗺️
                  </span>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                  No Meta-Journeys yet
                </h2>
                <p className="mb-6 text-sm text-stone-600 dark:text-stone-400">
                  Add one to organise your journeys and start mapping.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="w-full rounded-xl bg-[#361D60] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A2878] dark:bg-[#361D60] dark:hover:bg-[#4A2878]"
                >
                  New Meta-Journey
                </button>
              </div>
            </div>
          ) : (
            <div className="flex max-w-5xl flex-col gap-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Meta-Journeys</h2>
                <button
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow active:translate-y-0"
                >
                  Add Meta-Journey
                </button>
              </div>
              {clientProjects.map((project) => {
                const projJourneys = journeys.filter((j) => j.projectId === project.id);
                const journeyHealths = projJourneys
                  .map((j) => {
                    const jPhases = phases.filter((p) => p.journeyId === j.id);
                    if (jPhases.length === 0) return null;
                    return (
                      jPhases.reduce(
                        (sum, ph) => {
                          const phaseJobs = (ph.jobIds ?? []).map((jid) => jobs.find((x) => x.id === jid)).filter(Boolean) as { tag: string }[];
                          return sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id), phaseJobs);
                        },
                        0
                      ) / jPhases.length
                    );
                  })
                  .filter((h): h is number => h !== null);
                const metaHealth =
                  journeyHealths.length > 0
                    ? Math.round(journeyHealths.reduce((a, b) => a + b, 0) / journeyHealths.length)
                    : null;

                return (
                  <div
                    key={project.id}
                    className="w-full max-w-full rounded-2xl border border-stone-200 bg-white shadow-soft dark:border-stone-600 dark:bg-stone-800"
                  >
                    <div className="flex items-start gap-0 p-6">
                      {/* Left: Meta-Journey title, description, health */}
                      <div className="flex min-w-0 flex-1 flex-col pr-4">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            onClick={() => setSelection(client.id, project.id, null)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <h3 className="break-words font-semibold text-stone-900 transition-colors hover:text-accent dark:text-stone-100 dark:hover:text-accent-light">{project.name}</h3>
                            {project.description && (
                              <p className="mt-1 break-words text-sm text-stone-500 dark:text-stone-300">
                                {project.description}
                              </p>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ type: 'project', id: project.id, name: project.name });
                            }}
                            className="shrink-0 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            aria-label="Delete Meta-Journey"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        {metaHealth !== null && (
                          <div className="mt-4 w-full" title="Average health of journeys in this Meta-Journey">
                            <PhaseHealthBar pct={metaHealth} />
                          </div>
                        )}
                      </div>
                      {(metaHealth !== null || projJourneys.length > 0) && (
                        <div className="w-px shrink-0 self-stretch bg-stone-200 dark:bg-stone-600" aria-hidden />
                      )}
                      {/* Right: journey cards in a horizontal row (min-width so two cards fit) */}
                      <div className="flex min-w-[480px] flex-1 flex-wrap gap-3 pl-4">
                        {projJourneys.length === 0 ? (
                          <button
                            onClick={() => setSelection(client.id, project.id, null)}
                            className="w-full min-w-0 rounded-xl border border-dashed border-stone-200 bg-stone-50/50 py-8 text-center text-sm text-stone-500 transition-colors hover:border-accent/30 hover:bg-accent/5 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-400 dark:hover:border-[#361D60]/30 dark:hover:bg-[#361D60]/10"
                          >
                            No journeys. Click to add journeys.
                          </button>
                        ) : (
                          projJourneys.map((journey) => {
                            const jPhases = phases.filter((p) => p.journeyId === journey.id);
                            const avgHealth =
                              jPhases.length > 0
                                ? Math.round(
                                    jPhases.reduce(
                                      (sum, ph) =>
                                        sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id)),
                                      0
                                    ) / jPhases.length
                                  )
                                : null;
                            const isGood = avgHealth !== null && avgHealth >= 60;
                            const isMid = avgHealth !== null && avgHealth >= 40 && avgHealth < 60;

                            return (
                              <button
                                key={journey.id}
                                onClick={() => navigate(`/clients/${client.id}/journeys/${journey.id}`)}
                                className="min-w-[220px] max-w-[360px] flex-1 rounded-xl border border-stone-200 bg-white p-4 text-left shadow-soft transition-all hover:border-accent/20 hover:shadow-elevated dark:border-stone-600 dark:bg-stone-800 dark:hover:border-[#361D60]/25 dark:hover:shadow-elevated-dark"
                              >
                                <h4 className="break-words font-medium text-stone-900 dark:text-stone-100">{journey.name}</h4>
                                {journey.description && (
                                  <p className="mt-1 break-words text-sm text-stone-500 dark:text-stone-300">
                                    {journey.description}
                                  </p>
                                )}
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {jPhases.length > 0 && (
                                    <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent dark:bg-[#361D60]/15 dark:text-accent-light">
                                      {jPhases.length} {jPhases.length === 1 ? 'phase' : 'phases'}
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
                                      title="Average phase health"
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
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-10 md:p-14">
          {selectedProject && (
            <>
              {projectJourneys.length === 0 ? (
                <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-stone-600 dark:bg-stone-800">
                  <p className="text-stone-500 dark:text-stone-400">No journeys yet. Create a journey to start mapping customer phases.</p>
                  <button
                    onClick={() => setCreateJourneyModalOpen(true)}
                    className="mt-4 rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Add journey
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {projectJourneys.map((journey) => {
                    const jPhases = phases.filter((p) => p.journeyId === journey.id);
                    const avgHealth =
                      jPhases.length > 0
                        ? Math.round(
                            jPhases.reduce(
                              (sum, ph) => {
                                const phaseJobs = (ph.jobIds ?? []).map((jid) => jobs.find((x) => x.id === jid)).filter(Boolean) as { tag: string }[];
                                return sum + getPhaseHealthScore(ph, opportunities.filter((o) => o.phaseId === ph.id), phaseJobs);
                              },
                              0
                            ) / jPhases.length
                          )
                        : null;
                    const isGood = avgHealth !== null && avgHealth >= 60;
                    const isMid = avgHealth !== null && avgHealth >= 40 && avgHealth < 60;

                    return (
                      <div
                        key={journey.id}
                        className="group relative min-w-[260px] max-w-[400px] flex-1 rounded-2xl border border-stone-200/80 bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-elevated dark:border-stone-600/80 dark:bg-stone-800 dark:hover:border-[#361D60]/25 dark:hover:shadow-elevated-dark"
                      >
                        <button
                          onClick={() => navigate(`/clients/${client.id}/journeys/${journey.id}`)}
                          className="w-full p-6 pr-12 text-left"
                        >
                          <h3 className="font-semibold text-stone-900 transition-colors group-hover:text-accent dark:text-stone-100 dark:group-hover:text-accent-light">{journey.name}</h3>
                          {journey.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-stone-500 dark:text-stone-300">{journey.description}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {jPhases.length > 0 && (
                              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent dark:bg-[#361D60]/15 dark:text-accent-light">
                                {jPhases.length} {jPhases.length === 1 ? 'phase' : 'phases'}
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
                                title="Average phase health"
                              >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isGood ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-red-500'}`} />
                                {avgHealth}% health
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ type: 'journey', id: journey.id, name: journey.name });
                          }}
                          className="absolute right-3 top-3 rounded-lg p-2 text-stone-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          aria-label="Delete journey"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => {
            if (deleteConfirm.type === 'project') {
              deleteProject(deleteConfirm.id);
            } else {
              deleteJourney(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }}
          title={deleteConfirm.type === 'project' ? 'Delete Meta-Journey' : 'Delete journey'}
          message={
            deleteConfirm.type === 'project'
              ? `Are you sure you want to delete "${deleteConfirm.name}"? All journeys and phases under this Meta-Journey will also be deleted.`
              : `Are you sure you want to delete "${deleteConfirm.name}"? All phases under this journey will also be deleted.`
          }
          requireTypedConfirm="DELETE"
        />
      )}
    </>
  );
}
