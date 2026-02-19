import { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { CreateClientModal } from '@/components/modals/CreateClientModal';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { CreateJourneyModal } from '@/components/modals/CreateJourneyModal';
import type { Client, Project, Journey } from '@/types';

const SIDEBAR_COLLAPSED_KEY = 'expmanager-sidebar-collapsed';

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  const clientModalOpen = useStore((s) => s.createClientModalOpen);
  const projectModalOpen = useStore((s) => s.createProjectModalOpen);
  const journeyModalOpen = useStore((s) => s.createJourneyModalOpen);
  const setCreateClientModalOpen = useStore((s) => s.setCreateClientModalOpen);
  const setCreateProjectModalOpen = useStore((s) => s.setCreateProjectModalOpen);
  const setCreateJourneyModalOpen = useStore((s) => s.setCreateJourneyModalOpen);
  const goHome = useStore((s) => s.goHome);

  const clients = useStore((s) => s.clients);
  const projects = useStore((s) => s.projects);
  const journeys = useStore((s) => s.journeys);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const selectedProjectId = useStore((s) => s.selectedProjectId);
  const selectedJourneyId = useStore((s) => s.selectedJourneyId);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);
  const setSelection = useStore((s) => s.setSelection);
  const updateClient = useStore((s) => s.updateClient);
  const updateProject = useStore((s) => s.updateProject);
  const updateJourney = useStore((s) => s.updateJourney);

  const toggleClient = (id: string) => {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleProject = (id: string) => {
    setExpandedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddProject = (clientId: string) => {
    setSelectedClientId(clientId);
    setCreateProjectModalOpen(true);
  };

  const handleAddJourney = (projectId: string, clientId: string) => {
    setSelection(clientId, projectId, null);
    setCreateJourneyModalOpen(true);
  };

  const handleSelectJourney = (clientId: string, projectId: string, journeyId: string) => {
    setSelection(clientId, projectId, journeyId);
    setMobileOpen(false);
  };

  const isHome = !selectedClientId;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-2xl bg-white/90 p-2.5 shadow-soft backdrop-blur-sm transition-all duration-200 hover:shadow-elevated active:scale-95 dark:bg-stone-800/90 dark:shadow-elevated-dark dark:hover:shadow-glow-dark lg:hidden"
        aria-label="Open menu"
      >
        <svg className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`
          fixed left-0 top-0 z-40 h-full border-r border-sidebar-border bg-sidebar shadow-elevated
          dark:border-stone-700 dark:bg-stone-800 dark:shadow-elevated-dark
          flex flex-col transform transition-all duration-200 lg:relative lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-80'}
        `}
      >
        <div className="flex h-full flex-col">
          <div className={`flex items-center border-b border-sidebar-border px-3 py-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="flex flex-1 items-center gap-3">
                <img
                  src="/purple-shirt-logo.png"
                  alt="Purple Shirt"
                  className="h-8 object-contain"
                  style={{ maxWidth: '80px' }}
                />
                <h1 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-100">ExpManager</h1>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="rounded-xl p-2 text-stone-600 hover:bg-sidebar-hover dark:text-stone-400 dark:hover:bg-stone-700"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl p-2 text-stone-600 hover:bg-sidebar-hover lg:hidden"
                aria-label="Close menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  goHome();
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isHome ? 'bg-white/80 font-medium text-accent shadow-soft dark:bg-stone-700 dark:shadow-elevated-dark' : 'text-stone-700 hover:bg-sidebar-hover dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
                title="Home"
              >
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                {!collapsed && <span>Home</span>}
              </button>

              {!collapsed && (
                <section className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400">Clients</h2>
                    <button
                      onClick={() => setCreateClientModalOpen(true)}
                      className="rounded-xl p-1.5 text-accent hover:bg-sidebar-hover"
                      aria-label="Add client"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {clients.map((client) => (
                      <ClientNode
                        key={client.id}
                        client={client}
                        projects={projects.filter((p) => p.clientId === client.id)}
                        journeys={journeys}
                        expandedClient={expandedClientIds.has(client.id)}
                        expandedProjectIds={expandedProjectIds}
                        selectedClientId={selectedClientId}
                        selectedProjectId={selectedProjectId}
                        selectedJourneyId={selectedJourneyId}
                        onToggleClient={toggleClient}
                        onToggleProject={toggleProject}
                        onAddProject={handleAddProject}
                        onAddJourney={handleAddJourney}
                        onSelectClient={() => setSelectedClientId(client.id)}
                        onSelectProject={(projectId) => setSelection(client.id, projectId, null)}
                        onSelectJourney={handleSelectJourney}
                        onUpdateClient={updateClient}
                        onUpdateProject={updateProject}
                        onUpdateJourney={updateJourney}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {collapsed && (
                <div className="mt-2 flex flex-col gap-1">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      title={client.name}
                      className={`rounded-xl p-2 ${
                        selectedClientId === client.id ? 'bg-white/80 text-accent font-medium shadow-soft dark:bg-stone-700 dark:shadow-elevated-dark' : 'text-stone-600 hover:bg-sidebar-hover dark:text-stone-400 dark:hover:bg-stone-700'
                      }`}
                    >
                      <span className="block truncate text-xs font-medium">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => setCreateClientModalOpen(true)}
                    className="rounded-xl p-2 text-stone-500 hover:bg-sidebar-hover hover:text-accent dark:text-stone-400 dark:hover:bg-stone-700"
                    title="Add client"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </aside>

      <CreateClientModal isOpen={clientModalOpen} onClose={() => setCreateClientModalOpen(false)} />
      <CreateProjectModal isOpen={projectModalOpen} onClose={() => setCreateProjectModalOpen(false)} />
      <CreateJourneyModal isOpen={journeyModalOpen} onClose={() => setCreateJourneyModalOpen(false)} />
    </>
  );
}

function ClientNode({
  client,
  projects,
  journeys,
  expandedClient,
  expandedProjectIds,
  selectedClientId,
  selectedProjectId,
  selectedJourneyId,
  onToggleClient,
  onToggleProject,
  onAddProject,
  onAddJourney,
  onSelectClient,
  onSelectProject,
  onSelectJourney,
  onUpdateClient,
  onUpdateProject,
  onUpdateJourney,
}: {
  client: Client;
  projects: Project[];
  journeys: Journey[];
  expandedClient: boolean;
  expandedProjectIds: Set<string>;
  selectedClientId: string | null;
  selectedProjectId: string | null;
  selectedJourneyId: string | null;
  onToggleClient: (id: string) => void;
  onToggleProject: (id: string) => void;
  onAddProject: (clientId: string) => void;
  onAddJourney: (projectId: string, clientId: string) => void;
  onSelectClient: () => void;
  onSelectProject: (projectId: string) => void;
  onSelectJourney: (clientId: string, projectId: string, journeyId: string) => void;
  onUpdateClient: (id: string, data: { name?: string }) => void;
  onUpdateProject: (id: string, data: { name?: string }) => void;
  onUpdateJourney: (id: string, data: { name?: string }) => void;
}) {
  const hasProjects = projects.length > 0;

  return (
    <li className="rounded-xl">
      <div className="flex items-center gap-1.5 rounded-xl group">
        <button
          onClick={() => hasProjects && onToggleClient(client.id)}
          className="flex-shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-sidebar-hover hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
          aria-label={expandedClient ? 'Collapse' : 'Expand'}
        >
          {hasProjects ? (
            <svg
              className={`h-4 w-4 transition-transform ${expandedClient ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>
        <EditableName
          value={client.name}
          isSelected={selectedClientId === client.id && !selectedProjectId && !selectedJourneyId}
          onSelect={onSelectClient}
          onSave={(name) => onUpdateClient(client.id, { name })}
        />
        <button
          onClick={() => onAddProject(client.id)}
          className="rounded-xl p-1.5 text-stone-500 opacity-0 group-hover:opacity-100 hover:bg-sidebar-hover hover:text-accent dark:text-stone-400 dark:hover:bg-stone-700"
          aria-label="Add project"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {expandedClient && projects.length > 0 && (
        <ul className="ml-5 mt-1 space-y-1 pl-4">
          {projects.map((project) => {
            const projectJourneys = journeys.filter((j) => j.projectId === project.id);
            const expanded = expandedProjectIds.has(project.id);

            return (
              <li key={project.id} className="rounded-xl">
                <div className="flex items-center gap-1.5 rounded-xl group/project">
                  <button
                    onClick={() => (projectJourneys.length > 0 ? onToggleProject(project.id) : undefined)}
                    className="flex-shrink-0 rounded-lg p-1.5 text-stone-500 hover:bg-sidebar-hover hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                  >
                    {projectJourneys.length > 0 ? (
                      <svg
                        className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    ) : (
                      <span className="inline-block w-3.5" />
                    )}
                  </button>
                  <EditableName
                    value={project.name}
                    isSelected={selectedProjectId === project.id && !selectedJourneyId}
                    onSelect={() => onSelectProject(project.id)}
                    onSave={(name) => onUpdateProject(project.id, { name })}
                    size="sm"
                  />
                  <button
                    onClick={() => onAddJourney(project.id, client.id)}
                    className="rounded-xl p-1.5 text-stone-500 opacity-0 group-hover/project:opacity-100 hover:bg-sidebar-hover hover:text-accent dark:text-stone-400 dark:hover:bg-stone-700"
                    aria-label="Add journey"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {expanded && projectJourneys.length > 0 && (
                  <ul className="ml-5 mt-1 space-y-1 pl-4">
                    {projectJourneys.map((journey) => (
                      <li key={journey.id}>
                        <EditableName
                          value={journey.name}
                          isSelected={selectedJourneyId === journey.id}
                          onSelect={() => onSelectJourney(client.id, project.id, journey.id)}
                          onSave={(name) => onUpdateJourney(journey.id, { name })}
                          size="sm"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function EditableName({
  value,
  isSelected,
  onSelect,
  onSave,
  size = 'base',
}: {
  value: string;
  isSelected: boolean;
  onSelect: () => void;
  onSave: (name: string) => void;
  size?: 'sm' | 'base';
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleBlur = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setDraft(value);
      setEditing(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const textSize = size === 'sm' ? 'text-sm' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-1.5' : 'px-2.5 py-2';

  if (editing) {
    return (
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className={`flex-1 rounded-lg border border-accent bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-accent/30 dark:bg-stone-800 dark:text-stone-100 dark:border-accent ${textSize} ${padding}`}
      />
    );
  }

  return (
    <button
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(value);
        setEditing(true);
      }}
      title="Double-click to edit"
      className={`flex-1 rounded-xl ${padding} text-left transition-colors ${textSize} ${
        isSelected
          ? 'bg-white/80 font-medium text-accent shadow-soft dark:bg-stone-700 dark:shadow-elevated-dark'
          : 'text-stone-700 hover:bg-sidebar-hover dark:text-stone-300 dark:hover:bg-stone-700'
      }`}
    >
      {value}
    </button>
  );
}
