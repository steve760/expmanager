-- Single patch for Supabase CRUD + RLS. Run the ENTIRE file in Supabase SQL Editor once.
-- Fixes: profiles recursion, clients/jobs/insights/opportunities/projects/journeys/phases/cell_comments RLS,
--        organisation_members policies, delete_client + admin RPCs, and GRANT EXECUTE for all helpers.

-- Helper: is current user a super admin? (SECURITY DEFINER so it doesn't recurse when used in profiles RLS policies)
create or replace function public.is_my_profile_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_super_admin from public.profiles where id = auth.uid() limit 1), false);
$$;

-- Replace recursive profiles policies with the helper
drop policy if exists "SuperAdmin can read all profiles" on public.profiles;
create policy "SuperAdmin can read all profiles" on public.profiles for select
  using (public.is_my_profile_super_admin());
drop policy if exists "SuperAdmin can update any profile" on public.profiles;
create policy "SuperAdmin can update any profile" on public.profiles for update
  using (public.is_my_profile_super_admin());

-- Recreate user_client_ids to use is_my_profile_super_admin (avoids touching profiles in a way that can confuse RLS)
create or replace function public.user_client_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select id::text from public.clients where public.is_my_profile_super_admin()
  union
  select organisation_id from public.organisation_members where user_id = auth.uid();
$$;

