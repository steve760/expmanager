import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAudit } from './auditLog';

describe('auditLog', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('calls console.info in dev when logAudit is invoked', () => {
    logAudit('client.create', { clientId: 'c1', name: 'Acme' }, 'user-1');
    expect(consoleSpy).toHaveBeenCalledWith('[audit]', expect.stringContaining('client.create'));
    expect(consoleSpy).toHaveBeenCalledWith('[audit]', expect.stringContaining('c1'));
  });

  it('includes userId when provided', () => {
    logAudit('invite_user', { email: 'a@b.com' }, 'actor-1');
    const call = consoleSpy.mock.calls[0][1] as string;
    const parsed = JSON.parse(call);
    expect(parsed.userId).toBe('actor-1');
    expect(parsed.action).toBe('invite_user');
    expect(parsed.details.email).toBe('a@b.com');
  });
});
