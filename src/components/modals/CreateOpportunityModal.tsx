import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModalLabel } from '@/components/ui/ModalLabel';
import { useStore } from '@/store';
import type { OpportunityTag } from '@/types';

const OPPORTUNITY_TAGS: OpportunityTag[] = ['High', 'Medium', 'Low'];

interface CreateOpportunityModalProps {
  clientId: string;
  projects: { id: string; name: string }[];
  journeys: { id: string; name: string; projectId: string }[];
  phases: { id: string; title: string; journeyId: string; jobIds?: string[] }[];
  jobs: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateOpportunityModal({
  clientId,
  projects,
  journeys,
  phases,
  jobs,
  onClose,
  onCreated,
}: CreateOpportunityModalProps) {
  const createOpportunity = useStore((s) => s.createOpportunity);

  const [projectId, setProjectId] = useState('');
  const [journeyId, setJourneyId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<OpportunityTag>('High');
  const [isPriority, setIsPriority] = useState(false);
  const [description, setDescription] = useState('');
  const [pointOfDifferentiation, setPointOfDifferentiation] = useState('');
  const [criticalAssumptions, setCriticalAssumptions] = useState('');
  const [linkedJobIds, setLinkedJobIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const availableJourneys = useMemo(
    () => journeys.filter((j) => j.projectId === projectId),
    [journeys, projectId]
  );
  const availablePhases = useMemo(
    () => phases.filter((p) => p.journeyId === journeyId),
    [phases, journeyId]
  );

  const handleProjectChange = (v: string) => {
    setProjectId(v);
    setJourneyId('');
    setPhaseId('');
  };
  const handleJourneyChange = (v: string) => {
    setJourneyId(v);
    setPhaseId('');
    setLinkedJobIds([]);
  };

  // All jobs for this client – opportunities can link to any client job
  const clientJobOptions = useMemo(
    () => jobs.map((j) => ({ key: j.id, label: j.name ?? '—' })),
    [jobs]
  );

  const toggleJob = (key: string) => {
    setLinkedJobIds((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!projectId || !journeyId) {
      setError('Please select a Meta-Journey and journey.');
      return;
    }
    const firstPhase = availablePhases[0];
    const phase = phaseId || firstPhase?.id || '';
    try {
      createOpportunity({
        clientId,
        projectId,
        journeyId,
        phaseId: phase,
        name: name.trim() || 'Untitled opportunity',
        priority,
        isPriority,
        description: description.trim() || undefined,
        pointOfDifferentiation: pointOfDifferentiation.trim() || undefined,
        criticalAssumptions: criticalAssumptions.trim() || undefined,
        linkedJobIds: linkedJobIds.length > 0 ? linkedJobIds : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create opportunity.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New Opportunity"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-opportunity-form"
            className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white hover:bg-accent-hover"
          >
            Create
          </button>
        </div>
      }
    >
      <form id="create-opportunity-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </p>
        )}
        <div>
          <ModalLabel htmlFor="opp-project">
            Project <span className="text-red-500">*</span>
          </ModalLabel>
          <select
            id="opp-project"
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            required
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select Meta-Journey</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <ModalLabel htmlFor="opp-journey">
            Journey <span className="text-red-500">*</span>
          </ModalLabel>
          <select
            id="opp-journey"
            value={journeyId}
            onChange={(e) => handleJourneyChange(e.target.value)}
            required
            disabled={!projectId}
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">Select journey</option>
            {availableJourneys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <ModalLabel htmlFor="opp-phase">Phase (optional)</ModalLabel>
          <select
            id="opp-phase"
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            disabled={!journeyId}
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="">No phase</option>
            {availablePhases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Untitled phase'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <ModalLabel htmlFor="opp-name">
            Name <span className="text-red-500">*</span>
          </ModalLabel>
          <input
            id="opp-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Opportunity name"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        {clientJobOptions.length > 0 && (
          <div>
            <ModalLabel>Linked jobs</ModalLabel>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-300 p-2 dark:border-stone-600 dark:bg-stone-800/50">
              {clientJobOptions.map((job) => (
                <label
                  key={job.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-700/50"
                >
                  <input
                    type="checkbox"
                    checked={linkedJobIds.includes(job.key)}
                    onChange={() => toggleJob(job.key)}
                    className="h-4 w-4 rounded border-stone-300 text-accent focus:ring-accent/20 dark:border-stone-500"
                  />
                  <span className="text-sm text-stone-700 dark:text-stone-200">{job.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <ModalLabel htmlFor="opp-priority">Priority</ModalLabel>
            <select
              id="opp-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as OpportunityTag)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            >
              {OPPORTUNITY_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setIsPriority(!isPriority)}
              className={`rounded p-1 transition-colors ${
                isPriority ? 'text-amber-500' : 'text-stone-300 hover:text-amber-500'
              }`}
            >
              <svg className="h-5 w-5" fill={isPriority ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
            <span className="text-sm text-stone-600 dark:text-stone-400">Priority</span>
          </label>
        </div>
        <div>
          <ModalLabel htmlFor="opp-desc">Description</ModalLabel>
          <textarea
            id="opp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <div>
          <ModalLabel htmlFor="opp-pod">Point of differentiation</ModalLabel>
          <textarea
            id="opp-pod"
            value={pointOfDifferentiation}
            onChange={(e) => setPointOfDifferentiation(e.target.value)}
            rows={2}
            placeholder="What makes this opportunity distinct"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
        <div>
          <ModalLabel htmlFor="opp-assumptions">Critical assumptions</ModalLabel>
          <textarea
            id="opp-assumptions"
            value={criticalAssumptions}
            onChange={(e) => setCriticalAssumptions(e.target.value)}
            rows={2}
            placeholder="Key assumptions"
            className="w-full rounded-xl border border-stone-300 px-3 py-2 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
      </form>
    </Modal>
  );
}
