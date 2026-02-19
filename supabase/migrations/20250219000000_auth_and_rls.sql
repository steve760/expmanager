-- Auth and permissions: profiles, organisation_members, RLS, user_client_ids()
-- Copy everything below into Supabase SQL Editor and run.

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "SuperAdmin can read all profiles" on public.profiles;
create policy "SuperAdmin can read all profiles" on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
drop policy if exists "SuperAdmin can update any profile" on public.profiles;
create policy "SuperAdmin can update any profile" on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- RPC: fetch current user's profile (avoids auth.uid() sometimes being null in RLS on direct table select)
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

create or replace function public.get_all_profiles()
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_sa boolean;
begin
  if uid is null then return '[]'::json; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  if not coalesce(is_sa, false) then return '[]'::json; end if;
  return (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (select id, email, full_name, is_super_admin from public.profiles) t);
end;
$$;

create or replace function public.get_all_organisation_members()
returns json language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); is_sa boolean;
begin
  if uid is null then return '[]'::json; end if;
  select coalesce(p.is_super_admin, false) into is_sa from public.profiles p where p.id = uid limit 1;
  if not coalesce(is_sa, false) then return '[]'::json; end if;
  return (select coalesce(json_agg(row_to_json(t)), '[]'::json) from (select id, user_id, organisation_id, role from public.organisation_members) t);
end;
$$;

-- 2. Organisation members (organisation_id = clients.id; use text to match clients.id)
drop table if exists public.organisation_members;
create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organisation_id text not null references public.clients(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'client_user')),
  created_at timestamptz not null default now(),
  unique(user_id, organisation_id)
);
create index if not exists idx_organisation_members_user_id on public.organisation_members(user_id);
create index if not exists idx_organisation_members_organisation_id on public.organisation_members(organisation_id);
alter table public.organisation_members enable row level security;
drop policy if exists "Users read own memberships" on public.organisation_members;
create policy "Users read own memberships" on public.organisation_members for select using (user_id = auth.uid());
drop policy if exists "SuperAdmin all organisation_members" on public.organisation_members;
create policy "SuperAdmin all organisation_members" on public.organisation_members for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
drop policy if exists "ClientAdmin manage own org members" on public.organisation_members;
create policy "ClientAdmin manage own org members" on public.organisation_members for all
  using (organisation_id in (select organisation_id from public.organisation_members where user_id = auth.uid() and role = 'admin'))
  with check (organisation_id in (select organisation_id from public.organisation_members where user_id = auth.uid() and role = 'admin') and role in ('member', 'client_user'));

-- 3. Helper: client IDs the current user may access (returns text to match clients.id)
create or replace function public.user_client_ids()
returns setof text language sql stable security definer set search_path = public as $$
  select id from public.clients where exists (select 1 from public.profiles where id = auth.uid() and is_super_admin)
  union
  select organisation_id from public.organisation_members where user_id = auth.uid();
$$;

-- 4. RLS on existing tables
alter table public.clients enable row level security;
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients for select using (id in (select public.user_client_ids()));
drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_super_admin));
drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients for update using (id in (select public.user_client_ids()));
drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients for delete using (id in (select public.user_client_ids()));

alter table public.projects enable row level security;
drop policy if exists "projects_all" on public.projects;
create policy "projects_all" on public.projects for all using (client_id in (select public.user_client_ids())) with check (client_id in (select public.user_client_ids()));

alter table public.journeys enable row level security;
drop policy if exists "journeys_all" on public.journeys;
create policy "journeys_all" on public.journeys for all
  using (project_id in (select id from public.projects where client_id in (select public.user_client_ids())))
  with check (project_id in (select id from public.projects where client_id in (select public.user_client_ids())));

alter table public.phases enable row level security;
drop policy if exists "phases_all" on public.phases;
create policy "phases_all" on public.phases for all
  using (journey_id in (select id from public.journeys where project_id in (select id from public.projects where client_id in (select public.user_client_ids()))))
  with check (journey_id in (select id from public.journeys where project_id in (select id from public.projects where client_id in (select public.user_client_ids()))));

alter table public.jobs enable row level security;
drop policy if exists "jobs_all" on public.jobs;
create policy "jobs_all" on public.jobs for all using (client_id in (select public.user_client_ids())) with check (client_id in (select public.user_client_ids()));

alter table public.insights enable row level security;
drop policy if exists "insights_all" on public.insights;
create policy "insights_all" on public.insights for all using (client_id in (select public.user_client_ids())) with check (client_id in (select public.user_client_ids()));

alter table public.opportunities enable row level security;
drop policy if exists "opportunities_all" on public.opportunities;
create policy "opportunities_all" on public.opportunities for all using (client_id in (select public.user_client_ids())) with check (client_id in (select public.user_client_ids()));

alter table public.cell_comments enable row level security;
drop policy if exists "cell_comments_all" on public.cell_comments;
create policy "cell_comments_all" on public.cell_comments for all
  using (
    exists (
      select 1 from public.phases ph
      join public.journeys j on j.id = ph.journey_id
      join public.projects pr on pr.id = j.project_id
      where pr.client_id in (select public.user_client_ids()) and ph.id::text = split_part(key, '::', 1)
    )
  )
  with check (
    exists (
      select 1 from public.phases ph
      join public.journeys j on j.id = ph.journey_id
      join public.projects pr on pr.id = j.project_id
      where pr.client_id in (select public.user_client_ids()) and ph.id::text = split_part(key, '::', 1)
    )
  );
