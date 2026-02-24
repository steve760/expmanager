import { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '@/store';
import { JourneyMapView } from '@/components/JourneyMapView';
import { JourneyMapActions } from '@/components/JourneyMapActions';

export function JourneyMapRoute() {
  const { clientId, journeyId } = useParams<{ clientId: string; journeyId: string }>();
  const navigate = useNavigate();
  const journeys = useStore((s) => s.journeys);
  const projects = useStore((s) => s.projects);
  const phases = useStore((s) => s.phases);
  const createPhase = useStore((s) => s.createPhase);
  const setSelection = useStore((s) => s.setSelection);

  const journey = journeys.find((j) => j.id === journeyId);
  const project = journey ? projects.find((p) => p.id === journey.projectId) : null;
  const journeyPhases = journey ? phases.filter((p) => p.journeyId === journey.id) : [];

  useEffect(() => {
    if (journey && project && clientId) {
      setSelection(clientId, project.id, journey.id);
    }
  }, [journeyId, project?.id, clientId, setSelection]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!journey || !project) {
    return <Navigate to={`/clients/${clientId}/journeys`} replace />;
  }

  return (
    <>
      <div className="flex flex-shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-6 py-3 dark:border-stone-600 dark:bg-stone-900">
        <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm" aria-label="Breadcrumb">
          <button
            onClick={() => navigate(`/clients/${clientId}/journeys`)}
            className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-100 hover:text-accent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-accent-light"
            aria-label="Back to Meta-Journeys"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="shrink-0 text-stone-300 dark:text-stone-500">›</span>
          <button
            onClick={() => navigate(`/clients/${clientId}/journeys`)}
            className="shrink-0 font-medium text-stone-600 hover:text-accent dark:text-stone-400 dark:hover:text-accent-light"
          >
            {project.name}
          </button>
          <span className="shrink-0 text-stone-300 dark:text-stone-500">›</span>
          <span className="truncate font-medium text-accent dark:text-accent-light">{journey.name}</span>
        </nav>
        <div className="flex shrink-0 justify-end">
          <JourneyMapActions />
        </div>
      </div>

      {journeyPhases.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-10 md:p-14">
          <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center dark:border-stone-600 dark:bg-stone-800">
            <p className="text-stone-500 dark:text-stone-400">No phases yet. Add your first phase to begin building the journey map.</p>
            <button
              onClick={() => journeyId && createPhase(journeyId)}
              className="mt-4 rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Add first phase
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          <JourneyMapView />
        </div>
      )}
    </>
  );
}
