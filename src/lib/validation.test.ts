import { describe, it, expect } from 'vitest';
import { validateCreateClient } from './validation';

describe('validateCreateClient', () => {
  it('accepts valid name only', () => {
    const result = validateCreateClient({ name: 'Acme Corp' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Acme Corp');
      expect(result.data.description).toBeUndefined();
      expect(result.data.website).toBeUndefined();
    }
  });

  it('accepts name with description and website', () => {
    const result = validateCreateClient({
      name: 'Acme',
      description: 'A company',
      website: 'https://acme.example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe('https://acme.example.com');
    }
  });

  it('rejects empty name', () => {
    const result = validateCreateClient({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/required|Name/i);
  });

  it('rejects whitespace-only name', () => {
    const result = validateCreateClient({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = validateCreateClient({ name: 'Acme', website: 'not-a-url' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/URL|valid/i);
  });

  it('accepts empty website as undefined', () => {
    const result = validateCreateClient({ name: 'Acme', website: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.website).toBeUndefined();
  });
});
