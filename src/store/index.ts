import { create } from 'zustand';
import { localStorageStore } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { supabaseGetState, supabaseSaveState } from '@/lib/supabaseStorage';
import { getDemoState } from '@/lib/demoData';
import { getSession, signOut as authSignOut, fetchProfile, fetchOrganisationMembers } from '@/lib/auth';
import type { AppState, Client, Project, Journey, JourneyRow, Phase, CellComment, Opportunity, OpportunityStage, OpportunityTag, Job, Insight, PriorityLevel, Profile, OrganisationMember } from '@/types';
import { generateId, now, extractDomainFromUrl, parseOpportunities, parseCustomerJobs } from '@/lib/utils';
import { commentKey, parseCommentKey } from '@/lib/commentKeys';

const ROW_KEYS = [
  'description', 'phaseHealth', 'customerJobs', 'frontStageActions', 'channels',
  'struggles', 'internalStruggles', 'backStageActions', 'systems', 'relatedProcesses',
  'opportunities', 'relatedDocuments',
];

const INITIAL_STATE: AppState = {
  clients: [],
  projects: [],
  journeys: [],
  phases: [],
  jobs: [],
  insights: [],
  opportunities: [],
  cellComments: {},
};

type UIState = {
  selectedClientId: string | null;
  selectedProjectId: string | null;
  selectedJourneyId: string | null;
  selectedPhaseId: string | null;
  opportunitiesClientId: string | null;
  jobsClientId: string | null;
  altDashboardClientId: string | null;
  /** Client page active tab: 'projects' | 'insights' | 'jobs' | 'opportunities' – used for header action visibility */
  clientPageActiveTab: string | null;
  createClientModalOpen: boolean;
  createProjectModalOpen: boolean;
  createJourneyModalOpen: boolean;
  darkMode: boolean;
  isSignedIn: boolean;
  profile: Profile | null;
  organisationMembers: OrganisationMember[];
  showAdminPanel: boolean;
  /** Last Supabase save error (e.g. delete failed); clear when save succeeds or user dismisses */
  saveError: string | null;
};

type Actions = {
  // Data load/save
  loadState: () => Promise<void>;
  saveState: () => Promise<void>;

  // Client
  createClient: (name: string, description?: string, website?: string) => Client;
  updateClient: (id: string, data: Partial<Pick<Client, 'name' | 'description' | 'website' | 'logoUrl'>>) => void;
  deleteClient: (id: string) => void;

  // Project
  createProject: (clientId: string, name: string, description?: string) => Project;
  updateProject: (id: string, data: Partial<Pick<Project, 'name' | 'description'>>) => void;
  deleteProject: (id: string) => void;

  // Journey
  createJourney: (projectId: string, name: string, description?: string) => Journey;
  updateJourney: (id: string, data: Partial<Pick<Journey, 'name' | 'description' | 'rowOrder' | 'customRows'>>) => void;
  deleteJourney: (id: string) => void;
  addJourneyRow: (journeyId: string, label: string) => JourneyRow;
  updateJourneyRow: (journeyId: string, rowId: string, label: string) => void;
  deleteJourneyRow: (journeyId: string, rowId: string) => void;
  reorderJourneyRows: (journeyId: string, rowOrder: string[]) => void;

  // Phase
  createPhase: (journeyId: string) => Phase;
  updatePhase: (id: string, data: Partial<Omit<Phase, 'id' | 'journeyId' | 'createdAt'>>) => void;
  deletePhase: (id: string) => void;
  reorderPhases: (journeyId: string, phaseIds: string[]) => void;

  // Jobs (top-level, client-scoped)
  createJob: (clientId: string, data: Partial<Pick<Job, 'name' | 'description' | 'tag' | 'priority' | 'struggles' | 'functionalDimensions' | 'socialDimensions' | 'emotionalDimensions' | 'solutionsAndWorkarounds' | 'isPriority' | 'insightIds'>>) => Job;
  updateJob: (id: string, data: Partial<Omit<Job, 'id' | 'clientId' | 'createdAt'>>) => void;
  deleteJob: (id: string) => void;

  // Insights (client-scoped, linkable to Jobs)
  createInsight: (clientId: string, data: Partial<Pick<Insight, 'title' | 'description' | 'priority'>>) => Insight;
  updateInsight: (id: string, data: Partial<Omit<Insight, 'id' | 'clientId' | 'createdAt'>>) => void;
  deleteInsight: (id: string) => void;
  reorderInsights: (clientId: string, orderedIds: string[]) => void;

  // Cell comments (key: phaseId::rowKey)
  setCellComment: (key: string, comment: string) => void;
  addCellCommentReply: (key: string, reply: string) => void;
  deleteCellComment: (key: string) => void;

  // UI selection
  setSelectedClientId: (id: string | null) => void;
  setSelectedProjectId: (id: string | null) => void;
  setSelectedJourneyId: (id: string | null) => void;
  setSelectedPhaseId: (id: string | null) => void;
  setSelection: (clientId: string | null, projectId: string | null, journeyId: string | null) => void;
  goHome: () => void;
  setCreateClientModalOpen: (v: boolean) => void;
  setCreateProjectModalOpen: (v: boolean) => void;
  setCreateJourneyModalOpen: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;
  setSignedIn: (v: boolean) => void;
  initAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  setProfile: (p: Profile | null) => void;
  setOrganisationMembers: (m: OrganisationMember[]) => void;
  setShowAdminPanel: (v: boolean) => void;
  setSaveError: (msg: string | null) => void;
  setOpportunitiesClientId: (id: string | null) => void;
  setJobsClientId: (id: string | null) => void;
  setAltDashboardClientId: (id: string | null) => void;
  setClientPageActiveTab: (tab: string | null) => void;

  // Opportunities (top-level, client-scoped)
  createOpportunity: (data: {
    clientId: string;
    projectId: string;
    journeyId: string;
    phaseId: string;
    name: string;
    priority?: OpportunityTag;
    description?: string;
    pointOfDifferentiation?: string;
    criticalAssumptions?: string;
    linkedJobIds?: string[];
    isPriority?: boolean;
  }) => Opportunity;
  updateOpportunity: (id: string, data: Partial<Omit<Opportunity, 'id' | 'clientId' | 'createdAt'>>) => void;
  deleteOpportunity: (id: string) => void;
  moveOpportunityToStage: (id: string, stage: OpportunityStage, insertIndex?: number) => void;
  reorderOpportunitiesInStage: (clientId: string, stage: OpportunityStage, orderedIds: string[]) => void;
};

