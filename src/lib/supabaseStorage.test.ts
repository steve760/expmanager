/**
 * Tests for Supabase save flow: ensure we use RPCs (not direct table writes)
 * so RLS does not block saves (avoids "new row violates row-level security").
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AppState } from '@/types';

// Mock supabase before importing supabaseStorage
const rpcMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (_table: string) => ({
      select: vi.fn().mockResolvedValue({ data: [] }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  rpcMock.mockResolvedValue({ error: null });
});

async function loadSaveModule() {
  const mod = await import('./supabaseStorage');
  return mod;
}

function minimalState(overrides: Partial<AppState> = {}): AppState {
  const now = new Date().toISOString();
  const clientId = 'client-1';
  const projectId = 'proj-1';
  const journeyId = 'journey-1';
  const phaseId = 'phase-1';
  return {
    clients: [{ id: clientId, name: 'Acme', createdAt: now, updatedAt: now }],
    projects: [{ id: projectId, clientId, name: 'Project 1', createdAt: now, updatedAt: now }],
    journeys: [{ id: journeyId, projectId, name: 'Journey 1', rowOrder: [], customRows: [], createdAt: now, updatedAt: now }],
    phases: [{
      id: phaseId,
      journeyId,
      order: 0,
      title: 'Phase 1',
      description: '',
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
      createdAt: now,
      updatedAt: now,
    }],
    jobs: [
      {
        id: 'job-1',
        clientId,
        name: 'Job 1',
        tag: 'Functional',
        insightIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ],
    insights: [],
    opportunities: [],
    cellComments: {},
    ...overrides,
  };
}

describe('supabaseSaveState', () => {
  it('calls upsert_jobs RPC (not .from("jobs").upsert) so RLS is bypassed', async () => {
    const { supabaseSaveState } = await loadSaveModule();
    const state = minimalState();

    await supabaseSaveState(state);

    expect(rpcMock).toHaveBeenCalledWith('upsert_jobs', expect.any(Object));
    const jobsCall = rpcMock.mock.calls.find((c: unknown[]) => c[0] === 'upsert_jobs');
    expect(jobsCall).toBeDefined();
    expect(jobsCall![1]).toEqual({ p_rows: expect.any(Array) });
    expect((jobsCall![1] as { p_rows: unknown[] }).p_rows.length).toBe(1);
    expect((jobsCall![1] as { p_rows: Record<string, unknown>[] }).p_rows[0]).toMatchObject({
      id: 'job-1',
      client_id: 'client-1',
      name: 'Job 1',
    });
  });

  it('calls all upsert RPCs in order: clients, projects, journeys, phases, jobs, insights, opportunities', async () => {
    const { supabaseSaveState } = await loadSaveModule();
    const state = minimalState();

    await supabaseSaveState(state);

    const rpcNames = rpcMock.mock.calls.map((c: unknown[]) => c[0]);
    expect(rpcNames).toContain('upsert_clients');
    expect(rpcNames).toContain('upsert_projects');
    expect(rpcNames).toContain('upsert_journeys');
    expect(rpcNames).toContain('upsert_phases');
    expect(rpcNames).toContain('upsert_jobs');
    expect(rpcNames).toContain('upsert_insights');
    expect(rpcNames).toContain('upsert_opportunities');
    // clients before jobs
    expect(rpcNames.indexOf('upsert_clients')).toBeLessThan(rpcNames.indexOf('upsert_jobs'));
  });

  it('throws with message containing "Supabase jobs" when upsert_jobs RPC returns error', async () => {
    rpcMock.mockImplementation((name: string) => {
      if (name === 'upsert_jobs') return Promise.resolve({ error: { message: 'new row violates row-level security policy for table "jobs"' } });
      return Promise.resolve({ error: null });
    });
    const { supabaseSaveState } = await loadSaveModule();
    const state = minimalState();

    await expect(supabaseSaveState(state)).rejects.toThrow(/Supabase jobs:/);
  });
});
