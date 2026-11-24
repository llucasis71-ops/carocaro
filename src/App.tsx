import { useEffect } from 'react';
import { Home as HomeIcon, Map, BookHeart, Lock } from 'lucide-react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './lib/store';
import { OPS, Op } from './lib/math';
import { PHASES } from './lib/game';
import Landing from './screens/Landing';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Adventure from './screens/Adventure';
import Play from './screens/Play';
import Race from './screens/Race';
import Worksheet from './screens/Worksheet';
import Album from './screens/Album';
import Parents from './screens/Parents';

const TABS = [
  { path: '', label: 'Início', icon: HomeIcon },
  { path: 'aventura', label: 'Aventura', icon: Map },
  { path: 'album', label: 'Álbum', icon: BookHeart },
  { path: 'pais', label: 'Pais', icon: Lock },
];

function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-paper border-t-2 border-sand pb-[env(safe-area-inset-bottom)] no-print">
      <div className="max-w-xl mx-auto grid grid-cols-4 gap-1 px-2 py-2">
        {TABS.map((t) => {
          const on = active === t.path;
          return (
            <button
              key={t.path}
              onClick={() => navigate(`/app${t.path ? '/' + t.path : ''}`)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-extrabold transition-colors ${
                on ? 'bg-sun text-forest' : 'text-muted'
              }`}
            >
              <t.icon size={22} />
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to]);
  return null;
}

function AppShell({ parts, query }: { parts: string[]; query: URLSearchParams }) {
  const profile = useStore((s) => s.profile);
  const phases = useStore((s) => s.phases);
  if (!profile) return <Onboarding />;

  const [section, arg] = parts;
  switch (section) {
    case 'fase': {
      const phase = PHASES.find((p) => p.id === Number(arg));
      const current = PHASES.find((p) => !phases[p.id])?.id ?? 11;
      if (!phase || phase.id > current) return <Redirect to="/app/aventura" />;
      return <Play key={`fase-${phase.id}`} mode={{ kind: 'phase', phase }} />;
    }
    case 'missao':
      return <Play key="missao" mode={{ kind: 'mission' }} />;
    case 'treino': {
      const op = (OPS.includes(arg as Op) ? arg : 'add') as Op;
      return <Play key={`treino-${op}`} mode={{ kind: 'practice', op }} />;
    }
    case 'corrida':
      return <Race />;
    case 'folhinha':
      return <Worksheet query={query} />;
  }

  const tab = section ?? '';
  return (
    <div className="min-h-dvh bg-cream">
      {tab === 'aventura' ? <Adventure /> : tab === 'album' ? <Album /> : tab === 'pais' ? <Parents /> : <Home />}
      <BottomNav active={['aventura', 'album', 'pais'].includes(tab) ? tab : ''} />
    </div>
  );
}

export default function App() {
  const { parts, query } = useRoute();
  if (parts[0] === 'app') return <AppShell parts={parts.slice(1)} query={query} />;
  return <Landing />;
}
