import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Project ref from URL (e.g. "abcdefghij" from https://abcdefghij.supabase.co) for display so you can verify prod uses the right project. */
export function getSupabaseProjectRef(): string | null {
  if (!url || !url.trim()) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host.endsWith('.supabase.co')) return host.replace(/\.supabase\.co$/i, '');
    return host || null;
  } catch {
    return null;
  }
}