-- Helper: can the current user access this client_id? (SECURITY DEFINER for reliable use in RLS WITH CHECK)
create or replace function public.client_id_is_accessible(p_client_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_client_id is not null and p_client_id in (select public.user_client_ids());
$$;

-- Helper: can the current user access this project_id? (for journeys RLS; param text to support uuid or text id columns)
create or replace function public.project_id_is_accessible(p_project_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_project_id is not null and p_project_id <> '' and exists (
    select 1 from public.projects pr where (pr.id)::text = p_project_id and public.client_id_is_accessible((pr.client_id)::text)
  );
$$;

-- Helper: can the current user access this journey_id? (for phases RLS; param text to support uuid or text id columns)
create or replace function public.journey_id_is_accessible(p_journey_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_journey_id is not null and p_journey_id <> '' and exists (
    select 1 from public.journeys j join public.projects pr on (pr.id)::text = (j.project_id)::text
    where (j.id)::text = p_journey_id and public.client_id_is_accessible((pr.client_id)::text)
  );
$$;

-- Helper: can the current user access this phase (for cell_comments; key is phaseId::rowKey)
create or replace function public.phase_id_is_accessible(p_phase_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_phase_id is not null and exists (
    select 1 from public.phases ph
    join public.journeys j on j.id = ph.journey_id
    join public.projects pr on pr.id = j.project_id
    where ph.id::text = p_phase_id and public.client_id_is_accessible(pr.client_id::text)
  );
$$;

-- ========== CLIENTS: use helpers for all policies (fixes "new row violates row-level security for table clients")
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
create policy "clients_select" on public.clients for select
  using (public.client_id_is_accessible((id)::text));
create policy "clients_insert" on public.clients for insert
  with check (public.is_my_profile_super_admin());
create policy "clients_update" on public.clients for update
  using (public.client_id_is_accessible((id)::text))
  with check (public.client_id_is_accessible((id)::text));
create policy "clients_delete" on public.clients for delete
  using (public.client_id_is_accessible((id)::text));

-- Fix jobs/insights/opportunities/projects RLS: use helper so WITH CHECK passes when user has access (avoids "new row violates row-level security")
drop policy if exists "projects_all" on public.projects;
create policy "projects_all" on public.projects for all
  using (public.client_id_is_accessible((client_id)::text))
  with check (public.client_id_is_accessible((client_id)::text));
drop policy if exists "jobs_all" on public.jobs;
create policy "jobs_all" on public.jobs for all
  using (public.client_id_is_accessible((client_id)::text))
  with check (public.client_id_is_accessible((client_id)::text));
drop policy if exists "insights_all" on public.insights;
create policy "insights_all" on public.insights for all
  using (public.client_id_is_accessible((client_id)::text))
  with check (public.client_id_is_accessible((client_id)::text));
drop policy if exists "opportunities_all" on public.opportunities;
create policy "opportunities_all" on public.opportunities for all
  using (public.client_id_is_accessible((client_id)::text))
  with check (public.client_id_is_accessible((client_id)::text));

-- Journeys and phases: use project_id/journey_id helpers (cast to text for uuid or text columns)
drop policy if exists "journeys_all" on public.journeys;
create policy "journeys_all" on public.journeys for all
  using (public.project_id_is_accessible((project_id)::text))
  with check (public.project_id_is_accessible((project_id)::text));
drop policy if exists "phases_all" on public.phases;
create policy "phases_all" on public.phases for all
  using (public.journey_id_is_accessible((journey_id)::text))
  with check (public.journey_id_is_accessible((journey_id)::text));

-- Cell comments: key is phaseId::rowKey, allow if phase is accessible
drop policy if exists "cell_comments_all" on public.cell_comments;
create policy "cell_comments_all" on public.cell_comments for all
  using (public.phase_id_is_accessible(split_part(key, '::', 1)))
  with check (public.phase_id_is_accessible(split_part(key, '::', 1)));

-- Organisation members: SuperAdmin policy use helper (avoids recursion)
drop policy if exists "SuperAdmin all organisation_members" on public.organisation_members;
create policy "SuperAdmin all organisation_members" on public.organisation_members for all
  using (public.is_my_profile_super_admin())
  with check (public.is_my_profile_super_admin());

create or replace function public.get_my_profile()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  rec record;
begin
  if uid is null then return null; end if;
  select id, email, full_name, is_super_admin into rec
  from public.profiles where id = uid limit 1;
  if rec is null then return null; end if;
  return json_build_object(
    'id', rec.id,
    'email', rec.email,
    'full_name', rec.full_name,
    'is_super_admin', coalesce(rec.is_super_admin, false)
  );
end;
$$;

-- SuperAdmin-only: return all profiles (same auth.uid() fix for direct select)
create or replace function public.get_all_profiles()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_sa boolean;
begin
  if uid is null then return '[]'::json; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  if not coalesce(is_sa, false) then return '[]'::json; end if;
  return (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
    select id, email, full_name, is_super_admin from public.profiles
  ) t);
end;
$$;

-- SuperAdmin-only: return all organisation_members
create or replace function public.get_all_organisation_members()
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_sa boolean;
begin
  if uid is null then return '[]'::json; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  if not coalesce(is_sa, false) then return '[]'::json; end if;
  return (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
    select id, user_id, organisation_id, role from public.organisation_members
  ) t);
end;
$$;

-- Delete a client (and dependents) only if caller has access. Fixes auth.uid() null on direct DELETE.
create or replace function public.delete_client(p_client_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if p_client_id is null or p_client_id = '' then return; end if;
  if not (p_client_id in (select public.user_client_ids())) then
    raise exception 'Cannot delete this client';
  end if;
  delete from public.cell_comments where split_part(key, '::', 1) in (select id::text from public.phases where journey_id in (select id from public.journeys where project_id in (select id from public.projects where client_id = p_client_id)));
  delete from public.opportunities where client_id = p_client_id;
  delete from public.phases where journey_id in (select id from public.journeys where project_id in (select id from public.projects where client_id = p_client_id));
  delete from public.journeys where project_id in (select id from public.projects where client_id = p_client_id);
  delete from public.projects where client_id = p_client_id;
  delete from public.jobs where client_id = p_client_id;
  delete from public.insights where client_id = p_client_id;
  delete from public.organisation_members where organisation_id = p_client_id;
  delete from public.clients where id = p_client_id;
end;
$$;

-- Add organisation member (caller must be SuperAdmin or ClientAdmin for that org). Fixes auth.uid() on INSERT.
create or replace function public.add_organisation_member_rpc(p_user_id uuid, p_organisation_id text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_sa boolean;
  is_admin_for_org boolean;
  new_id uuid;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if p_role is null or p_role not in ('admin','member','client_user') then raise exception 'Invalid role'; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  select exists (select 1 from public.organisation_members where user_id = uid and role = 'admin' and organisation_id = p_organisation_id) into is_admin_for_org;
  if not is_sa and not is_admin_for_org then raise exception 'Forbidden'; end if;
  if is_admin_for_org and not is_sa and p_role = 'admin' then raise exception 'Only SuperAdmin can add ClientAdmin'; end if;
  insert into public.organisation_members (user_id, organisation_id, role) values (p_user_id, p_organisation_id, p_role) returning id into new_id;
  return (select row_to_json(om) from public.organisation_members om where om.id = new_id);
end;
$$;

-- Remove organisation member (caller must be SuperAdmin or ClientAdmin for that org).
create or replace function public.remove_organisation_member_rpc(p_member_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_sa boolean;
  org_id text;
  is_admin_for_org boolean;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  select om.organisation_id into org_id from public.organisation_members om where om.id = p_member_id limit 1;
  if org_id is null then return; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  select exists (select 1 from public.organisation_members where user_id = uid and role = 'admin' and organisation_id = org_id) into is_admin_for_org;
  if not is_sa and not is_admin_for_org then raise exception 'Forbidden'; end if;
  delete from public.organisation_members where id = p_member_id;
end;
$$;

-- Update profile is_super_admin (caller must be SuperAdmin).
create or replace function public.update_profile_super_admin_rpc(p_user_id uuid, p_is_super_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  is_sa boolean;
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  if not is_sa then raise exception 'Forbidden'; end if;
  update public.profiles set is_super_admin = p_is_super_admin where id = p_user_id;
end;
$$;

-- ========== WRITE RPCs: bypass RLS by running as SECURITY DEFINER; enforce access inside the function.
-- These are used for all app saves so we never hit "new row violates row-level security".

create or replace function public.upsert_clients(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if not public.is_my_profile_super_admin() then return; end if;
  set local row_security = off;
  insert into public.clients (id, name, description, website, logo_url, created_at, updated_at)
  select r->>'id', r->>'name', nullif(r->>'description',''), nullif(r->>'website',''), nullif(r->>'logo_url',''), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  on conflict (id) do update set name = excluded.name, description = excluded.description, website = excluded.website, logo_url = excluded.logo_url, created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_projects(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.projects (id, client_id, name, description, created_at, updated_at)
  select r->>'id', r->>'client_id', r->>'name', nullif(r->>'description',''), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  where public.client_id_is_accessible(r->>'client_id')
  on conflict (id) do update set client_id = excluded.client_id, name = excluded.name, description = excluded.description, created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_journeys(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.journeys (id, project_id, name, description, row_order, custom_rows, created_at, updated_at)
  select r->>'id', r->>'project_id', r->>'name', nullif(r->>'description',''), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'row_order') = 'array' then r->'row_order' else '[]'::jsonb end) elem), (r->'custom_rows'), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  where public.project_id_is_accessible(r->>'project_id')
  on conflict (id) do update set project_id = excluded.project_id, name = excluded.name, description = excluded.description, row_order = excluded.row_order, custom_rows = excluded.custom_rows, created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_phases(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.phases (id, journey_id, "order", title, description, image_url, struggles, internal_struggles, opportunities, front_stage_actions, back_stage_actions, systems, related_processes, job_ids, related_documents, custom_row_values, created_at, updated_at, channels)
  select r->>'id', r->>'journey_id', coalesce((r->>'order')::int, 0), coalesce(r->>'title',''), coalesce(r->>'description',''), nullif(r->>'image_url',''), coalesce(r->>'struggles',''), coalesce(r->>'internal_struggles',''), coalesce(r->>'opportunities',''), coalesce(r->>'front_stage_actions',''), coalesce(r->>'back_stage_actions',''), coalesce(r->>'systems',''), coalesce(r->>'related_processes',''), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'job_ids') = 'array' then r->'job_ids' else '[]'::jsonb end) elem), coalesce(r->>'related_documents',''), coalesce(r->'custom_row_values', '{}'::jsonb), r->>'created_at', r->>'updated_at', nullif(r->>'channels','')
  from jsonb_array_elements(p_rows) r
  where public.journey_id_is_accessible(r->>'journey_id')
  on conflict (id) do update set journey_id = excluded.journey_id, "order" = excluded."order", title = excluded.title, description = excluded.description, image_url = excluded.image_url, struggles = excluded.struggles, internal_struggles = excluded.internal_struggles, opportunities = excluded.opportunities, front_stage_actions = excluded.front_stage_actions, back_stage_actions = excluded.back_stage_actions, systems = excluded.systems, related_processes = excluded.related_processes, job_ids = excluded.job_ids, related_documents = excluded.related_documents, custom_row_values = excluded.custom_row_values, created_at = excluded.created_at, updated_at = excluded.updated_at, channels = excluded.channels;
end;
$$;

create or replace function public.upsert_jobs(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.jobs (id, client_id, name, description, tag, priority, struggles, functional_dimensions, social_dimensions, emotional_dimensions, solutions_and_workarounds, insight_ids, created_at, updated_at)
  select r->>'id', r->>'client_id', r->>'name', nullif(r->>'description',''), r->>'tag', nullif(r->>'priority',''), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'struggles') = 'array' then r->'struggles' else '[]'::jsonb end) elem), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'functional_dimensions') = 'array' then r->'functional_dimensions' else '[]'::jsonb end) elem), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'social_dimensions') = 'array' then r->'social_dimensions' else '[]'::jsonb end) elem), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'emotional_dimensions') = 'array' then r->'emotional_dimensions' else '[]'::jsonb end) elem), nullif(r->>'solutions_and_workarounds',''), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'insight_ids') = 'array' then r->'insight_ids' else '[]'::jsonb end) elem), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  where public.client_id_is_accessible(r->>'client_id')
  on conflict (id) do update set client_id = excluded.client_id, name = excluded.name, description = excluded.description, tag = excluded.tag, priority = excluded.priority, struggles = excluded.struggles, functional_dimensions = excluded.functional_dimensions, social_dimensions = excluded.social_dimensions, emotional_dimensions = excluded.emotional_dimensions, solutions_and_workarounds = excluded.solutions_and_workarounds, insight_ids = excluded.insight_ids, created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_insights(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.insights (id, client_id, title, description, priority, "order", created_at, updated_at)
  select r->>'id', r->>'client_id', r->>'title', nullif(r->>'description',''), nullif(r->>'priority',''), coalesce((r->>'order')::int, 0), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  where public.client_id_is_accessible(r->>'client_id')
  on conflict (id) do update set client_id = excluded.client_id, title = excluded.title, description = excluded.description, priority = excluded.priority, "order" = excluded."order", created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_opportunities(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.opportunities (id, client_id, project_id, journey_id, phase_id, stage, stage_order, name, priority, description, point_of_differentiation, critical_assumptions, linked_job_ids, is_priority, created_at, updated_at)
  select r->>'id', r->>'client_id', r->>'project_id', r->>'journey_id', r->>'phase_id', r->>'stage', coalesce((r->>'stage_order')::int, 0), r->>'name', r->>'priority', coalesce(r->>'description',''), coalesce(r->>'point_of_differentiation',''), coalesce(r->>'critical_assumptions',''), (select coalesce(array_agg(elem::text), array[]::text[]) from jsonb_array_elements_text(case when jsonb_typeof(r->'linked_job_ids') = 'array' then r->'linked_job_ids' else '[]'::jsonb end) elem), coalesce((r->>'is_priority')::boolean, false), r->>'created_at', r->>'updated_at'
  from jsonb_array_elements(p_rows) r
  where public.client_id_is_accessible(r->>'client_id')
  on conflict (id) do update set client_id = excluded.client_id, project_id = excluded.project_id, journey_id = excluded.journey_id, phase_id = excluded.phase_id, stage = excluded.stage, stage_order = excluded.stage_order, name = excluded.name, priority = excluded.priority, description = excluded.description, point_of_differentiation = excluded.point_of_differentiation, critical_assumptions = excluded.critical_assumptions, linked_job_ids = excluded.linked_job_ids, is_priority = excluded.is_priority, created_at = excluded.created_at, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.upsert_cell_comments(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  insert into public.cell_comments (key, text, replies)
  select r->>'key', coalesce(r->>'text',''), coalesce(r->'replies', '[]'::jsonb)
  from jsonb_array_elements(p_rows) r
  where public.phase_id_is_accessible(split_part(r->>'key', '::', 1))
  on conflict (key) do update set text = excluded.text, replies = excluded.replies;
end;
$$;

-- Delete missing rows (bypass RLS); only deletes rows the user is allowed to access.
create or replace function public.delete_missing_rows(p_table text, p_keep_ids jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  keep_set jsonb := p_keep_ids;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  case p_table
    when 'opportunities' then delete from public.opportunities o where (o.id)::text not in (select jsonb_array_elements_text(keep_set)) and o.client_id::text in (select public.user_client_ids());
    when 'phases' then delete from public.phases ph where (ph.id)::text not in (select jsonb_array_elements_text(keep_set)) and public.journey_id_is_accessible((ph.journey_id)::text);
    when 'journeys' then delete from public.journeys j where (j.id)::text not in (select jsonb_array_elements_text(keep_set)) and public.project_id_is_accessible((j.project_id)::text);
    when 'projects' then delete from public.projects pr where (pr.id)::text not in (select jsonb_array_elements_text(keep_set)) and public.client_id_is_accessible((pr.client_id)::text);
    when 'jobs' then delete from public.jobs j where (j.id)::text not in (select jsonb_array_elements_text(keep_set)) and j.client_id::text in (select public.user_client_ids());
    when 'insights' then delete from public.insights i where (i.id)::text not in (select jsonb_array_elements_text(keep_set)) and i.client_id::text in (select public.user_client_ids());
    else null;
  end case;
end;
$$;

create or replace function public.delete_missing_cell_comments(p_keep_keys jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  set local row_security = off;
  delete from public.cell_comments cc where cc.key not in (select jsonb_array_elements_text(p_keep_keys)) and public.phase_id_is_accessible(split_part(cc.key, '::', 1));
end;
$$;

-- Ensure authenticated (and anon) can call RPCs; policy helpers and RPCs need execute.
grant execute on function public.is_my_profile_super_admin() to authenticated, anon;
grant execute on function public.client_id_is_accessible(text) to authenticated, anon;
grant execute on function public.project_id_is_accessible(text) to authenticated, anon;
grant execute on function public.journey_id_is_accessible(text) to authenticated, anon;
grant execute on function public.phase_id_is_accessible(text) to authenticated, anon;
grant execute on function public.get_my_profile() to authenticated, anon;
grant execute on function public.get_all_profiles() to authenticated, anon;
grant execute on function public.get_all_organisation_members() to authenticated, anon;
grant execute on function public.delete_client(text) to authenticated, anon;
grant execute on function public.add_organisation_member_rpc(uuid, text, text) to authenticated, anon;
grant execute on function public.remove_organisation_member_rpc(uuid) to authenticated, anon;
grant execute on function public.update_profile_super_admin_rpc(uuid, boolean) to authenticated, anon;
grant execute on function public.upsert_clients(jsonb) to authenticated, anon;
grant execute on function public.upsert_projects(jsonb) to authenticated, anon;
grant execute on function public.upsert_journeys(jsonb) to authenticated, anon;
grant execute on function public.upsert_phases(jsonb) to authenticated, anon;
grant execute on function public.upsert_jobs(jsonb) to authenticated, anon;
grant execute on function public.upsert_insights(jsonb) to authenticated, anon;
grant execute on function public.upsert_opportunities(jsonb) to authenticated, anon;
grant execute on function public.upsert_cell_comments(jsonb) to authenticated, anon;
grant execute on function public.delete_missing_rows(text, jsonb) to authenticated, anon;
grant execute on function public.delete_missing_cell_comments(jsonb) to authenticated, anon;
