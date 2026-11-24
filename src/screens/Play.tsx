import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HelpCircle, RotateCcw, Star } from 'lucide-react';
import Capi, { Mood } from '../components/Capi';
import Keypad from '../components/Keypad';
import ExplainSheet from '../components/ExplainSheet';
import { ColumnView, LongDivView } from '../components/BoardView';
import { TopBar, ProgressBar } from '../components/ui';
import { Op, OP_SYMBOL, OP_NAME, LEVELS, Problem, generate, maxLevel, opsForGrade, isColumnProblem } from '../lib/math';
import { armedBoard } from '../lib/explain';
import {
  getState,
  recordAttempt,
  countSolved,
  finishPhase,
  dailyCount,
  pickMissionOp,
  addTime,
  useStore,
} from '../lib/store';
import { Phase, PHASES, PRAISE, ENCOURAGE, pickOne, phaseStars, stickerById } from '../lib/game';
import { speak, sfx, stopSpeaking } from '../lib/voice';
import { navigate } from '../lib/router';

export type PlayMode = { kind: 'phase'; phase: Phase } | { kind: 'mission' } | { kind: 'practice'; op: Op };

type Status = 'answer' | 'retryOffer' | 'explain' | 'afterExplain' | 'right' | 'done';

function nextProblem(mode: PlayMode, prevKey?: string): Problem {
  const s = getState();
  const grade = s.profile?.grade ?? 3;
  const allowed = opsForGrade(grade);
  let op: Op;
  let bonus = 0;
  if (mode.kind === 'phase') {
    const ops = mode.phase.ops.filter((o) => allowed.includes(o));
    const pool: Op[] = ops.length ? ops : ['add', 'sub'];
    op = pool[Math.floor(Math.random() * pool.length)];
    bonus = mode.phase.bonus;
  } else if (mode.kind === 'mission') {
    op = pickMissionOp(s, allowed);
  } else {
    op = mode.op;
  }
  const level = Math.min(maxLevel(op), s.levels[op] + bonus);
  return generate(op, level, prevKey);
}

function River({ built, total, sticker, done }: { built: number; total: number; sticker: string; done: boolean }) {
  const pos = 6 + (built / total) * 80;
  return (
    <div className="relative h-36 rounded-3xl overflow-hidden border-2 border-sand bg-gradient-to-b from-[#BFE6F7] to-[#E8F6FC]">
      <div className="absolute top-3 left-6 w-14 h-5 bg-white/80 rounded-full" />
      <div className="absolute top-6 right-16 w-10 h-4 bg-white/70 rounded-full" />
      <div className="absolute bottom-0 left-0 right-0 h-14 water" />
      <div className="absolute bottom-0 left-0 w-[10%] h-16 bg-leaf rounded-tr-3xl" />
      <div className="absolute bottom-0 right-0 w-[12%] h-16 bg-leaf rounded-tl-3xl flex items-start justify-center">
        <motion.span
          className="text-3xl -mt-8"
          animate={done ? { scale: [1, 1.4, 1], rotate: [0, 10, -10, 0] } : {}}
          transition={{ repeat: done ? Infinity : 0, duration: 1 }}
          style={{ filter: done ? 'none' : 'grayscale(0.6)' }}
        >
          {stickerById(sticker)?.emoji}
        </motion.span>
      </div>
      {/* bridge */}
      <div className="absolute bottom-10 left-[10%] right-[12%] flex gap-[3px] h-4">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex-1 relative">
            {i < built ? (
              <motion.div
                initial={{ y: -40, opacity: 0, rotate: -10 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12 }}
                className="absolute inset-0 rounded-sm bg-bark border-b-4 border-[#5E3A24]"
              />
            ) : (
              <div className="absolute inset-0 rounded-sm border-2 border-dashed border-white/70" />
            )}
          </div>
        ))}
      </div>
      <motion.div
        className="absolute bottom-12"
        animate={{ left: `calc(${pos}% - 24px)` }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <Capi size={52} mood={done ? 'wow' : 'happy'} bounce={done} />
      </motion.div>
    </div>
  );
}

