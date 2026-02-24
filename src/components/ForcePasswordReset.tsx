import { useState } from 'react';
import { useStore } from '@/store';
import { updatePassword } from '@/lib/auth';

const MIN_LENGTH = 8;

export function ForcePasswordReset() {
  const initAuth = useStore((s) => s.initAuth);
  const signOut = useStore((s) => s.signOut);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await updatePassword(password);
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Please try again.');
      return;
    }

    // Flag cleared in Supabase — re-run initAuth to load the app normally
    await initAuth();
  };

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-stone-950">
      {/* Background — matches SignInPage */}
      <div className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#361D60]/20 blur-3xl animate-float-slow" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-[#361D60]/15 blur-3xl animate-float-slower" />
        <div className="absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-stone-600/20 blur-3xl animate-float-slow" />
        <div className="absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-[#361D60]/10 blur-3xl animate-float-slower" />
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
          <div className="mb-8 flex justify-center">
            <img src="/XPM.svg" alt="ExpManager" className="h-8 w-auto brightness-0 invert" />
          </div>

          <div className="mb-6">
            <h1 className="text-lg font-semibold text-stone-100">Set your password</h1>
            <p className="mt-1 text-sm text-stone-400">
              You're signing in for the first time. Please set a new password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-stone-300">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                autoFocus
                className="w-full rounded-xl border border-stone-600 bg-stone-800/80 px-4 py-3 text-stone-100 placeholder-stone-500 focus:border-[#361D60] focus:outline-none focus:ring-2 focus:ring-[#361D60]/30"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-stone-300">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                autoComplete="new-password"
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
              {loading ? 'Saving…' : 'Set password & continue'}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full text-center text-sm text-stone-500 hover:text-stone-300"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
