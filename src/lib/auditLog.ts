/**
 * Audit logging for admin and sensitive operations.
 * Logs to console in dev; can be extended to send to Supabase audit_events (or similar) in production.
 */

export type AuditAction =
  | 'client.create'
  | 'client.delete'
  | 'invite_user'
  | 'profile.super_admin_update'
  | 'organisation_member.update';

export interface AuditEntry {
  action: AuditAction;
  timestamp: string;
  /** Optional: set by auth when user is known */
  userId?: string;
  details: Record<string, unknown>;
}

function serialize(entry: AuditEntry): string {
  return JSON.stringify(entry);
}

export function logAudit(action: AuditAction, details: Record<string, unknown>, userId?: string): void {
  const entry: AuditEntry = {
    action,
    timestamp: new Date().toISOString(),
    ...(userId && { userId }),
    details,
  };
  if (import.meta.env.DEV) {
    console.info('[audit]', serialize(entry));
  }
  // Production: send to backend (e.g. Supabase audit_events table or Edge Function)
  // if (import.meta.env.PROD && typeof window !== 'undefined') {
  //   fetch('/api/audit', { method: 'POST', body: serialize(entry), headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  // }
}
