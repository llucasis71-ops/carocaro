import { motion } from 'motion/react';
import { Zap, FileText, Play, Target } from 'lucide-react';
import Capi from '../components/Capi';
import { Stars, Streak, ProgressBar, Page } from '../components/ui';
import { useStore, dailyCount } from '../lib/store';
import { OPS, OP_NAME, OP_SYMBOL, OP_COLOR, LEVELS, opsForGrade } from '../lib/math';
import { PHASES } from '../lib/game';
import { navigate } from '../lib/router';

export default function Home() {
  const profile = useStore((s) => s.profile)!;
  const levels = useStore((s) => s.levels);
  const phases = useStore((s) => s.phases);
  const goal = useStore((s) => s.settings.dailyGoal);
  const today = useStore(dailyCount);
  const allowed = opsForGrade(profile.grade);
  const nextPhase = PHASES.find((p) => !phases[p.id]) ?? PHASES[PHASES.length - 1];
  const doneCount = Object.keys(phases).length;
  const missionDone = today >= goal;

  return (
    <Page>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-white border-2 border-sand flex items-center justify-center overflow-hidden">
          <Capi size={52} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-2xl font-semibold truncate">Oi, {profile.name}!</div>
          <div className="text-sm font-bold text-muted">Rio das Contas · {profile.grade}º ano</div>
        </div>
        <Streak />
        <Stars />
      </div>

      {/* Adventure */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/app/aventura')}
        className="relative w-full text-left rounded-[2rem] overflow-hidden bg-leaf text-white p-5 mb-4"
        style={{ boxShadow: '0 6px 0 var(--color-leaf-dark)' }}
      >
        <div className="absolute -right-6 -bottom-8 opacity-95">
          <Capi size={150} mood="wow" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 water opacity-60" />
        <div className="relative max-w-[62%]">
          <div className="text-xs font-extrabold uppercase tracking-wider text-white/80">Aventura · {doneCount}/10 fases</div>
          <div className="font-display text-3xl font-bold leading-tight mt-1">Atravesse o Rio das Contas</div>
          <div className="text-sm font-semibold text-white/90 mt-1 mb-4">Cada conta certa é uma tábua na ponte.</div>
          <span className="btn btn-sun text-base py-2 px-4">
            <Play size={18} className="fill-current" /> Fase {nextPhase.id}
          </span>
        </div>
      </motion.button>

      {/* Mission */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 font-display text-xl font-semibold">
            <Target className="text-coral" /> Missão do dia
          </div>
          <div className="text-sm font-extrabold text-muted">
            {Math.min(today, goal)}/{goal} contas
          </div>
        </div>
        <p className="text-sm font-semibold text-muted mb-3">
          {missionDone ? 'Missão cumprida! Pode continuar treinando se quiser.' : 'Uns 10 minutinhos. A Capi escolhe o que você mais precisa treinar.'}
        </p>
        <ProgressBar value={today} max={goal} color="var(--color-coral)" />
        <button className={`btn w-full mt-4 ${missionDone ? 'btn-ghost' : 'btn-coral'}`} onClick={() => navigate('/app/missao')}>
          {missionDone ? 'Treinar mais' : today > 0 ? 'Continuar missão ▶' : 'Começar missão ▶'}
        </button>
      </div>

      {/* Practice per op */}
      <h2 className="font-display text-xl font-semibold mb-2 mt-6">Treino livre</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {OPS.map((op) => {
          const locked = !allowed.includes(op);
          return (
            <button
              key={op}
              onClick={() => navigate(`/app/treino/${op}`)}
              className="card p-4 text-left active:translate-y-0.5 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-display text-3xl font-bold"
                  style={{ background: OP_COLOR[op] }}
                >
                  {OP_SYMBOL[op]}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg font-semibold">{OP_NAME[op]}</div>
                  <div className="text-xs font-bold text-muted">
                    {locked ? 'Desafio extra' : `Nível ${levels[op]}/${LEVELS[op].length}`}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => navigate('/app/corrida')} className="card p-4 text-left">
          <Zap className="text-sun-dark fill-sun mb-1" size={28} />
          <div className="font-display text-lg font-semibold">Corrida da Tabuada</div>
          <div className="text-xs font-bold text-muted">60 segundos. Bata seu recorde!</div>
        </button>
        <button onClick={() => navigate('/app/folhinha')} className="card p-4 text-left">
          <FileText className="text-river-dark mb-1" size={28} />
          <div className="font-display text-lg font-semibold">Folhinha</div>
          <div className="text-xs font-bold text-muted">Exercícios para imprimir, com gabarito.</div>
        </button>
      </div>
    </Page>
  );
}
