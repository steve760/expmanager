/**
 * Supabase-backed persistence for AppState.
 * Maps between app (camelCase) and DB (snake_case). Uses upsert for save.
 */

import { supabase } from '@/lib/supabase';
import type { AppState, Client, Project, Journey, Phase, Job, Insight, Opportunity, CellComment } from '@/types';

// —— Map app (camelCase) ↔ DB (snake_case) ——

function clientToDb(c: Client) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    website: c.website ?? null,
    logo_url: c.logoUrl ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}
function clientFromDb(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    website: (r.website as string) ?? undefined,
    logoUrl: (r.logo_url as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function projectToDb(p: Project) {
  return {
    id: p.id,
    client_id: p.clientId,
    name: p.name,
    description: p.description ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
function projectFromDb(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function journeyToDb(j: Journey) {
  return {
    id: j.id,
    project_id: j.projectId,
    name: j.name,
    description: j.description ?? null,
    row_order: j.rowOrder ?? null,
    custom_rows: j.customRows ?? [],
    created_at: j.createdAt,
    updated_at: j.updatedAt,
  };
}
function journeyFromDb(r: Record<string, unknown>): Journey {
  let rowOrder: string[] | undefined;
  const raw = r.row_order;
  if (Array.isArray(raw)) {
    rowOrder = raw as string[];
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      rowOrder = Array.isArray(parsed) ? (parsed as string[]) : undefined;
    } catch {
      rowOrder = undefined;
    }
  }
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    rowOrder: rowOrder ?? undefined,
    customRows: (r.custom_rows as Journey['customRows']) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function phaseToDb(p: Phase) {
  return {
    id: p.id,
    journey_id: p.journeyId,
    order: p.order,
    title: p.title,
    description: p.description ?? '',
    image_url: p.imageUrl ?? null,
    struggles: p.struggles ?? '',
    internal_struggles: p.internalStruggles ?? '',
    opportunities: p.opportunities ?? '',
    front_stage_actions: p.frontStageActions ?? '',
    back_stage_actions: p.backStageActions ?? '',
    systems: p.systems ?? '',
    related_processes: p.relatedProcesses ?? '',
    channels: p.channels ?? '',
    job_ids: p.jobIds ?? [],
    related_documents: p.relatedDocuments ?? '',
    custom_row_values: p.customRowValues ?? {},
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
function phaseFromDb(r: Record<string, unknown>): Phase {
  return {
    id: r.id as string,
    journeyId: r.journey_id as string,
    order: r.order as number,
    title: (r.title as string) ?? '',
    description: (r.description as string) ?? '',
    imageUrl: (r.image_url as string) ?? undefined,
    struggles: (r.struggles as string) ?? '',
    internalStruggles: (r.internal_struggles as string) ?? '',
    opportunities: (r.opportunities as string) ?? '',
    frontStageActions: (r.front_stage_actions as string) ?? '',
    backStageActions: (r.back_stage_actions as string) ?? '',
    systems: (r.systems as string) ?? '',
    relatedProcesses: (r.related_processes as string) ?? '',
    channels: (r.channels as string) ?? '',
    jobIds: (r.job_ids as string[]) ?? [],
    relatedDocuments: (r.related_documents as string) ?? '',
    customRowValues: (r.custom_row_values as Record<string, string>) ?? {},
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function jobToDb(j: Job) {
  return {
    id: j.id,
    client_id: j.clientId,
    name: j.name,
    description: j.description ?? null,
    tag: j.tag,
    priority: j.priority ?? null,
    struggles: j.struggles ?? null,
    functional_dimensions: j.functionalDimensions ?? null,
    social_dimensions: j.socialDimensions ?? null,
    emotional_dimensions: j.emotionalDimensions ?? null,
    solutions_and_workarounds: j.solutionsAndWorkarounds ?? null,
    insight_ids: j.insightIds ?? [],
    created_at: j.createdAt,
    updated_at: j.updatedAt,
  };
}
function jobFromDb(r: Record<string, unknown>): Job {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    name: r.name as string,
    description: (r.description as string) ?? undefined,
    tag: r.tag as Job['tag'],
    priority: (r.priority as Job['priority']) ?? undefined,
    struggles: (r.struggles as string[]) ?? undefined,
    functionalDimensions: (r.functional_dimensions as string[]) ?? undefined,
    socialDimensions: (r.social_dimensions as string[]) ?? undefined,
    emotionalDimensions: (r.emotional_dimensions as string[]) ?? undefined,
    solutionsAndWorkarounds: (r.solutions_and_workarounds as string) ?? undefined,
    insightIds: (r.insight_ids as string[]) ?? [],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function insightToDb(i: Insight) {
  return {
    id: i.id,
    client_id: i.clientId,
    title: i.title,
    description: i.description ?? null,
    priority: i.priority ?? null,
    order: i.order ?? 0,
    created_at: i.createdAt,
    updated_at: i.updatedAt,
  };
}
function insightFromDb(r: Record<string, unknown>): Insight {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    priority: (r.priority as Insight['priority']) ?? undefined,
    order: (r.order as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function opportunityToDb(o: Opportunity) {
  return {
    id: o.id,
    client_id: o.clientId,
    project_id: o.projectId,
    journey_id: o.journeyId,
    phase_id: o.phaseId,
    stage: o.stage,
    stage_order: o.stageOrder,
    name: o.name,
    priority: o.priority,
    description: o.description ?? '',
    point_of_differentiation: o.pointOfDifferentiation ?? '',
    critical_assumptions: o.criticalAssumptions ?? '',
    linked_job_ids: o.linkedJobIds ?? [],
    is_priority: o.isPriority ?? false,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}
function opportunityFromDb(r: Record<string, unknown>): Opportunity {
  return {
    id: r.id as string,
    clientId: r.client_id as string,
    projectId: r.project_id as string,
    journeyId: r.journey_id as string,
    phaseId: r.phase_id as string,
    stage: r.stage as Opportunity['stage'],
    stageOrder: (r.stage_order as number) ?? 0,
    name: r.name as string,
    priority: r.priority as Opportunity['priority'],
    description: (r.description as string) ?? '',
    pointOfDifferentiation: (r.point_of_differentiation as string) ?? '',
    criticalAssumptions: (r.critical_assumptions as string) ?? '',
    linkedJobIds: (r.linked_job_ids as string[]) ?? [],
    isPriority: (r.is_priority as boolean) ?? false,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function cellCommentFromDb(r: Record<string, unknown>): CellComment {
  return {
    text: r.text as string,
    replies: (r.replies as string[]) ?? [],
  };
}

// —— DataStore implementation ——

export async function supabaseGetState(): Promise<AppState | null> {
  if (!supabase) return null;

  const [
    { data: clientsData },
    { data: projectsData },
    { data: journeysData },
    { data: phasesData },
    { data: jobsData },
    { data: insightsData },
    { data: opportunitiesData },
    { data: commentsData },
  ] = await Promise.all([
    supabase.from('clients').select('*'),
    supabase.from('projects').select('*'),
    supabase.from('journeys').select('*'),
    supabase.from('phases').select('*'),
    supabase.from('jobs').select('*'),
    supabase.from('insights').select('*'),
    supabase.from('opportunities').select('*'),
    supabase.from('cell_comments').select('*'),
  ]);

  const clients = (clientsData ?? []).map((r) => clientFromDb(r as Record<string, unknown>));
  const projects = (projectsData ?? []).map((r) => projectFromDb(r as Record<string, unknown>));
  const journeys = (journeysData ?? []).map((r) => journeyFromDb(r as Record<string, unknown>));
  const phases = (phasesData ?? []).map((r) => phaseFromDb(r as Record<string, unknown>));
  const jobs = (jobsData ?? []).map((r) => jobFromDb(r as Record<string, unknown>));
  const insights = (insightsData ?? []).map((r) => insightFromDb(r as Record<string, unknown>));
  const opportunities = (opportunitiesData ?? []).map((r) => opportunityFromDb(r as Record<string, unknown>));

  const cellComments: Record<string, CellComment> = {};
  for (const row of commentsData ?? []) {
    const r = row as Record<string, unknown>;
    const key = r.key as string;
    cellComments[key] = cellCommentFromDb(r);
  }

  return {
    clients,
    projects,
    journeys,
    phases,
    jobs,
    insights,
    opportunities,
    cellComments,
  };
}

export async function supabaseSaveState(state: AppState): Promise<void> {
  if (!supabase) return;

  const { clients, projects, journeys, phases, jobs, insights, opportunities, cellComments } = state;

  // Use SECURITY DEFINER RPCs for all writes so we never hit RLS (avoids "new row violates row-level security").
  const { error: e1 } = await supabase.rpc('upsert_clients', { p_rows: clients.map(clientToDb) });
  if (e1) throw new Error(`Supabase clients: ${e1.message}`);

  const { error: e2 } = await supabase.rpc('upsert_projects', { p_rows: projects.map(projectToDb) });
  if (e2) throw new Error(`Supabase projects: ${e2.message}`);

  const { error: e3 } = await supabase.rpc('upsert_journeys', { p_rows: journeys.map(journeyToDb) });
  if (e3) throw new Error(`Supabase journeys: ${e3.message}`);

  const { error: e4 } = await supabase.rpc('upsert_phases', { p_rows: phases.map(phaseToDb) });
  if (e4) throw new Error(`Supabase phases: ${e4.message}`);

  const { error: e5 } = await supabase.rpc('upsert_jobs', { p_rows: jobs.map(jobToDb) });
  if (e5) throw new Error(`Supabase jobs: ${e5.message}`);

  const { error: e6 } = await supabase.rpc('upsert_insights', { p_rows: insights.map(insightToDb) });
  if (e6) throw new Error(`Supabase insights: ${e6.message}`);

  const { error: e7 } = await supabase.rpc('upsert_opportunities', { p_rows: opportunities.map(opportunityToDb) });
  if (e7) throw new Error(`Supabase opportunities: ${e7.message}`);

  const commentKeys = Object.keys(cellComments);
  if (commentKeys.length > 0) {
    const rows = commentKeys.map((key) => ({
      key,
      text: cellComments[key].text,
      replies: cellComments[key].replies ?? [],
    }));
    const { error: e8 } = await supabase.rpc('upsert_cell_comments', { p_rows: rows });
    if (e8) throw new Error(`Supabase cell_comments: ${e8.message}`);
  }

  // Deletes: clients via delete_client RPC; other tables via delete_missing_rows RPC (bypasses RLS).
  const clientIds = clients.map((c) => c.id);
  const { data: existingClients } = await supabase.from('clients').select('id');
  for (const row of (existingClients ?? []) as { id: string }[]) {
    if (row.id && !clientIds.includes(row.id)) {
      const { error } = await supabase.rpc('delete_client', { p_client_id: row.id });
      if (error) throw new Error(`Supabase delete_client: ${error.message}`);
    }
  }
  const { error: d1 } = await supabase.rpc('delete_missing_rows', { p_table: 'opportunities', p_keep_ids: opportunities.map((o) => o.id) });
  if (d1) throw new Error(`Supabase delete_missing_rows opportunities: ${d1.message}`);
  const { error: d2 } = await supabase.rpc('delete_missing_rows', { p_table: 'phases', p_keep_ids: phases.map((p) => p.id) });
  if (d2) throw new Error(`Supabase delete_missing_rows phases: ${d2.message}`);
  const { error: d3 } = await supabase.rpc('delete_missing_rows', { p_table: 'journeys', p_keep_ids: journeys.map((j) => j.id) });
  if (d3) throw new Error(`Supabase delete_missing_rows journeys: ${d3.message}`);
  const { error: d4 } = await supabase.rpc('delete_missing_rows', { p_table: 'projects', p_keep_ids: projects.map((p) => p.id) });
  if (d4) throw new Error(`Supabase delete_missing_rows projects: ${d4.message}`);
  const { error: d5 } = await supabase.rpc('delete_missing_rows', { p_table: 'jobs', p_keep_ids: jobs.map((j) => j.id) });
  if (d5) throw new Error(`Supabase delete_missing_rows jobs: ${d5.message}`);
  const { error: d6 } = await supabase.rpc('delete_missing_rows', { p_table: 'insights', p_keep_ids: insights.map((i) => i.id) });
  if (d6) throw new Error(`Supabase delete_missing_rows insights: ${d6.message}`);

  const { error: d7 } = await supabase.rpc('delete_missing_cell_comments', { p_keep_keys: commentKeys.length > 0 ? commentKeys : [] });
  if (d7) throw new Error(`Supabase delete_missing_cell_comments: ${d7.message}`);
}
