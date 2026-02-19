/**
 * Auth helpers: sign in, sign out, session, profile, organisation members.
 * When Supabase is not configured, the app uses localStorage-based "signed in" only.
 */

import { supabase } from '@/lib/supabase';
import type { Profile, OrganisationMember } from '@/types';

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { data: { user: null, session: null }, error: new Error('Supabase not configured') };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_profile');
  if (!rpcError && rpcData != null) {
    const row = rpcData as Record<string, unknown>;
    const isSuperAdmin = row.is_super_admin === true || row.is_super_admin === 1 ||
      row.is_super_admin === 'true' || row.is_super_admin === 't' || row.is_super_admin === '1';
    return {
      id: row.id as string,
      email: (row.email as string) ?? null,
      full_name: (row.full_name as string) ?? null,
      is_super_admin: Boolean(isSuperAdmin),
    };
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_super_admin')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const raw = row.is_super_admin ?? (row as Record<string, unknown>).isSuperAdmin;
  const isSuperAdmin = raw === true || raw === 1 || raw === 'true' || raw === 't' || raw === '1';
  return {
    id: row.id as string,
    email: (row.email as string) ?? null,
    full_name: (row.full_name as string) ?? null,
    is_super_admin: Boolean(isSuperAdmin),
  };
}

export async function fetchOrganisationMembers(userId: string): Promise<OrganisationMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('organisation_members')
    .select('id, user_id, organisation_id, role')
    .eq('user_id', userId);
  if (error || !data) return [];
  return (data as OrganisationMember[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    organisation_id: r.organisation_id,
    role: r.role,
  }));
}

export function onAuthStateChange(callback: (session: { user: { id: string } } | null) => void) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ? { user: { id: session.user.id } } : null);
  });
  return () => subscription.unsubscribe();
}

/** Fetch all profiles (SuperAdmin only; uses RPC to avoid auth.uid() null in RLS) */
export async function fetchAllProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_all_profiles');
  if (!error && data != null) {
    const arr = typeof data === 'string' ? (JSON.parse(data) as Profile[]) : (Array.isArray(data) ? data : []) as Profile[];
    return arr.map((p) => ({
      id: p.id,
      email: p.email ?? null,
      full_name: p.full_name ?? null,
      is_super_admin: Boolean(p.is_super_admin),
    }));
  }
  const { data: tableData, error: tableError } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_super_admin');
  if (tableError || !tableData) return [];
  return (tableData as Profile[]).map((p) => ({
    id: p.id,
    email: p.email ?? null,
    full_name: p.full_name ?? null,
    is_super_admin: Boolean(p.is_super_admin),
  }));
}

/** Fetch all organisation members (SuperAdmin only; uses RPC to avoid auth.uid() null in RLS) */
export async function fetchAllOrganisationMembers(): Promise<OrganisationMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_all_organisation_members');
  if (!error && data != null) {
    const arr = typeof data === 'string' ? (JSON.parse(data) as OrganisationMember[]) : (Array.isArray(data) ? data : []) as OrganisationMember[];
    return arr.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      organisation_id: r.organisation_id,
      role: r.role,
    }));
  }
  const { data: tableData, error: tableError } = await supabase
    .from('organisation_members')
    .select('id, user_id, organisation_id, role');
  if (tableError || !tableData) return [];
  return (tableData as OrganisationMember[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    organisation_id: r.organisation_id,
    role: r.role,
  }));
}

/** Fetch members of one organisation (RLS: allowed for that org if user has access) */
export async function fetchMembersByOrganisation(organisationId: string): Promise<OrganisationMember[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('organisation_members')
    .select('id, user_id, organisation_id, role')
    .eq('organisation_id', organisationId);
  if (error || !data) return [];
  return (data as OrganisationMember[]).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    organisation_id: r.organisation_id,
    role: r.role,
  }));
}

/** Add a user to a client (organisation). Caller must be SuperAdmin or ClientAdmin for that client. */
export async function addOrganisationMember(
  userId: string,
  organisationId: string,
  role: 'admin' | 'member' | 'client_user'
): Promise<{ data: OrganisationMember | null; error: Error | null }> {
  if (!supabase) return { data: null, error: new Error('Supabase not configured') };
  const { data: rpcData, error: rpcError } = await supabase.rpc('add_organisation_member_rpc', {
    p_user_id: userId,
    p_organisation_id: organisationId,
    p_role: role,
  });
  if (!rpcError && rpcData != null) {
    const row = typeof rpcData === 'object' && rpcData !== null ? rpcData as Record<string, unknown> : null;
    if (row && 'id' in row)
      return { data: row as unknown as OrganisationMember, error: null };
  }
  const { data, error } = await supabase
    .from('organisation_members')
    .insert({ user_id: userId, organisation_id: organisationId, role })
    .select('id, user_id, organisation_id, role')
    .single();
  if (error) return { data: null, error };
  return { data: data as OrganisationMember, error: null };
}

/** Remove a member from a client. Caller must be SuperAdmin or ClientAdmin for that client. */
export async function removeOrganisationMember(memberId: string): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error: rpcError } = await supabase.rpc('remove_organisation_member_rpc', { p_member_id: memberId });
  if (!rpcError) return { error: null };
  const { error } = await supabase.from('organisation_members').delete().eq('id', memberId);
  return { error: error ?? null };
}

/** Set or clear SuperAdmin for a user. Caller must be SuperAdmin. */
export async function updateProfileSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<{ error: Error | null }> {
  if (!supabase) return { error: new Error('Supabase not configured') };
  const { error: rpcError } = await supabase.rpc('update_profile_super_admin_rpc', {
    p_user_id: userId,
    p_is_super_admin: isSuperAdmin,
  });
  if (!rpcError) return { error: null };
  const { error } = await supabase.from('profiles').update({ is_super_admin: isSuperAdmin }).eq('id', userId);
  return { error: error ?? null };
}

/** Invite a new user by email (calls Edge Function; SuperAdmin only). */
export async function inviteUser(params: {
  email: string;
  full_name?: string;
  organisation_id?: string;
  role?: 'admin' | 'member' | 'client_user';
}): Promise<{ ok: boolean; error: string | null }> {
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const url = (import.meta as unknown as { env: { VITE_SUPABASE_URL?: string } }).env?.VITE_SUPABASE_URL;
  if (!url) return { ok: false, error: 'Missing VITE_SUPABASE_URL' };
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: 'Not signed in' };
  const res = await fetch(`${url}/functions/v1/invite-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error ?? res.statusText };
  return { ok: true, error: null };
}
