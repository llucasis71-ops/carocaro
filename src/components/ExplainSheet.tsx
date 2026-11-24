import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Volume2, Pause, Lightbulb } from 'lucide-react';
import Capi from './Capi';
import BoardView from './BoardView';
import { explain } from '../lib/explain';
import { Problem, OP_SYMBOL } from '../lib/math';
import { speak, stopSpeaking, useVoiceStatus } from '../lib/voice';
import { useStore } from '../lib/store';

export default function ExplainSheet({
  problem,
  onDone,
  doneLabel = 'Entendi! ▶',
}: {
  problem: Problem;
  onDone: () => void;
  doneLabel?: string;
}) {
  const steps = useMemo(() => explain(problem), [problem]);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const step = steps[i];
  const voiceStatus = useVoiceStatus();
  const voiceOn = useStore((s) => s.settings.voice);
  const last = i === steps.length - 1;

  useEffect(() => {
    speak(step.say, () => {
      if (auto && !last) setTimeout(() => setI((x) => Math.min(x + 1, steps.length - 1)), 700);
    });
  }, [i, auto]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopSpeaking(), []);

  const go = (d: number) => {
    setAuto(false);
    stopSpeaking();
    setI((x) => Math.max(0, Math.min(steps.length - 1, x + d)));
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-forest/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="w-full sm:max-w-lg bg-cream rounded-t-[2rem] sm:rounded-[2rem] p-4 pb-6 max-h-[94dvh] overflow-y-auto"
        role="dialog"
        aria-label="Explicação passo a passo"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-lg font-semibold text-leaf-dark">
            A Capi explica: {problem.a} {OP_SYMBOL[problem.op]} {problem.b}
          </div>
          <div className="text-sm font-bold text-muted">
            {i + 1}/{steps.length}
          </div>
        </div>
        <div className="flex gap-1 mb-3">
          {steps.map((_, k) => (
            <div key={k} className={`h-1.5 flex-1 rounded-full ${k <= i ? 'bg-leaf' : 'bg-sand'}`} />
          ))}
        </div>

        {voiceOn && voiceStatus === 'unavailable' && (
          <div className="mb-3 rounded-2xl bg-sun/25 border-2 border-sun px-3 py-2 text-sm font-bold text-forest">
            🔇 Este navegador não tem a voz da Capi. Para ouvir, abra o site no Chrome (Android) ou no Safari (iPhone). A
            explicação continua aqui por escrito.
          </div>
        )}
        <div className="flex items-start gap-2 mb-3">
          <Capi size={76} pose={step.tip ? 'ideia' : last ? 'joinha' : 'estudando'} className="shrink-0" />
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className={`relative flex-1 rounded-2xl px-4 py-3 text-[17px] font-semibold leading-snug ${
                step.tip ? 'bg-sun/30 border-2 border-sun' : 'bg-white border-2 border-sand'
              }`}
            >
              {step.tip && (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-sun-dark mb-1">
                  <Lightbulb size={14} /> Dica
                  <br />
                </span>
              )}
              <div>{step.say}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="card dotgrid p-4 min-h-44 flex items-center justify-center">
          <BoardView board={step.board} />
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button className="btn btn-ghost px-3" onClick={() => go(-1)} disabled={i === 0} aria-label="Voltar">
            <ChevronLeft />
          </button>
          <button
            className="btn btn-ghost px-3"
            onClick={() => {
              if (auto) {
                setAuto(false);
                stopSpeaking();
              } else {
                setAuto(true);
              }
            }}
            aria-label={auto ? 'Pausar' : 'Ouvir'}
          >
            {auto ? <Pause /> : <Volume2 />}
          </button>
          {last ? (
            <button className="btn btn-sun flex-1" onClick={onDone}>
              {doneLabel}
            </button>
          ) : (
            <button className="btn btn-leaf flex-1" onClick={() => go(1)}>
              Próximo <ChevronRight />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
