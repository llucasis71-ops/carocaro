import { motion } from 'motion/react';

/** Illustrated poses of Capi (files in /public/capi). */
export type Pose =
  | 'ideia' // pointing up with a light bulb: tips, default happy
  | 'ops' // surprised with the orange: first mistake
  | 'quase' // scratching head, sweat drop: "quase!"
  | 'estudando' // at the laptop: explaining
  | 'rosto' // face close-up: avatar
  | 'joinha' // thumbs up: right answer, encouragement
  | 'caderno' // writing in a notebook: thinking, worksheet
  | 'trofeu' // holding a trophy: phase / mission / record
  | 'prancheta'; // clipboard with chart: parents area

export type Mood = 'happy' | 'think' | 'wow' | 'calm' | 'oops';

const MOOD_POSE: Record<Mood, Pose> = {
  happy: 'ideia',
  think: 'caderno',
  wow: 'joinha',
  calm: 'quase',
  oops: 'ops',
};

const ALT: Record<Pose, string> = {
  ideia: 'Capi tendo uma ideia',
  ops: 'Capi surpresa',
  quase: 'Capi sem graça',
  estudando: 'Capi no computador',
  rosto: 'Capi sorrindo',
  joinha: 'Capi fazendo joinha',
  caderno: 'Capi escrevendo no caderno',
  trofeu: 'Capi com troféu',
  prancheta: 'Capi com prancheta',
};

export const POSES = Object.keys(ALT) as Pose[];

/** Capi, the capybara who teaches. `size` is the rendered height in px. */
export default function Capi({
  size = 96,
  mood = 'happy',
  pose,
  bounce = false,
  className = '',
}: {
  size?: number;
  mood?: Mood;
  pose?: Pose;
  bounce?: boolean;
  className?: string;
}) {
  const p = pose ?? MOOD_POSE[mood];
  return (
    <motion.img
      key={p}
      src={`/capi/${p}.webp`}
      alt={ALT[p]}
      draggable={false}
      className={`select-none pointer-events-none object-contain ${className}`}
      style={{ height: size, width: 'auto', maxWidth: size * 1.4 }}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={
        bounce
          ? { scale: 1, opacity: 1, y: [0, -8, 0], rotate: [0, -3, 3, 0] }
          : { scale: 1, opacity: 1, y: [0, -2, 0] }
      }
      transition={{
        scale: { duration: 0.25 },
        opacity: { duration: 0.2 },
        y: { duration: bounce ? 0.8 : 3, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
      }}
    />
  );
}

/** Preload every pose so swaps are instant. */
export function preloadCapi() {
  POSES.forEach((p) => {
    const img = new Image();
    img.src = `/capi/${p}.webp`;
  });
}
