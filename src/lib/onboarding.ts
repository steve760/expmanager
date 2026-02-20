/**
 * First-run onboarding: persist completion so we do not show the intro again.
 * Uses localStorage when no user settings store exists.
 */

const ONBOARDING_STORAGE_KEY = 'expmanager-onboarding-complete';

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {}
}
