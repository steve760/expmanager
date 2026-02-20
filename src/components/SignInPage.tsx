import { useState } from 'react';
import { useStore } from '@/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import { signInWithPassword } from '@/lib/auth';

export function SignInPage() {
  const setSignedIn = useStore((s) => s.setSignedIn);
  const initAuth = useStore((s) => s.initAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.querySelector('#email') as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector('#password') as HTMLInputElement)?.value;

    if (isSupabaseConfigured()) {
      if (!email || !password) {
        setError('Please enter email and password.');
        return;
      }
      setLoading(true);
      const { data, error: signInError } = await signInWithPassword(email, password);
      setLoading(false);
      if (signInError) {
        const msg = signInError.message ?? '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setError('Email not confirmed. An admin must confirm your account in Supabase (Authentication → Users) or run: update auth.users set email_confirmed_at = now() where email = \'your@email.com\';');
        } else {
          setError(msg || 'Sign in failed.');
        }
        return;
      }
      if (data?.session) {
        await initAuth();
        return;
      }
      setError('Sign in failed.');
      return;
    }
    setSignedIn(true);
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-stone-950">
      {/* Abstract animated background */}
      <div className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#361D60]/20 blur-3xl animate-float-slow" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#361D60]/15 blur-3xl animate-float-slower" />
        <div className="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-stone-600/20 blur-3xl animate-float-slow" />
        <div className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#361D60]/10 blur-3xl animate-float-slower" />
        {/* Geometric accents */}
        <div className="absolute left-1/4 top-1/4 h-2 w-2 rounded-full bg-[#361D60]/50 animate-pulse-slow" />
        <div className="absolute right-1/3 top-1/3 h-3 w-3 rounded-full bg-[#361D60]/40 animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/3 left-1/2 h-2 w-2 rounded-full bg-[#361D60]/50 animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-stone-700/50 bg-stone-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <img src="/XPM.svg" alt="ExpManager" className="h-8 w-auto brightness-0 invert" />
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-stone-600 bg-stone-800/80 px-4 py-3 text-stone-100 placeholder-stone-500 focus:border-[#361D60] focus:outline-none focus:ring-2 focus:ring-[#361D60]/30"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-stone-600 bg-stone-800/80 px-4 py-3 text-stone-100 placeholder-stone-500 focus:border-[#361D60] focus:outline-none focus:ring-2 focus:ring-[#361D60]/30"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#361D60] px-4 py-3 font-semibold text-white shadow-lg shadow-[#361D60]/25 transition-all hover:bg-[#4A2878] hover:shadow-[#361D60]/30 focus:outline-none focus:ring-2 focus:ring-[#361D60] focus:ring-offset-2 focus:ring-offset-stone-900 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
