import { ReactNode } from 'react';
import { ArrowLeft, Star, Flame } from 'lucide-react';
import { navigate } from '../lib/router';
import { useStore } from '../lib/store';

export function TopBar({ title, backTo = '/app', right }: { title: string; backTo?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b-2 border-sand no-print">
      <div className="max-w-xl mx-auto flex items-center gap-3 px-4 h-16">
        <button
          onClick={() => navigate(backTo)}
          className="w-10 h-10 rounded-xl bg-white border-2 border-sand flex items-center justify-center"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold flex-1 truncate">{title}</h1>
        {right ?? <Stars />}
      </div>
    </header>
  );
}

export function Stars() {
  const stars = useStore((s) => s.stars);
  return (
    <div className="flex items-center gap-1 rounded-full bg-white border-2 border-sand px-3 py-1 font-extrabold">
      <Star size={18} className="fill-sun text-sun-dark" /> {stars}
    </div>
  );
}

export function Streak() {
  const streak = useStore((s) => s.streak);
  return (
    <div className="flex items-center gap-1 rounded-full bg-white border-2 border-sand px-3 py-1 font-extrabold">
      <Flame size={18} className="fill-coral text-coral-dark" /> {streak.count}
    </div>
  );
}

export function ProgressBar({ value, max, color = 'var(--color-leaf)' }: { value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="h-4 rounded-full bg-sand overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`max-w-xl mx-auto px-4 pb-28 pt-4 ${className}`}>{children}</main>;
}
