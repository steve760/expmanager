import { useState } from 'react';
import type { Client, Profile } from '@/types';
import { addOrganisationMember } from '@/lib/auth';
import { Modal, modalButtonPrimary, modalButtonSecondary } from '@/components/ui/Modal';

type Role = 'admin' | 'member' | 'client_user';

type Props = {
  user: Profile;
  clients: Client[];
  /** Organisation (client) IDs this user is already a member of */
  existingOrgIds: string[];
  allowedRoles: Role[];
  onClose: () => void;
  onSuccess: () => void;
};

export function AddMemberModal({ user, clients, existingOrgIds, allowedRoles, onClose, onSuccess }: Props) {
  const [clientId, setClientId] = useState('');
  const [role, setRole] = useState<Role>(allowedRoles[0] ?? 'member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableClients = clients.filter((c) => !existingOrgIds.includes(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) return;
    setError(null);
    setLoading(true);
    const { data, error: err } = await addOrganisationMember(user.id, clientId.trim(), role);
    setLoading(false);
    if (err) {
      setError(err.message ?? 'Failed to add member');
      return;
    }
    if (data) onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add to client"
      footer={
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={modalButtonSecondary}>
            Cancel
          </button>
          <button
            type="submit"
            form="add-member-form"
            disabled={loading || !clientId}
            className={`${modalButtonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Adding…' : 'Add'}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        Add <strong>{user.email ?? user.full_name ?? user.id}</strong> to a client.
      </p>
      <form id="add-member-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="add-client" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Client
          </label>
          <select
            id="add-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            required
          >
            <option value="">Select client</option>
            {availableClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="add-role" className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
            Role
          </label>
          <select
            id="add-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {r === 'admin' ? 'ClientAdmin' : r === 'member' ? 'User' : 'ClientUser'}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
