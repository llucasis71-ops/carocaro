import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Timer } from 'lucide-react';
import Capi from '../components/Capi';
import Keypad from '../components/Keypad';
import { TopBar, Page } from '../components/ui';
import { makeProblem, Problem, OP_SYMBOL, generate } from '../lib/math';
import { recordAttempt, saveRace, useStore, addTime } from '../lib/store';
import { sfx, speak } from '../lib/voice';

const DURATION = 60;

type Mode = { id: string; label: string; sub: string };
const MODES: Mode[] = [
  { id: 'soma', label: '+', sub: 'Soma rápida' },
  ...[2, 3, 4, 5, 6, 7, 8, 9].map((t) => ({ id: `t${t}`, label: `×${t}`, sub: `Tabuada do ${t}` })),
  { id: 'mix', label: '×?', sub: 'Tabuada misturada' },
];

function gen(mode: string, prev?: string): Problem {
  for (;;) {
    let p: Problem;
    if (mode === 'soma') p = generate('add', 2);
    else if (mode === 'mix') p = makeProblem('mul', 2 + Math.floor(Math.random() * 8), 2 + Math.floor(Math.random() * 9), 3);
    else {
      const t = Number(mode.slice(1));
      p = makeProblem('mul', t, 1 + Math.floor(Math.random() * 10), 3);
    }
    if (p.key !== prev) return p;
  }
}

export default function Race() {
  const best = useStore((s) => s.raceBest);
  const [mode, setMode] = useState<string | null>(null);
  const [phase, setPhase] = useState<'pick' | 'count' | 'run' | 'end'>('pick');
  const [count, setCount] = useState(3);
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [input, setInput] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [record, setRecord] = useState(false);
  const scoreRef = useRef(0);

  const start = (m: string) => {
    setMode(m);
    setScore(0);
    scoreRef.current = 0;
    setTime(DURATION);
    setCount(3);
    setPhase('count');
  };

  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      setProblem(gen(mode!));
      setInput('');
      setPhase('run');
      return;
    }
    sfx('tap');
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count, mode]);

  useEffect(() => {
    if (phase !== 'run') return;
    if (time <= 0) {
      const isRecord = saveRace(mode!, scoreRef.current);
      setRecord(isRecord);
      addTime(DURATION);
      sfx('win');
      speak(isRecord ? `Novo recorde! ${scoreRef.current} contas!` : `Fim! Você fez ${scoreRef.current} contas.`);
      setPhase('end');
      return;
    }
    const t = setTimeout(() => setTime((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, time, mode]);

  const submit = () => {
    if (!problem) return;
    const ok = Number(input) === problem.answer;
    recordAttempt(problem, ok, false);
    if (ok) {
      sfx('right');
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setFlash(null);
    } else {
      sfx('wrong');
      setFlash(`${problem.a} ${OP_SYMBOL[problem.op]} ${problem.b} = ${problem.answer}`);
    }
    setProblem(gen(mode!, problem.key));
    setInput('');
  };

  if (phase === 'pick')
    return (
      <div className="min-h-dvh bg-cream">
        <TopBar title="Corrida da Tabuada" />
        <Page>
          <div className="flex items-center gap-3 mb-5">
            <Capi size={90} pose="ideia" />
            <p className="font-bold text-muted">Quantas contas você acerta em 60 segundos? Escolha a pista:</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => start(m.id)} className="card p-3 text-center">
                <div className="font-display text-3xl font-bold text-river-dark">{m.label}</div>
                <div className="text-xs font-bold text-muted">{m.sub}</div>
                {best[m.id] ? (
                  <div className="text-xs font-black text-sun-dark mt-1 flex items-center justify-center gap-1">
                    <Trophy size={12} /> {best[m.id]}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </Page>
      </div>
    );

  if (phase === 'count')
    return (
      <div className="min-h-dvh bg-river flex items-center justify-center">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-display text-9xl font-bold text-white"
        >
          {count || 'Já!'}
        </motion.div>
      </div>
    );

  if (phase === 'end')
    return (
      <div className="min-h-dvh bg-cream">
        <TopBar title="Corrida da Tabuada" />
        <Page className="text-center">
          <Capi size={150} pose="trofeu" bounce className="mx-auto" />
          <h2 className="font-display text-4xl font-bold mt-2">{record ? 'Novo recorde!' : 'Fim da corrida!'}</h2>
          <div className="font-display text-7xl font-bold text-leaf-dark my-3">{score}</div>
          <p className="font-bold text-muted mb-6">contas certas · recorde: {Math.max(best[mode!] ?? 0, score)}</p>
          <div className="flex flex-col gap-3">
            <button className="btn btn-sun text-xl py-4" onClick={() => start(mode!)}>
              Correr de novo ▶
            </button>
            <button className="btn btn-ghost" onClick={() => setPhase('pick')}>
              Escolher outra pista
            </button>
          </div>
        </Page>
      </div>
    );

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar
        title="Corrida"
        right={
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 font-black ${time <= 10 ? 'bg-coral text-white' : 'bg-white border-2 border-sand'}`}>
            <Timer size={18} /> {time}s
          </div>
        }
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-8 flex flex-col gap-4">
        <div className="relative h-14 rounded-full bg-sand overflow-hidden">
          <motion.div className="absolute inset-y-0 left-0 bg-leaf/30" animate={{ width: `${((DURATION - time) / DURATION) * 100}%` }} />
          <motion.div className="absolute top-0.5" animate={{ left: `calc(${Math.min(score * 3, 90)}% )` }}>
            <Capi size={50} pose="ideia" />
          </motion.div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 font-display text-2xl font-bold text-leaf-dark">{score}</div>
        </div>
        {problem && (
          <div className="card py-6 flex items-center justify-center gap-3 font-display font-semibold text-6xl">
            <span>{problem.a}</span>
            <span className="text-leaf">{OP_SYMBOL[problem.op]}</span>
            <span>{problem.b}</span>
            <span className="text-muted">=</span>
            <span className="min-w-20 h-16 px-2 rounded-2xl border-[3px] border-dashed border-river bg-white flex items-center justify-center">
              {input || <span className="text-sand">?</span>}
            </span>
          </div>
        )}
        <div className="h-7 text-center font-bold text-coral-dark">{flash && `Era: ${flash}`}</div>
        <Keypad value={input} onChange={setInput} onSubmit={submit} maxLength={3} />
      </main>
    </div>
  );
}
