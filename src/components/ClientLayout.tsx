import { useEffect } from 'react';
import { NavLink, useParams, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useStore } from '@/store';
import { SettingsDropdown } from '@/components/SettingsDropdown';

const tabs = [
  { id: 'insights', label: 'Insights' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'journeys', label: 'Journeys' },
  { id: 'opportunities', label: 'Opportunities' },
];

export function ClientLayout() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const clients = useStore((s) => s.clients);
  const setSelectedClientId = useStore((s) => s.setSelectedClientId);
  const goHome = useStore((s) => s.goHome);

  const client = clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (clientId) setSelectedClientId(clientId);
  }, [clientId, setSelectedClientId]);

  if (!client) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#2d1648] bg-[#361D60] px-6 py-3 dark:border-[#2d1648] dark:bg-[#361D60]">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <button
            onClick={() => { goHome(); navigate('/'); }}
            className="shrink-0 transition-opacity hover:opacity-90"
            title="Home"
          >
            <img src="/XPM.svg" alt="ExpManager" className="h-[1.6rem] w-auto brightness-0 invert" />
          </button>
          <span className="shrink-0 text-white/60">|</span>
          <h2 className="truncate text-lg font-bold tracking-tight text-white">{client.name}</h2>
          <nav className="flex shrink-0 gap-1" aria-label="Tabs">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={`/clients/${clientId}/${tab.id}`}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SettingsDropdown />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-auto min-h-0 bg-[#E6E7E9] dark:bg-stone-900">
        <Outlet />
      </div>
    </div>
  );
}
