import { useEffect, useState, useRef } from 'react';
import { SettingsDropdown } from '@/components/SettingsDropdown';
import { PhaseDrawer } from '@/components/PhaseDrawer';
import { ChatPanel } from '@/components/ChatPanel';
import { EmptyState } from '@/components/EmptyState';
import { HomeView } from '@/components/HomeView';
import { ClientPageView } from '@/components/ClientPageView';
import { AltClientDashboard } from '@/components/AltClientDashboard';
import { CreateClientModal } from '@/components/modals/CreateClientModal';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { CreateJourneyModal } from '@/components/modals/CreateJourneyModal';
import { SignInPage } from '@/components/SignInPage';
import { AdminPanel } from '@/components/AdminPanel';
import { useStore } from '@/store';
import { onAuthStateChange } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

function App() {
  const initAuth = useStore((s) => s.initAuth);
  const isSignedIn = useStore((s) => s.isSignedIn);
  const showAdminPanel = useStore((s) => s.showAdminPanel);
  const setShowAdminPanel = useStore((s) => s.setShowAdminPanel);
  const clients = useStore((s) => s.clients);
  const selectedClientId = useStore((s) => s.selectedClientId);
  const altDashboardClientId = useStore((s) => s.altDashboardClientId);
  const createClientModalOpen = useStore((s) => s.createClientModalOpen);
  const createProjectModalOpen = useStore((s) => s.createProjectModalOpen);
  const createJourneyModalOpen = useStore((s) => s.createJourneyModalOpen);
  const setCreateClientModalOpen = useStore((s) => s.setCreateClientModalOpen);
  const setCreateProjectModalOpen = useStore((s) => s.setCreateProjectModalOpen);
  const setCreateJourneyModalOpen = useStore((s) => s.setCreateJourneyModalOpen);
  const darkMode = useStore((s) => s.darkMode);
  const saveError = useStore((s) => s.saveError);
  const setSaveError = useStore((s) => s.setSaveError);
  const loadError = useStore((s) => s.loadError);
  const setLoadError = useStore((s) => s.setLoadError);
  const loadState = useStore((s) => s.loadState);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const initAuthRef = useRef(initAuth);
  initAuthRef.current = initAuth;
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = onAuthStateChange((session) => {
      if (!session) initAuthRef.current();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const showNoClient = clients.length === 0;
  const showHome = !selectedClientId;
  const showClientPage = selectedClientId && !altDashboardClientId;
  const goHome = useStore((s) => s.goHome);

  if (!isSignedIn) {
    return <SignInPage />;
  }

  if (showAdminPanel) {
    return (
      <AdminPanel onClose={() => setShowAdminPanel(false)} />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-subtle dark:bg-gradient-subtle-dark">
      <main className="flex flex-1 flex-col overflow-hidden">
        {(saveError || loadError) && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-red-100 px-4 py-2 text-sm text-red-800 dark:bg-red-900/40 dark:text-red-200">
            <span className="min-w-0 flex-1 truncate" title={saveError || loadError || ''}>
              {saveError && <>Save failed: {saveError}</>}
              {saveError && loadError && ' · '}
              {loadError && <>Load failed: {loadError} (showing local data). Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel if this is production.</>}
            </span>
            <span className="flex shrink-0 gap-2">
              {loadError && (
                <button
                  type="button"
                  onClick={() => { setLoadError(null); loadState(); }}
                  className="rounded px-2 py-1 hover:bg-red-200 dark:hover:bg-red-800"
                >
                  Retry load
                </button>
              )}
              <button
                type="button"
                onClick={() => { setSaveError(null); setLoadError(null); }}
                className="rounded px-2 py-1 hover:bg-red-200 dark:hover:bg-red-800"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </span>
          </div>
        )}
        {!showClientPage && (
          <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#5B21B6] bg-[#6D28D9] px-6 py-3 dark:border-violet-900 dark:bg-[#6D28D9]">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <button
                onClick={goHome}
                className="shrink-0 transition-opacity hover:opacity-90"
                title="Home"
              >
                <img src="/XPM.svg" alt="ExpManager" className="h-8 w-auto brightness-0 invert" />
              </button>
              {!showNoClient && (
                <>
                  <span className="shrink-0 text-white/60">|</span>
                  <h2 className="shrink-0 text-lg font-bold tracking-tight text-white">Clients</h2>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!showNoClient && (
                <button
                  onClick={() => setCreateClientModalOpen(true)}
                  className="rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-[#6D28D9] shadow-soft transition-all duration-200 hover:bg-white/90 hover:shadow-glow active:translate-y-0"
                >
                  Add client
                </button>
              )}
              <SettingsDropdown />
            </div>
          </div>
        )}
        {showNoClient && (
          <div className="flex flex-1 flex-col p-10 md:p-14">
            <EmptyState
              title="No clients yet"
              description="Create your first client to get started with journey mapping."
              action={
                <button
                  onClick={() => setCreateClientModalOpen(true)}
                  className="rounded-2xl bg-accent px-8 py-4 font-medium text-white hover:bg-accent-hover"
                >
                  Create client
                </button>
              }
            />
          </div>
        )}

        {!showNoClient && showHome && (
          <HomeView />
        )}

        {altDashboardClientId && <AltClientDashboard />}
        {showClientPage && <ClientPageView />}
      </main>
      <PhaseDrawer />
      <CreateClientModal isOpen={createClientModalOpen} onClose={() => setCreateClientModalOpen(false)} />
      <CreateProjectModal isOpen={createProjectModalOpen} onClose={() => setCreateProjectModalOpen(false)} />
      <CreateJourneyModal isOpen={createJourneyModalOpen} onClose={() => setCreateJourneyModalOpen(false)} />
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />

      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-elevated hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        aria-label="Open chat"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

    </div>
  );
}

export default App;