function Trail({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="card p-4">
      <div className="flex justify-between text-sm font-extrabold text-muted mb-2">
        <span>{label}</span>
        <span>
          {Math.min(value, max)}/{max}
        </span>
      </div>
      <ProgressBar value={value} max={max} />
    </div>
  );
}

export default function Play({ mode }: { mode: PlayMode }) {
  const goal = useStore((s) => s.settings.dailyGoal);
  const today = useStore(dailyCount);
  const [problem, setProblem] = useState<Problem>(() => nextProblem(mode));
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('answer');
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState<{ text: string; mood: Mood } | null>(null);
  const [shake, setShake] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [starPop, setStarPop] = useState(0);
  const [missionCelebrated, setMissionCelebrated] = useState(() => mode.kind === 'mission' && dailyCount(getState()) >= getState().settings.dailyGoal);
  const [showGoal, setShowGoal] = useState(false);
  const lastAct = useRef(Date.now());
  const adapt = true;

  const phase = mode.kind === 'phase' ? mode.phase : null;
  const practiceOp: Op = mode.kind === 'practice' ? mode.op : 'add';

  // time tracking
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastAct.current < 60000) addTime(10);
    }, 10000);
    return () => {
      clearInterval(t);
      stopSpeaking();
    };
  }, []);

  const title =
    mode.kind === 'phase' ? `Fase ${mode.phase.id} · ${mode.phase.name}` : mode.kind === 'mission' ? 'Missão do dia' : `Treino: ${OP_NAME[mode.op]}`;

  const advance = useCallback(
    (wasFirstTry: boolean) => {
      countSolved();
      const n = solved + 1;
      setSolved(n);
      sfx('right');
      if (wasFirstTry) {
        setStarPop((x) => x + 1);
        setTimeout(() => sfx('coin'), 150);
      }
      const praise = pickOne(PRAISE);
      setMsg({ text: praise, mood: 'wow' });
      speak(praise);
      setStatus('right');

      if (phase && n >= phase.count) {
        setTimeout(() => {
          finishPhase(phase.id, phaseStars(mistakes), phase.sticker);
          sfx('win');
          setStatus('done');
          speak(`Você atravessou o rio! Ganhou ${phaseStars(mistakes)} estrelas e a figurinha ${stickerById(phase.sticker)?.name}!`);
        }, 900);
        return;
      }
      if (mode.kind === 'mission' && !missionCelebrated && dailyCount(getState()) >= getState().settings.dailyGoal) {
        setMissionCelebrated(true);
        setTimeout(() => {
          sfx('win');
          setShowGoal(true);
          speak('Missão do dia cumprida! Parabéns!');
        }, 900);
      }
      setTimeout(() => {
        setProblem((p) => nextProblem(mode, p.key));
        setInput('');
        setAttempts(0);
        setMsg(null);
        setStatus('answer');
      }, 1000);
    },
    [solved, phase, mistakes, mode, missionCelebrated],
  );

  const submit = () => {
    lastAct.current = Date.now();
    const correct = Number(input) === problem.answer;
    if (status === 'answer') {
      if (attempts === 0) {
        const res = recordAttempt(problem, correct, adapt);
        if (res.levelChange === 1) {
          const lv = getState().levels[problem.op];
          setTimeout(() => {
            sfx('level');
            setToast(`Subiu de nível em ${OP_NAME[problem.op]}: ${LEVELS[problem.op][lv - 1]}!`);
            setTimeout(() => setToast(null), 3200);
          }, 700);
        }
      }
      if (correct) {
        advance(attempts === 0);
        return;
      }
      sfx('wrong');
      setShake((x) => x + 1);
      if (attempts === 0) {
        setMistakes((m) => m + 1);
        setAttempts(1);
        const t = pickOne(ENCOURAGE);
        setMsg({ text: `${t} Quer tentar de novo ou quer que eu explique?`, mood: 'calm' });
        speak(`${t} Quer tentar de novo, ou quer que eu explique?`);
        setStatus('retryOffer');
      } else {
        setAttempts(2);
        setStatus('explain');
      }
      return;
    }
    if (status === 'afterExplain') {
      if (correct) {
        advance(false);
      } else {
        sfx('wrong');
        setShake((x) => x + 1);
        setMsg({ text: `A resposta é ${problem.answer}. Digite ${problem.answer} para continuar.`, mood: 'calm' });
      }
    }
  };

  // Armed (vertical) view of the problem, with the typed digits in the answer row.
  const armed = useMemo(() => (isColumnProblem(problem) ? armedBoard(problem) : null), [problem]);
  const armedWithInput = useMemo(() => {
    if (!armed) return null;
    if (armed.kind === 'column') {
      const result: Record<number, string> = {};
      input.split('').reverse().forEach((d, i) => (result[i] = d));
      return { ...armed, width: Math.max(armed.width, input.length), result };
    }
    if (armed.kind === 'longdiv') return { ...armed, quotient: input };
    return null;
  }, [armed, input]);

  const keypadDisabled = status === 'right' || status === 'done' || status === 'explain' || status === 'retryOffer';

  if (status === 'done' && phase) {
    const stars = phaseStars(mistakes);
    const next = PHASES.find((p) => p.id === phase.id + 1);
    const st = stickerById(phase.sticker);
    return (
      <div className="min-h-dvh bg-cream">
        <TopBar title={title} backTo="/app/aventura" />
        <main className="max-w-xl mx-auto px-4 pt-6 pb-20 text-center">
          <River built={phase.count} total={phase.count} sticker={phase.sticker} done />
          <motion.h2 initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="font-display text-4xl font-bold text-leaf-dark mt-6">
            Fase completa!
          </motion.h2>
          <div className="flex justify-center gap-2 my-4">
            {[1, 2, 3].map((k) => (
              <motion.div key={k} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 * k }}>
                <Star size={56} className={k <= stars ? 'fill-sun text-sun-dark' : 'fill-sand text-sand'} />
              </motion.div>
            ))}
          </div>
          <div className="card p-4 inline-flex items-center gap-3 mb-6">
            <span className="text-5xl">{st?.emoji}</span>
            <div className="text-left">
              <div className="text-sm font-bold text-muted">Figurinha nova no álbum</div>
              <div className="font-display text-2xl font-semibold">{st?.name}</div>
            </div>
          </div>
          <p className="text-muted font-semibold mb-6">
            {mistakes === 0 ? 'Sem nenhum erro! Que fera!' : `Você errou ${mistakes} ${mistakes === 1 ? 'vez' : 'vezes'} e aprendeu com cada uma.`}{' '}
            +{stars * 5} ⭐
          </p>
          <div className="flex flex-col gap-3">
            {next && (
              <button className="btn btn-sun w-full text-xl py-4" onClick={() => navigate(`/app/fase/${next.id}`, true)}>
                Próxima fase: {next.name} ▶
              </button>
            )}
            <button className="btn btn-ghost w-full" onClick={() => navigate('/app/aventura')}>
              Voltar ao mapa
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar
        title={title}
        backTo={mode.kind === 'phase' ? '/app/aventura' : '/app'}
        right={
          <div className="relative flex items-center gap-1 rounded-full bg-white border-2 border-sand px-3 py-1 font-extrabold">
            <Star size={18} className="fill-sun text-sun-dark" />
            <StarCount />
            <AnimatePresence>
              {starPop > 0 && (
                <motion.span
                  key={starPop}
                  initial={{ y: 0, opacity: 1 }}
                  animate={{ y: -26, opacity: 0 }}
                  transition={{ duration: 0.9 }}
                  className="absolute -top-1 right-1 text-sm font-black text-sun-dark"
                >
                  +1
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        }
      />
      <main className="max-w-xl mx-auto px-4 pt-4 pb-8 flex flex-col gap-4">
        {phase ? (
          <River built={solved} total={phase.count} sticker={phase.sticker} done={false} />
        ) : mode.kind === 'mission' ? (
          <Trail value={today} max={goal} label="Contas de hoje" />
        ) : (
          <Trail value={solved % 10} max={10} label={`Nível ${getState().levels[practiceOp]}: ${LEVELS[practiceOp][getState().levels[practiceOp] - 1]}`} />
        )}

        {/* Problem */}
        <motion.div key={shake} className={`card px-4 py-5 ${shake ? 'wobble' : ''}`}>
          {armedWithInput ? (
            <div className="flex justify-center">
              {armedWithInput.kind === 'column' ? <ColumnView board={armedWithInput} /> : <LongDivView board={armedWithInput} />}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 font-display font-semibold text-5xl sm:text-6xl">
              <span>{problem.a}</span>
              <span className="text-leaf">{OP_SYMBOL[problem.op]}</span>
              <span>{problem.b}</span>
              <span className="text-muted">=</span>
              <span
                className={`min-w-20 px-2 h-16 rounded-2xl border-[3px] flex items-center justify-center ${
                  status === 'right' ? 'border-leaf bg-leaf/10 text-leaf-dark' : 'border-dashed border-river bg-white'
                }`}
              >
                {input || <span className="text-sand">?</span>}
              </span>
            </div>
          )}
        </motion.div>

        {/* Capi feedback */}
        <div className="flex items-center gap-2 min-h-16">
          <Capi size={56} mood={msg?.mood ?? 'happy'} bounce={status === 'right'} className="shrink-0" />
          <AnimatePresence mode="wait">
            <motion.div
              key={msg?.text ?? 'idle'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white border-2 border-sand rounded-2xl px-4 py-2 font-bold text-[16px]"
            >
              {msg?.text ??
                (status === 'afterExplain'
                  ? 'Agora é sua vez: digite a resposta!'
                  : armed
                    ? 'Resolva no quadro, começando pela direita.'
                    : 'Quanto dá?')}
            </motion.div>
          </AnimatePresence>
        </div>

        {status === 'retryOffer' ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              className="btn btn-ghost py-4"
              onClick={() => {
                stopSpeaking();
                setInput('');
                setMsg({ text: 'Você consegue! Tente de novo.', mood: 'happy' });
                setStatus('answer');
              }}
            >
              <RotateCcw size={20} /> Tentar de novo
            </button>
            <button className="btn btn-sun py-4" onClick={() => setStatus('explain')}>
              <HelpCircle size={20} /> Me explica
            </button>
          </div>
        ) : (
          <Keypad value={input} onChange={setInput} onSubmit={submit} disabled={keypadDisabled} />
        )}

        {status === 'afterExplain' && (
          <button className="text-river-dark font-bold underline" onClick={() => setStatus('explain')}>
            Ver a explicação de novo
          </button>
        )}
      </main>

      <AnimatePresence>
        {status === 'explain' && (
          <ExplainSheet
            key={problem.key}
            problem={problem}
            onDone={() => {
              stopSpeaking();
              setInput('');
              setMsg(null);
              setStatus('afterExplain');
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            className="fixed top-3 left-3 right-3 z-50 max-w-md mx-auto bg-grape text-white rounded-2xl px-4 py-3 font-bold shadow-lg text-center"
          >
            ⬆️ {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGoal && (
          <motion.div
            className="fixed inset-0 z-50 bg-forest/60 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="bg-cream rounded-[2rem] p-6 text-center max-w-sm w-full">
              <Capi size={110} mood="wow" bounce className="mx-auto" />
              <h2 className="font-display text-3xl font-bold text-leaf-dark mt-2">Missão cumprida!</h2>
              <p className="font-semibold text-muted mt-2 mb-5">Você fez {goal} contas hoje. Amanhã tem mais!</p>
              <div className="flex flex-col gap-3">
                <button className="btn btn-sun" onClick={() => navigate('/app')}>
                  Voltar ao início
                </button>
                <button className="btn btn-ghost" onClick={() => setShowGoal(false)}>
                  Continuar treinando
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StarCount() {
  const stars = useStore((s) => s.stars);
  return <span>{stars}</span>;
}
