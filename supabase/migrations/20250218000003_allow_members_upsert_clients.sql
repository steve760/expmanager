-- Allow non-super-admins to update (not insert) clients they have access to,
-- so that ClientAdmin/member can persist client metadata and full save works.

create or replace function public.upsert_clients(p_rows jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;

  if public.is_my_profile_super_admin() then
    set local row_security = off;
    insert into public.clients (id, name, description, website, logo_url, created_at, updated_at)
    select r->>'id', r->>'name', nullif(r->>'description',''), nullif(r->>'website',''), nullif(r->>'logo_url',''), r->>'created_at', r->>'updated_at'
    from jsonb_array_elements(p_rows) r
    on conflict (id) do update set name = excluded.name, description = excluded.description, website = excluded.website, logo_url = excluded.logo_url, created_at = excluded.created_at, updated_at = excluded.updated_at;
    return;
  end if;

  -- Non-super-admin: only update existing clients they can access (id in user_client_ids).
  set local row_security = off;
  update public.clients c
  set name = r->>'name', description = nullif(r->>'description',''), website = nullif(r->>'website',''), logo_url = nullif(r->>'logo_url',''), updated_at = (r->>'updated_at')::timestamptz
  from jsonb_array_elements(p_rows) r
  where c.id = (r->>'id')
    and (r->>'id') in (select public.user_client_ids());
end;
$$;