export const useStore = create<AppState & UIState & Actions>((set, get) => ({
  ...INITIAL_STATE,
  selectedClientId: null,
  selectedProjectId: null,
  selectedJourneyId: null,
  selectedPhaseId: null,
  opportunitiesClientId: null,
  jobsClientId: null,
  altDashboardClientId: null,
  clientPageActiveTab: null,
  createClientModalOpen: false,
  createProjectModalOpen: false,
  createJourneyModalOpen: false,
  darkMode: (() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('expmanager-dark');
      return saved === null ? false : saved === 'true';
    } catch {
      return false;
    }
  })(),
  isSignedIn: (() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('expmanager-signed-in') === 'true';
    } catch {
      return false;
    }
  })(),
  profile: null as Profile | null,
  organisationMembers: [] as OrganisationMember[],
  showAdminPanel: false,
  saveError: null as string | null,

  setShowAdminPanel: (v) => set({ showAdminPanel: v }),
  setSaveError: (msg: string | null) => set({ saveError: msg }),

  initAuth: async () => {
    if (isSupabaseConfigured()) {
      const session = await getSession();
      if (session?.user?.id) {
        const profile = await fetchProfile(session.user.id);
        const organisationMembers = await fetchOrganisationMembers(session.user.id);
        set({ profile, organisationMembers, isSignedIn: true });
        try {
          localStorage.setItem('expmanager-signed-in', 'true');
        } catch {}
        await get().loadState();
        return;
      }
      set({ profile: null, organisationMembers: [], isSignedIn: false });
      try {
        localStorage.setItem('expmanager-signed-in', 'false');
      } catch {}
      return;
    }
    try {
      const signedIn = localStorage.getItem('expmanager-signed-in') === 'true';
      set({ isSignedIn: signedIn, profile: null, organisationMembers: [] });
      if (signedIn) await get().loadState();
    } catch {
      await get().loadState();
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured()) {
      await authSignOut();
      set({
        ...INITIAL_STATE,
        selectedClientId: null,
        selectedProjectId: null,
        selectedJourneyId: null,
        selectedPhaseId: null,
        opportunitiesClientId: null,
        jobsClientId: null,
        altDashboardClientId: null,
        clientPageActiveTab: null,
        createClientModalOpen: false,
        createProjectModalOpen: false,
        createJourneyModalOpen: false,
        isSignedIn: false,
        profile: null,
        organisationMembers: [],
        showAdminPanel: false,
      });
      try {
        localStorage.setItem('expmanager-signed-in', 'false');
      } catch {}
      return;
    }
    set({ isSignedIn: false, profile: null, organisationMembers: [] });
    try {
      localStorage.setItem('expmanager-signed-in', 'false');
    } catch {}
  },

  setProfile: (p) => set({ profile: p }),
  setOrganisationMembers: (m) => set({ organisationMembers: m }),

  loadState: async () => {
    try {
      const savedDark = localStorage.getItem('expmanager-dark');
      if (savedDark !== null) set({ darkMode: savedDark === 'true' });
    } catch {}
    let state: AppState | null = null;
    if (isSupabaseConfigured()) {
      try {
        state = await supabaseGetState();
      } catch (err) {
        console.warn('Supabase load failed, falling back to localStorage', err);
      }
    }
    if (!state) {
      state = await localStorageStore.getState();
    }
    if (!state) {
      state = getDemoState();
      if (isSupabaseConfigured()) {
        try {
          await supabaseSaveState(state);
        } catch (e) {
          console.warn('Supabase initial save failed', e);
        }
      } else {
        await localStorageStore.saveState(state);
      }
    }
    const phases = (state.phases ?? []).map((p: Phase) => ({
      ...p,
      systems: p.systems ?? '',
    }));
    const rawComments = state.cellComments ?? {};
    const cellComments: Record<string, CellComment> = {};
    const normalize = (v: unknown): CellComment => {
      if (typeof v === 'string') return { text: v, replies: [] };
      if (v && typeof v === 'object' && 'text' in v && typeof (v as { text: unknown }).text === 'string') {
        const obj = v as { text: string; replies?: string[] };
        return { text: obj.text, replies: Array.isArray(obj.replies) ? obj.replies : [] };
      }
      return { text: '', replies: [] };
    };
    for (const [key, val] of Object.entries(rawComments)) {
      let finalKey = key;
      if (!key.includes('::')) {
        for (const rk of ROW_KEYS) {
          if (key.endsWith('-' + rk)) {
            finalKey = commentKey(key.slice(0, key.length - rk.length - 1), rk);
            break;
          }
        }
      }
      cellComments[finalKey] = normalize(val);
    }
    const journeys = (state.journeys ?? []).map((j: Journey) => {
      let rowOrder = j.rowOrder ?? [...ROW_KEYS];
      if (!rowOrder.includes('phaseHealth')) {
        const descIdx = rowOrder.indexOf('description');
        rowOrder = descIdx >= 0
          ? [...rowOrder.slice(0, descIdx + 1), 'phaseHealth', ...rowOrder.slice(descIdx + 1)]
          : ['phaseHealth', ...rowOrder];
      }
      return { ...j, rowOrder, customRows: j.customRows ?? [] };
    });
    const phasesWithCustom = phases.map((p: Phase) => ({
      ...p,
      jobIds: p.jobIds ?? [],
      internalStruggles: p.internalStruggles ?? '',
      relatedDocuments: p.relatedDocuments ?? '',
      customRowValues: p.customRowValues ?? {},
    }));

    let jobs: Job[] = state.jobs ?? [];
    let finalPhases = phasesWithCustom;
    if (jobs.length === 0 && phasesWithCustom.length > 0) {
      const migratedJobs: Job[] = [];
      const t = now();
      finalPhases = phasesWithCustom.map((phase: Phase) => {
        const journey = journeys.find((j: Journey) => j.id === phase.journeyId);
        const project = journey ? state.projects?.find((pr: { id: string }) => pr.id === journey.projectId) : null;
        const clientId = project?.clientId;
        if (!clientId) return { ...phase, jobIds: phase.jobIds ?? [] };
        const legacy = parseCustomerJobs(phase.customerJobs ?? '');
        const phaseJobIds: string[] = [];
        for (const item of legacy) {
          const job: Job = {
            id: generateId(),
            clientId,
            name: item.name ?? item.text ?? 'Untitled job',
            description: item.description,
            tag: (item.tag ?? 'Functional') as Job['tag'],
            priority: (item.isPriority ? 'High' : 'Medium') as import('@/types').PriorityLevel,
            struggles: item.struggles,
            functionalDimensions: item.functionalDimensions,
            socialDimensions: item.socialDimensions,
            emotionalDimensions: item.emotionalDimensions,
            solutionsAndWorkarounds: item.solutionsAndWorkarounds,
            isPriority: item.isPriority ?? false,
            insightIds: [],
            createdAt: t,
            updatedAt: t,
          };
          migratedJobs.push(job);
          phaseJobIds.push(job.id);
        }
        return { ...phase, jobIds: phaseJobIds, customerJobs: '', customRowValues: phase.customRowValues ?? {} };
      });
      jobs = migratedJobs;
    }

    // Migrate phase-embedded opportunities to top-level (one-time)
    let opportunities: Opportunity[] = state.opportunities ?? [];
    if (opportunities.length === 0 && phasesWithCustom.length > 0) {
      const migrated: Opportunity[] = [];
      const t = now();
      for (const phase of phasesWithCustom) {
        const journey = journeys.find((j: Journey) => j.id === phase.journeyId);
        const project = journey ? state.projects?.find((pr: { id: string }) => pr.id === journey.projectId) : null;
        const clientId = project?.clientId;
        if (!clientId || !journey || !project) continue;
        const items = parseOpportunities(phase.opportunities ?? '');
        items.forEach((item, idx) => {
          migrated.push({
            id: item.id,
            clientId,
            projectId: project.id,
            journeyId: journey.id,
            phaseId: phase.id,
            stage: 'Backlog',
            stageOrder: idx,
            name: item.name,
            priority: (item.tag as OpportunityTag) || 'High',
            description: item.description ?? '',
            pointOfDifferentiation: item.pointOfDifferentiation ?? '',
            criticalAssumptions: item.criticalAssumptions ?? '',
            linkedJobIds: [],
            isPriority: !!item.isPriority,
            createdAt: t,
            updatedAt: t,
          });
        });
      }
      if (migrated.length > 0) {
        opportunities = migrated;
        // Distribute demo opportunities across Horizon 1 (Q2), 2 (Q3), 3 (Q4)
        const H1 = 'Horizon 1' as OpportunityStage;
        const H2 = 'Horizon 2' as OpportunityStage;
        const H3 = 'Horizon 3' as OpportunityStage;
        opportunities = opportunities.map((o, i) => {
          const base = { ...o, linkedJobIds: o.linkedJobIds ?? [] };
          if (i < 4) return { ...base, stage: H1, stageOrder: i, updatedAt: now() };
          if (i < 8) return { ...base, stage: H2, stageOrder: i - 4, updatedAt: now() };
          if (i < 12) return { ...base, stage: H3, stageOrder: i - 8, updatedAt: now() };
          return base;
        });
        for (let i = 0; i < phasesWithCustom.length; i++) {
          const p = phasesWithCustom[i] as Phase;
          if (opportunities.some((o) => o.phaseId === p.id)) {
            phasesWithCustom[i] = { ...p, opportunities: '', updatedAt: now(), customRowValues: p.customRowValues ?? {} };
          }
        }
      }
    }

    // Migrate old stage values to new stages
    const stageMap: Record<string, OpportunityStage> = {
      Unallocated: 'Backlog',
      'In analysis': 'In discovery',
    };
    opportunities = opportunities.map((o) => {
      const base = { ...o, linkedJobIds: o.linkedJobIds ?? [] };
      const newStage = stageMap[o.stage];
      if (newStage) return { ...base, stage: newStage, updatedAt: now() };
      return base;
    });

    // Normalize jobs: add priority and insightIds if missing
    jobs = jobs.map((j) => ({
      ...j,
      priority: j.priority ?? (j.isPriority ? 'High' : 'Medium'),
      insightIds: j.insightIds ?? [],
    }));

    let insights: Insight[] = (state.insights ?? []).map((i: Insight, idx: number) => ({
      ...i,
      title: i.title ?? 'Untitled insight',
      description: i.description ?? '',
      priority: i.priority ?? 'Medium',
      order: i.order ?? idx,
    }));
    // Migrate: if no insights but we have clients, inject demo insights
    if (insights.length === 0 && (state.clients ?? []).length > 0) {
      const demo = getDemoState();
      insights = demo.insights ?? [];
    }

    // Migrate: if no jobs but we have clients, inject demo jobs (e.g. old persisted state without jobs)
    if (jobs.length === 0 && (state.clients ?? []).length > 0) {
      const demo = getDemoState();
      jobs = demo.jobs ?? [];
    }

    const needsSave =
      (insights.length > 0 && (state.insights ?? []).length === 0) ||
      (jobs.length > 0 && (state.jobs ?? []).length === 0);
    set({
      clients: state.clients ?? [],
      projects: state.projects ?? [],
      journeys,
      phases: finalPhases,
      jobs,
      insights,
      opportunities,
      cellComments,
    });
    if (needsSave) get().saveState();
  },

  saveState: async () => {
    const { clients, projects, journeys, phases, jobs, insights, opportunities, cellComments } = get();
    const state = { clients, projects, journeys, phases, jobs, insights, opportunities, cellComments };
    if (isSupabaseConfigured()) {
      try {
        get().setSaveError(null);
        await supabaseSaveState(state);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Supabase save failed', err);
        get().setSaveError(message);
        throw err;
      }
    } else {
      get().setSaveError(null);
      await localStorageStore.saveState(state);
    }
  },

  createClient: (name: string, description?: string, website?: string) => {
    const domain = website ? extractDomainFromUrl(website) : null;
    const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : undefined;
    const client: Client = {
      id: generateId(),
      name,
      description,
      website: website?.trim() || undefined,
      logoUrl,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ clients: [...s.clients, client] }));
    get().saveState();
    return client;
  },

  updateClient: (id: string, data) => {
    set((s) => ({
      clients: s.clients.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: now() } : c
      ),
    }));
    get().saveState();
  },

  deleteClient: (id: string) => {
    const { projects, journeys, phases } = get();
    const projectIds = projects.filter((p) => p.clientId === id).map((p) => p.id);
    const journeyIds = journeys.filter((j) => projectIds.includes(j.projectId)).map((j) => j.id);
    const phaseIdsToRemove = phases.filter((p) => journeyIds.includes(p.journeyId)).map((p) => p.id);
    const selPhase = phases.find((p) => p.id === get().selectedPhaseId);
    const clearPhase = selPhase && journeyIds.includes(selPhase.journeyId);
    set((s) => {
      const nextComments = { ...s.cellComments };
      for (const key of Object.keys(nextComments)) {
        const parsed = parseCommentKey(key);
        if (parsed && phaseIdsToRemove.includes(parsed.phaseId)) delete nextComments[key];
      }
      return {
        clients: s.clients.filter((c) => c.id !== id),
        projects: s.projects.filter((p) => p.clientId !== id),
        journeys: s.journeys.filter((j) => !projectIds.includes(j.projectId)),
        phases: s.phases.filter((p) => !journeyIds.includes(p.journeyId)),
        jobs: s.jobs.filter((j) => j.clientId !== id),
        insights: s.insights.filter((i) => i.clientId !== id),
        opportunities: s.opportunities.filter((o) => o.clientId !== id),
        cellComments: nextComments,
        selectedClientId: s.selectedClientId === id ? null : s.selectedClientId,
        selectedProjectId: s.selectedProjectId && projectIds.includes(s.selectedProjectId) ? null : s.selectedProjectId,
        selectedJourneyId: s.selectedJourneyId && journeyIds.includes(s.selectedJourneyId) ? null : s.selectedJourneyId,
        selectedPhaseId: clearPhase ? null : s.selectedPhaseId,
      };
    });
    get().saveState();
  },

  createProject: (clientId: string, name: string, description?: string) => {
    const project: Project = {
      id: generateId(),
      clientId,
      name,
      description,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ projects: [...s.projects, project] }));
    get().saveState();
    return project;
  },

  updateProject: (id: string, data) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: now() } : p
      ),
    }));
    get().saveState();
  },

  deleteProject: (id: string) => {
    const { journeys, phases } = get();
    const journeyIds = journeys.filter((j) => j.projectId === id).map((j) => j.id);
    const phaseIdsToRemove = phases.filter((p) => journeyIds.includes(p.journeyId)).map((p) => p.id);
    const selPhase = phases.find((p) => p.id === get().selectedPhaseId);
    const clearPhase = selPhase && journeyIds.includes(selPhase.journeyId);
    set((s) => {
      const nextComments = { ...s.cellComments };
      for (const key of Object.keys(nextComments)) {
        const parsed = parseCommentKey(key);
        if (parsed && phaseIdsToRemove.includes(parsed.phaseId)) delete nextComments[key];
      }
      return {
        projects: s.projects.filter((p) => p.id !== id),
        journeys: s.journeys.filter((j) => j.projectId !== id),
        phases: s.phases.filter((p) => !journeyIds.includes(p.journeyId)),
        opportunities: s.opportunities.filter((o) => !phaseIdsToRemove.includes(o.phaseId)),
        cellComments: nextComments,
        selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
        selectedJourneyId: s.selectedJourneyId && journeyIds.includes(s.selectedJourneyId) ? null : s.selectedJourneyId,
        selectedPhaseId: clearPhase ? null : s.selectedPhaseId,
      };
    });
    get().saveState();
  },

  createJourney: (projectId: string, name: string, description?: string) => {
    const journey: Journey = {
      id: generateId(),
      projectId,
      name,
      description,
      rowOrder: [...ROW_KEYS],
      customRows: [],
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ journeys: [...s.journeys, journey] }));
    get().saveState();
    return journey;
  },

  updateJourney: (id: string, data) => {
    set((s) => ({
      journeys: s.journeys.map((j) =>
        j.id === id ? { ...j, ...data, updatedAt: now() } : j
      ),
    }));
    get().saveState();
  },

  deleteJourney: (id: string) => {
    set((s) => {
      const phaseIdsToRemove = s.phases.filter((p) => p.journeyId === id).map((p) => p.id);
      const nextComments = { ...s.cellComments };
      for (const key of Object.keys(nextComments)) {
        const parsed = parseCommentKey(key);
        if (parsed && phaseIdsToRemove.includes(parsed.phaseId)) delete nextComments[key];
      }
      return {
        journeys: s.journeys.filter((j) => j.id !== id),
        phases: s.phases.filter((p) => p.journeyId !== id),
        opportunities: s.opportunities.filter((o) => !phaseIdsToRemove.includes(o.phaseId)),
        cellComments: nextComments,
        selectedJourneyId: s.selectedJourneyId === id ? null : s.selectedJourneyId,
        selectedPhaseId: s.selectedPhaseId && phaseIdsToRemove.includes(s.selectedPhaseId) ? null : s.selectedPhaseId,
      };
    });
    get().saveState();
  },

  addJourneyRow: (journeyId: string, label: string) => {
    const row: JourneyRow = { id: generateId(), label: label.trim() || 'New row' };
    set((s) => {
      const journey = s.journeys.find((j) => j.id === journeyId);
      if (!journey) return {};
      const customRows = [...(journey.customRows ?? []), row];
      const rowOrder = [...(journey.rowOrder ?? ROW_KEYS), row.id];
      return {
        journeys: s.journeys.map((j) =>
          j.id === journeyId ? { ...j, customRows, rowOrder, updatedAt: now() } : j
        ),
      };
    });
    get().saveState();
    return row;
  },

  updateJourneyRow: (journeyId: string, rowId: string, label: string) => {
    set((s) => ({
      journeys: s.journeys.map((j) =>
        j.id === journeyId
          ? {
              ...j,
              customRows: (j.customRows ?? []).map((r) =>
                r.id === rowId ? { ...r, label: label.trim() || r.label } : r
              ),
              updatedAt: now(),
            }
          : j
      ),
    }));
    get().saveState();
  },

  deleteJourneyRow: (journeyId: string, rowId: string) => {
    set((s) => {
      const journey = s.journeys.find((j) => j.id === journeyId);
      if (!journey) return {};
      const rowOrder = (journey.rowOrder ?? ROW_KEYS).filter((id) => id !== rowId);
      const customRows = (journey.customRows ?? []).filter((r) => r.id !== rowId);
      const phases = s.phases.map((p) => {
        if (p.journeyId !== journeyId) return p;
        const next = { ...(p.customRowValues ?? {}) };
        delete next[rowId];
        return { ...p, customRowValues: next, updatedAt: now() };
      });
      const cellComments = { ...s.cellComments };
      const sep = '::';
      for (const key of Object.keys(cellComments)) {
        const idx = key.indexOf(sep);
        if (idx !== -1 && key.slice(idx + sep.length) === rowId) delete cellComments[key];
      }
      return {
        journeys: s.journeys.map((j) =>
          j.id === journeyId ? { ...j, rowOrder, customRows, updatedAt: now() } : j
        ),
        phases,
        cellComments,
      };
    });
    get().saveState();
  },

  reorderJourneyRows: (journeyId: string, rowOrder: string[]) => {
    set((s) => ({
      journeys: s.journeys.map((j) =>
        j.id === journeyId ? { ...j, rowOrder, updatedAt: now() } : j
      ),
    }));
    get().saveState();
  },

  createPhase: (journeyId: string) => {
    const phases = get().phases.filter((p) => p.journeyId === journeyId);
    const maxOrder = phases.length === 0 ? 0 : Math.max(...phases.map((p) => p.order));
    const phase: Phase = {
      id: generateId(),
      journeyId,
      order: maxOrder + 1,
      title: 'New Phase',
      description: '',
      imageUrl: '',
      struggles: '',
      internalStruggles: '',
      opportunities: '',
      frontStageActions: '',
      backStageActions: '',
      systems: '',
      relatedProcesses: '',
      channels: '',
      jobIds: [],
      relatedDocuments: '',
      customRowValues: {},
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ phases: [...s.phases, phase] }));
    get().saveState();
    return phase;
  },

  updatePhase: (id: string, data) => {
    set((s) => ({
      phases: s.phases.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: now() } : p
      ),
    }));
    get().saveState();
  },

  deletePhase: (id: string) => {
    const phase = get().phases.find((p) => p.id === id);
    if (!phase) return;
    set((s) => {
      const nextComments = { ...s.cellComments };
      for (const key of Object.keys(nextComments)) {
        const parsed = parseCommentKey(key);
        if (parsed && parsed.phaseId === id) delete nextComments[key];
      }
      return {
        phases: s.phases.filter((p) => p.id !== id),
        opportunities: s.opportunities.filter((o) => o.phaseId !== id),
        cellComments: nextComments,
        selectedPhaseId: s.selectedPhaseId === id ? null : s.selectedPhaseId,
      };
    });
    get().saveState();
  },

  reorderPhases: (journeyId: string, phaseIds: string[]) => {
    set((s) => {
      const updated = s.phases.map((p) => {
        if (p.journeyId !== journeyId) return p;
        const idx = phaseIds.indexOf(p.id);
        if (idx === -1) return p;
        return { ...p, order: idx, updatedAt: now() };
      });
      return { phases: updated };
    });
    get().saveState();
  },

  createJob: (clientId: string, data) => {
    const job: Job = {
      id: generateId(),
      clientId,
      name: data.name ?? 'Untitled job',
      description: data.description,
      tag: data.tag ?? 'Functional',
      priority: (data.priority as PriorityLevel) ?? 'Medium',
      struggles: data.struggles,
      functionalDimensions: data.functionalDimensions,
      socialDimensions: data.socialDimensions,
      emotionalDimensions: data.emotionalDimensions,
      solutionsAndWorkarounds: data.solutionsAndWorkarounds,
      isPriority: data.isPriority ?? false,
      insightIds: data.insightIds ?? [],
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ jobs: [...s.jobs, job] }));
    get().saveState();
    return job;
  },

  updateJob: (id: string, data) => {
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === id ? { ...j, ...data, updatedAt: now() } : j
      ),
    }));
    get().saveState();
  },

  deleteJob: (id: string) => {
    set((s) => ({
      jobs: s.jobs.filter((j) => j.id !== id),
      phases: s.phases.map((p) => ({
        ...p,
        jobIds: (p.jobIds ?? []).filter((jid) => jid !== id),
        updatedAt: now(),
      })),
      opportunities: s.opportunities.map((o) => ({
        ...o,
        linkedJobIds: (o.linkedJobIds ?? []).filter((jid) => jid !== id),
        updatedAt: now(),
      })),
    }));
    get().saveState();
  },

  createInsight: (clientId: string, data) => {
    const clientInsights = (get().insights ?? []).filter((i) => i.clientId === clientId);
    const maxOrder = clientInsights.reduce((m, i) => Math.max(m, i.order ?? 0), 0);
    const insight: Insight = {
      id: generateId(),
      clientId,
      title: data.title ?? 'Untitled insight',
      description: data.description,
      priority: (data.priority as PriorityLevel) ?? 'Medium',
      order: maxOrder + 1,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => ({ insights: [...(s.insights ?? []), insight] }));
    get().saveState();
    return insight;
  },

  updateInsight: (id: string, data) => {
    set((s) => ({
      insights: (s.insights ?? []).map((i) =>
        i.id === id ? { ...i, ...data, updatedAt: now() } : i
      ),
    }));
    get().saveState();
  },

  deleteInsight: (id: string) => {
    set((s) => ({
      insights: (s.insights ?? []).filter((i) => i.id !== id),
      jobs: s.jobs.map((j) => ({
        ...j,
        insightIds: (j.insightIds ?? []).filter((iid) => iid !== id),
        updatedAt: now(),
      })),
    }));
    get().saveState();
  },

  reorderInsights: (clientId: string, orderedIds: string[]) => {
    set((s) => {
      const idToOrder = new Map(orderedIds.map((id, i) => [id, i]));
      return {
        insights: (s.insights ?? []).map((i) =>
          i.clientId === clientId && idToOrder.has(i.id)
            ? { ...i, order: idToOrder.get(i.id)!, updatedAt: now() }
            : i
        ),
      };
    });
    get().saveState();
  },

  setCellComment: (key: string, comment: string) => {
    set((s) => ({
      cellComments: {
        ...s.cellComments,
        [key]: { text: comment, replies: s.cellComments[key]?.replies ?? [] },
      },
    }));
    get().saveState();
  },
  addCellCommentReply: (key: string, reply: string) => {
    set((s) => {
      const current = s.cellComments[key];
      const replies = [...(current?.replies ?? []), reply];
      return {
        cellComments: {
          ...s.cellComments,
          [key]: { text: current?.text ?? '', replies },
        },
      };
    });
    get().saveState();
  },
  deleteCellComment: (key: string) => {
    set((s) => {
      const next = { ...s.cellComments };
      delete next[key];
      return { cellComments: next };
    });
    get().saveState();
  },

  setSelectedClientId: (id) => set({
    selectedClientId: id,
    selectedProjectId: null,
    selectedJourneyId: null,
    selectedPhaseId: null,
    ...(id != null && { altDashboardClientId: null }),
  }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id, selectedJourneyId: null, selectedPhaseId: null }),
  setSelectedJourneyId: (id) => set({ selectedJourneyId: id, selectedPhaseId: null }),
  setSelectedPhaseId: (id) => set({ selectedPhaseId: id }),
  setSelection: (clientId, projectId, journeyId) =>
    set({
      selectedClientId: clientId,
      selectedProjectId: projectId,
      selectedJourneyId: journeyId,
      selectedPhaseId: null,
      ...(clientId === null && { opportunitiesClientId: null, jobsClientId: null, altDashboardClientId: null }),
      ...(projectId != null && { altDashboardClientId: null }),
    }),
  goHome: () =>
    set({ selectedClientId: null, selectedProjectId: null, selectedJourneyId: null, selectedPhaseId: null, opportunitiesClientId: null, jobsClientId: null, altDashboardClientId: null }),
  setCreateClientModalOpen: (v) => set({ createClientModalOpen: v }),
  setCreateProjectModalOpen: (v) => set({ createProjectModalOpen: v }),
  setCreateJourneyModalOpen: (v) => set({ createJourneyModalOpen: v }),
  setDarkMode: (v) => {
    set({ darkMode: v });
    try {
      localStorage.setItem('expmanager-dark', String(v));
      document.documentElement.classList.toggle('dark', v);
    } catch {}
  },
  setSignedIn: (v) => {
    set({ isSignedIn: v });
    try {
      localStorage.setItem('expmanager-signed-in', String(v));
    } catch {}
  },
  setOpportunitiesClientId: (id) =>
    set((s) =>
      id != null
        ? { opportunitiesClientId: id, jobsClientId: null, altDashboardClientId: null }
        : { opportunitiesClientId: null, jobsClientId: null, altDashboardClientId: s.opportunitiesClientId ?? null }
    ),
  setJobsClientId: (id) =>
    set((s) =>
      id != null
        ? { jobsClientId: id, opportunitiesClientId: null, altDashboardClientId: null }
        : { jobsClientId: null, opportunitiesClientId: null, altDashboardClientId: s.jobsClientId ?? null }
    ),
  setAltDashboardClientId: (id) =>
    set({ altDashboardClientId: id, opportunitiesClientId: null, jobsClientId: null }),

  setClientPageActiveTab: (tab) => set({ clientPageActiveTab: tab }),

  createOpportunity: (data) => {
    const { projects } = get();
    const project = projects.find((p) => p.id === data.projectId);
    const clientId = project?.clientId ?? data.clientId;
    if (!clientId || !project) throw new Error('Invalid project or client');

    const stage = 'Backlog';

    const opp: Opportunity = {
      id: generateId(),
      clientId,
      projectId: data.projectId,
      journeyId: data.journeyId,
      phaseId: data.phaseId,
      stage,
      stageOrder: 0,
      name: data.name.trim() || 'Untitled',
      priority: data.priority ?? 'High',
      description: data.description ?? '',
      pointOfDifferentiation: data.pointOfDifferentiation ?? '',
      criticalAssumptions: data.criticalAssumptions ?? '',
      linkedJobIds: data.linkedJobIds ?? [],
      isPriority: data.isPriority ?? false,
      createdAt: now(),
      updatedAt: now(),
    };
    set((s) => {
      const othersInStage = s.opportunities
        .filter((o) => o.clientId === clientId && o.stage === 'Backlog')
        .sort((a, b) => a.stageOrder - b.stageOrder)
        .map((o, i) => ({ ...o, stageOrder: i + 1, updatedAt: now() }));
      const rest = s.opportunities.filter((o) => o.clientId !== clientId || o.stage !== stage);
      return { opportunities: [...rest, opp, ...othersInStage] };
    });
    get().saveState();
    return opp;
  },

  updateOpportunity: (id, data) => {
    set((s) => ({
      opportunities: s.opportunities.map((o) =>
        o.id === id ? { ...o, ...data, updatedAt: now() } : o
      ),
    }));
    get().saveState();
  },

  deleteOpportunity: (id) => {
    set((s) => ({ opportunities: s.opportunities.filter((o) => o.id !== id) }));
    get().saveState();
  },

  moveOpportunityToStage: (id, stage, insertIndex = 0) => {
    set((s) => {
      const opp = s.opportunities.find((o) => o.id === id);
      if (!opp) return {};
      const clientId = opp.clientId;

      const othersInSrc = s.opportunities
        .filter((o) => o.clientId === clientId && o.stage === opp.stage && o.id !== id)
        .sort((a, b) => a.stageOrder - b.stageOrder)
        .map((o, i) => ({ ...o, stageOrder: i, updatedAt: now() }));

      const othersInDest = s.opportunities
        .filter((o) => o.clientId === clientId && o.stage === stage && o.id !== id)
        .sort((a, b) => a.stageOrder - b.stageOrder);

      const destWithNew = [
        ...othersInDest.slice(0, insertIndex),
        { ...opp, stage, stageOrder: insertIndex, updatedAt: now() },
        ...othersInDest.slice(insertIndex),
      ].map((o, i) => ({ ...o, stageOrder: i, updatedAt: now() }));

      const rest = s.opportunities.filter((o) => o.clientId !== clientId || (o.stage !== opp.stage && o.stage !== stage));
      return { opportunities: [...rest, ...othersInSrc, ...destWithNew] };
    });
    get().saveState();
  },

  reorderOpportunitiesInStage: (clientId, stage, orderedIds) => {
    set((s) => {
      const inStage = s.opportunities.filter((o) => o.clientId === clientId && o.stage === stage);
      const idSet = new Set(orderedIds);
      const ordered = orderedIds
        .filter((id) => inStage.some((o) => o.id === id))
        .map((id) => inStage.find((o) => o.id === id)!);
      const restOfStage = inStage.filter((o) => !idSet.has(o.id)).sort((a, b) => a.stageOrder - b.stageOrder);
      const reordered = [...ordered, ...restOfStage].map((o, i) => ({ ...o, stageOrder: i, updatedAt: now() }));

      const rest = s.opportunities.filter((o) => o.clientId !== clientId || o.stage !== stage);
      return { opportunities: [...rest, ...reordered] };
    });
    get().saveState();
  },
}));
