import { useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { Page, Stars } from '../components/ui';
import { useStore, buySticker } from '../lib/store';
import { STICKERS, PHASES } from '../lib/game';
import { sfx, speak } from '../lib/voice';

export default function Album() {
  const owned = useStore((s) => s.stickers);
  const stars = useStore((s) => s.stars);
  const [just, setJust] = useState<string | null>(null);

  return (
    <Page>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl font-bold">Álbum</h1>
        <Stars />
      </div>
      <p className="text-sm font-bold text-muted mb-5">
        {owned.length}/{STICKERS.length} figurinhas. Ganhe nas fases ou troque por estrelas.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {STICKERS.map((st) => {
          const has = owned.includes(st.id);
          const phase = PHASES.find((p) => p.sticker === st.id);
          const canBuy = !has && st.price !== undefined && stars >= st.price;
          return (
            <motion.button
              key={st.id}
              animate={just === st.id ? { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] } : {}}
              onClick={() => {
                if (has) {
                  speak(st.name);
                  return;
                }
                if (st.price !== undefined && buySticker(st.id, st.price)) {
                  sfx('win');
                  setJust(st.id);
                  speak(`Você ganhou a figurinha ${st.name}!`);
                }
              }}
              className={`card aspect-[3/4] flex flex-col items-center justify-center p-2 ${has ? '' : 'bg-sand/40!'}`}
            >
              <span className="text-5xl" style={{ filter: has ? 'none' : 'grayscale(1) brightness(0.4) opacity(0.35)' }}>
                {st.emoji}
              </span>
              <span className="text-sm font-extrabold mt-1">{has ? st.name : '???'}</span>
              {!has &&
                (st.price !== undefined ? (
                  <span
                    className={`mt-1 text-xs font-black rounded-full px-2 py-0.5 flex items-center gap-1 ${
                      canBuy ? 'bg-sun text-forest' : 'bg-white text-muted'
                    }`}
                  >
                    <Star size={12} className="fill-current" /> {st.price}
                  </span>
                ) : (
                  <span className="mt-1 text-[11px] font-bold text-muted">Fase {phase?.id}</span>
                ))}
            </motion.button>
          );
        })}
      </div>
    </Page>
  );
}
