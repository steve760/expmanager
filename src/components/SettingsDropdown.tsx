import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SettingsDropdown() {
  const darkMode = useStore((s) => s.darkMode);
  const setDarkMode = useStore((s) => s.setDarkMode);
  const signOut = useStore((s) => s.signOut);
  const setShowAdminPanel = useStore((s) => s.setShowAdminPanel);
  const profile = useStore((s) => s.profile);
  const isSignedIn = useStore((s) => s.isSignedIn);
  const showAdminLink = isSupabaseConfigured() || Boolean(profile) || isSignedIn;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // First initial + last initial from profiles.full_name (first word = first name, last word = last name)
  const initials = (() => {
    if (profile?.full_name?.trim()) {
      const parts = profile.full_name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (profile?.email) {
      const local = profile.email.split('@')[0];
      return (local?.slice(0, 2) ?? '').toUpperCase();
    }
    return null;
  })();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-2.5 text-stone-600 shadow-soft transition-all duration-200 hover:border-[#361D60]/50 hover:bg-[#361D60]/10 hover:text-[#361D60] focus:outline-none focus:ring-2 focus:ring-[#361D60]/40 focus:ring-offset-2 active:bg-[#361D60]/15 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-[#6B4D8A] dark:hover:bg-[#361D60]/25 dark:hover:text-stone-100 dark:focus:ring-[#6B4D8A] dark:active:bg-[#361D60]/35"
        aria-label="Settings"
      >
        {initials && (
          <span className="text-xs font-semibold tabular-nums" aria-hidden>{initials}</span>
        )}
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] rounded-xl border border-stone-200 bg-white py-1 shadow-elevated dark:border-stone-600 dark:bg-stone-800 dark:shadow-elevated-dark">
          <button
            type="button"
            onClick={() => { setDarkMode(!darkMode); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {darkMode ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              )}
            </svg>
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
          {showAdminLink && (
            <button
              type="button"
              onClick={() => { setShowAdminPanel(true); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              Admin
            </button>
          )}
          <button
            type="button"
            onClick={async () => { await signOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
