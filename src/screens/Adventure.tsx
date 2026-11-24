import { motion } from 'motion/react';
import { Lock, Star } from 'lucide-react';
import Capi from '../components/Capi';
import { Page, Stars } from '../components/ui';
import { useStore } from '../lib/store';
import { PHASES, stickerById } from '../lib/game';
import { OP_SYMBOL } from '../lib/math';
import { navigate } from '../lib/router';

export default function Adventure() {
  const phases = useStore((s) => s.phases);
  const current = PHASES.find((p) => !phases[p.id])?.id ?? 11;

  return (
    <Page>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-3xl font-bold">Rio das Contas</h1>
          <p className="text-sm font-bold text-muted">Construa a ponte e ganhe as figurinhas.</p>
        </div>
        <Stars />
      </div>

      <div className="relative mt-2 overflow-x-hidden pt-14 pb-4">
        {/* river ribbon */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-24 water rounded-full opacity-30" />
        <div className="relative flex flex-col-reverse gap-6">
          {PHASES.map((p, idx) => {
            const stars = phases[p.id] ?? 0;
            const unlocked = p.id <= current;
            const isCurrent = p.id === current;
            const offset = Math.sin(idx * 1.1) * 70;
            const sticker = stickerById(p.sticker);
            return (
              <div key={p.id} className="flex justify-center" style={{ transform: `translateX(${offset}px)` }}
                ref={isCurrent ? (el) => el?.scrollIntoView({ block: 'center' }) : undefined}>
                <motion.button
                  whileTap={unlocked ? { scale: 0.94 } : {}}
                  disabled={!unlocked}
                  onClick={() => navigate(`/app/fase/${p.id}`)}
                  className="relative flex flex-col items-center"
                >
                  {isCurrent && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                      <Capi size={52} bounce />
                    </div>
                  )}
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 ${
                      stars
                        ? 'bg-sun border-sun-dark'
                        : isCurrent
                          ? 'bg-leaf border-leaf-dark text-white'
                          : 'bg-sand border-[#E5D2AE] text-muted'
                    }`}
                    style={{ boxShadow: `0 6px 0 ${stars ? '#D98E00' : isCurrent ? '#1E6B3D' : '#E5D2AE'}` }}
                  >
                    {unlocked ? (
                      stars ? (
                        sticker?.emoji
                      ) : (
                        <span className="font-display font-bold text-3xl">{p.id}</span>
                      )
                    ) : (
                      <Lock size={28} />
                    )}
                  </div>
                  <div className="flex gap-0.5 mt-2">
                    {[1, 2, 3].map((k) => (
                      <Star key={k} size={16} className={k <= stars ? 'fill-sun text-sun-dark' : 'fill-sand text-sand'} />
                    ))}
                  </div>
                  <div className="text-sm font-extrabold mt-0.5 bg-cream/90 rounded-lg px-2">{p.name}</div>
                  <div className="text-xs font-bold text-muted">{p.ops.map((o) => OP_SYMBOL[o]).join(' ')}</div>
                </motion.button>
              </div>
            );
          })}
        </div>
      </div>
      {current > 10 && (
        <div className="card p-5 mt-8 text-center">
          <div className="text-4xl">🏆</div>
          <div className="font-display text-2xl font-semibold">Você atravessou o rio inteiro!</div>
          <p className="text-muted font-semibold">Jogue as fases de novo para ganhar 3 estrelas em todas.</p>
        </div>
      )}
    </Page>
  );
}
