import { useEffect, useState } from 'react';
import { useStore } from '@/store';
import {
  getSession,
  fetchProfile,
  fetchOrganisationMembers,
  fetchAllProfiles,
  fetchAllOrganisationMembers,
  fetchMembersByOrganisation,
  addOrganisationMember,
  removeOrganisationMember,
  updateProfileSuperAdmin,
  inviteUser,
} from '@/lib/auth';
import type { Profile, OrganisationMember } from '@/types';
import { AddMemberModal } from '@/components/admin/AddMemberModal';

type AdminPanelProps = { onClose: () => void };

export function AdminPanel({ onClose }: AdminPanelProps) {
  const profile = useStore((s) => s.profile);
  const organisationMembers = useStore((s) => s.organisationMembers);
  const setProfile = useStore((s) => s.setProfile);
  const setOrganisationMembers = useStore((s) => s.setOrganisationMembers);
  const clients = useStore((s) => s.clients);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [allMembers, setAllMembers] = useState<OrganisationMember[]>([]);
  const [membersByOrg, setMembersByOrg] = useState<Record<string, OrganisationMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [profileRefreshed, setProfileRefreshed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [addMemberUser, setAddMemberUser] = useState<Profile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteClientId, setInviteClientId] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'client_user'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const isSuperAdmin = Boolean(profile?.is_super_admin);
  const adminOrgIds = (organisationMembers ?? []).filter((m) => m.role === 'admin').map((m) => m.organisation_id);
  const canAccessAdmin = isSuperAdmin || adminOrgIds.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSession();
      if (cancelled || !session?.user?.id) {
        setProfileRefreshed(true);
        return;
      }
      const [p, m] = await Promise.all([
        fetchProfile(session.user.id),
        fetchOrganisationMembers(session.user.id),
      ]);
      if (!cancelled) {
        setCurrentUserId(session.user.id);
        setProfile(p ?? null);
        setOrganisationMembers(m ?? []);
        setProfileRefreshed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileRefreshed || !canAccessAdmin) {
      if (profileRefreshed) setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (isSuperAdmin) {
        const [profiles, members] = await Promise.all([
          fetchAllProfiles(),
          fetchAllOrganisationMembers(),
        ]);
        if (!cancelled) {
          setAllProfiles(profiles);
          setAllMembers(members);
        }
      } else {
        const map: Record<string, OrganisationMember[]> = {};
        await Promise.all(
          adminOrgIds.map(async (orgId) => {
            const list = await fetchMembersByOrganisation(orgId);
            if (!cancelled) map[orgId] = list;
          })
        );
        if (!cancelled) setMembersByOrg(map);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileRefreshed, canAccessAdmin, isSuperAdmin, adminOrgIds.join(',')]);

  if (!profileRefreshed && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-6 dark:bg-stone-900">
        <p className="mb-4 text-stone-600 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  if (!canAccessAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-8 dark:bg-stone-900">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-stone-800">
          <div className="mb-4 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-200 text-2xl dark:bg-stone-600" aria-hidden>
              🔒
            </span>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
            Admin access only
          </h2>
          <p className="mb-6 text-sm text-stone-600 dark:text-stone-400">
            This area is for administrators. If you need access, please ask your organisation admin or the person who manages this workspace.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-stone-800 px-4 py-3 font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Back to app
          </button>
        </div>
      </div>
    );
  }

  const adminClients = clients.filter((c) => adminOrgIds.includes(c.id));

  const refreshAdminData = async () => {
    if (isSuperAdmin) {
      const [profiles, members] = await Promise.all([
        fetchAllProfiles(),
        fetchAllOrganisationMembers(),
      ]);
      setAllProfiles(profiles);
      setAllMembers(members);
    }
  };

  const getOrgIdsForUser = (userId: string) =>
    allMembers.filter((m) => m.user_id === userId).map((m) => m.organisation_id);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(false);
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const { ok, error } = await inviteUser({
      email: inviteEmail.trim(),
      full_name: inviteName.trim() || undefined,
      organisation_id: inviteClientId || undefined,
      role: inviteClientId ? inviteRole : undefined,
    });
    setInviteLoading(false);
    if (error) {
      setInviteError(error);
      return;
    }
    setInviteSuccess(true);
    setInviteEmail('');
    setInviteName('');
    setInviteClientId('');
    setInviteRole('member');
    refreshAdminData();
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-900">
      <header className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-700">
        <h1 className="font-semibold text-stone-900 dark:text-stone-100">Admin</h1>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          Back to app
        </button>
      </header>
      <main className="flex-1 overflow-auto p-6">
        {loading ? (
          <p className="text-stone-500">Loading…</p>
        ) : (
          <div className="space-y-8">
            {isSuperAdmin && (
              <>
                <section>
                  <h2 className="mb-2 text-lg font-medium text-stone-900 dark:text-stone-100">Add new user (simple)</h2>
                  <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-stone-600 dark:text-stone-400">
                    <li>Open <strong>Supabase Dashboard</strong> → your project → <strong>Authentication</strong> → <strong>Users</strong>.</li>
                    <li>Click <strong>Add user</strong> → enter their email and a temporary password → Create.</li>
                    <li>Share the password with them (e.g. Slack, in person). They sign in at your app URL and can change it later if you enable that in Supabase.</li>
                    <li>Below, find them in <strong>Users</strong> and click <strong>Add to client</strong> to assign a client and role.</li>
                  </ol>
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300">Or invite by email (needs Edge Function + SMTP)</summary>
                    <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                      Deploy the <code className="rounded bg-stone-200 px-1 dark:bg-stone-700">invite-user</code> Edge Function and set up custom SMTP in Supabase if you want to send invite emails from here.
                    </p>
                  <form onSubmit={handleInvite} className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">Email</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="newuser@example.com"
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">Name</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="Full name"
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-stone-500">Client (optional)</label>
                      <select
                        value={inviteClientId}
                        onChange={(e) => setInviteClientId(e.target.value)}
                        className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                      >
                        <option value="">—</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {inviteClientId && (
                      <div>
                        <label className="mb-1 block text-xs font-medium text-stone-500">Role</label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'client_user')}
                          className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                        >
                          <option value="admin">ClientAdmin</option>
                          <option value="member">User</option>
                          <option value="client_user">ClientUser</option>
                        </select>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail.trim()}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {inviteLoading ? 'Sending…' : 'Invite'}
                    </button>
                  </form>
                  {inviteError && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{inviteError}</p>}
                  {inviteSuccess && <p className="mb-2 text-sm text-green-600 dark:text-green-400">Invitation sent.</p>}
                  </details>
                </section>
                <section>
                  <h2 className="mb-2 text-lg font-medium text-stone-900 dark:text-stone-100">Users (profiles)</h2>
                  <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
                    Add existing users to a client, or set SuperAdmin. You cannot change your own SuperAdmin status.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left dark:border-stone-600">
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Email</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Name</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Super admin</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProfiles.map((p) => (
                          <tr key={p.id} className="border-b border-stone-100 dark:border-stone-700">
                            <td className="p-3 text-stone-600 dark:text-stone-400">{p.email ?? '—'}</td>
                            <td className="p-3 text-stone-600 dark:text-stone-400">{p.full_name ?? '—'}</td>
                            <td className="p-3">
                              {p.id === currentUserId ? (
                                '—'
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const { error } = await updateProfileSuperAdmin(p.id, !p.is_super_admin);
                                    if (!error) refreshAdminData();
                                  }}
                                  className={`rounded px-2 py-1 text-xs ${p.is_super_admin ? 'bg-violet-200 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'}`}
                                >
                                  {p.is_super_admin ? 'Yes' : 'No'}
                                </button>
                              )}
                            </td>
                            <td className="p-3">
                              <button
                                type="button"
                                onClick={() => setAddMemberUser(p)}
                                className="rounded bg-stone-200 px-2 py-1 text-xs text-stone-700 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
                              >
                                Add to client
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section>
                  <h2 className="mb-2 text-lg font-medium text-stone-900 dark:text-stone-100">Organisation members</h2>
                  <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
                    role: <strong>admin</strong> = ClientAdmin, <strong>member</strong> = User, <strong>client_user</strong> = ClientUser. Remove to revoke access to that client.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left dark:border-stone-600">
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">User</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Client</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Role</th>
                          <th className="p-3 font-medium text-stone-700 dark:text-stone-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allMembers.map((m) => {
                          const profile = allProfiles.find((pr) => pr.id === m.user_id);
                          const client = clients.find((c) => c.id === m.organisation_id);
                          return (
                            <tr key={m.id} className="border-b border-stone-100 dark:border-stone-700">
                              <td className="p-3 text-stone-600 dark:text-stone-400">{profile?.email ?? profile?.full_name ?? m.user_id}</td>
                              <td className="p-3 text-stone-600 dark:text-stone-400">{client?.name ?? m.organisation_id}</td>
                              <td className="p-3">{m.role}</td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const { error } = await removeOrganisationMember(m.id);
                                    if (!error) refreshAdminData();
                                  }}
                                  className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
                {addMemberUser && (
                  <AddMemberModal
                    user={addMemberUser}
                    clients={clients}
                    existingOrgIds={getOrgIdsForUser(addMemberUser.id)}
                    allowedRoles={['admin', 'member', 'client_user']}
                    onClose={() => setAddMemberUser(null)}
                    onSuccess={refreshAdminData}
                  />
                )}
              </>
            )}
            {!isSuperAdmin && adminClients.length > 0 && (
              <section>
                <h2 className="mb-2 text-lg font-medium text-stone-900 dark:text-stone-100">Members for your clients</h2>
                <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
                  You can invite User or ClientUser for these clients via Supabase Dashboard or an Edge Function. To remove a member, delete their row from <code className="rounded bg-stone-200 px-1 dark:bg-stone-700">organisation_members</code> in the SQL Editor.
                </p>
                {adminClients.map((client) => (
                  <div key={client.id} className="mb-6 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
                    <h3 className="mb-2 font-medium text-stone-800 dark:text-stone-200">{client.name}</h3>
                    <p className="mb-2 font-mono text-xs text-stone-500">{client.id}</p>
                    <ul className="list-inside list-disc text-sm text-stone-600 dark:text-stone-400">
                      {(membersByOrg[client.id] ?? []).map((m) => (
                        <li key={m.id}>
                          <span className="font-mono">{m.user_id}</span> — {m.role}
                        </li>
                      ))}
                      {(membersByOrg[client.id] ?? []).length === 0 && <li>No members yet</li>}
                    </ul>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
