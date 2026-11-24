import { motion } from 'motion/react';

export type Mood = 'happy' | 'think' | 'wow' | 'calm';

/** Capi, the capybara who teaches. Pure SVG, no assets. */
export default function Capi({
  size = 96,
  mood = 'happy',
  bounce = false,
  className = '',
}: {
  size?: number;
  mood?: Mood;
  bounce?: boolean;
  className?: string;
}) {
  const eye = (cx: number) =>
    mood === 'happy' ? (
      <path d={`M${cx - 6} 52 q6 -7 12 0`} stroke="#2B2118" strokeWidth="4" fill="none" strokeLinecap="round" />
    ) : (
      <g>
        <circle cx={cx} cy={mood === 'think' ? 49 : 51} r={mood === 'wow' ? 6.5 : 5.5} fill="#2B2118" />
        <circle cx={cx + 2} cy={mood === 'think' ? 47 : 49} r="2" fill="#fff" />
      </g>
    );

  const mouth =
    mood === 'wow' ? (
      <ellipse cx="60" cy="86" rx="6" ry="7" fill="#5A2E1C" />
    ) : mood === 'think' ? (
      <path d="M53 86 h12" stroke="#5A2E1C" strokeWidth="3.5" strokeLinecap="round" />
    ) : (
      <path d="M50 83 q10 9 20 0" stroke="#5A2E1C" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    );

  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      animate={bounce ? { y: [0, -8, 0], rotate: [0, -3, 3, 0] } : { y: [0, -2, 0] }}
      transition={{ duration: bounce ? 0.8 : 3, repeat: Infinity, ease: 'easeInOut' }}
      aria-label="Capi, a capivara"
      role="img"
    >
      {/* leaf hat */}
      <path d="M62 14 C 78 2, 98 8, 96 20 C 84 26, 70 24, 62 14 Z" fill="#2E9D5B" />
      <path d="M64 15 C 74 15, 84 16, 94 19" stroke="#1E6B3D" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* ears */}
      <ellipse cx="30" cy="27" rx="10" ry="9" fill="#8A5A3B" />
      <ellipse cx="90" cy="27" rx="10" ry="9" fill="#8A5A3B" />
      <ellipse cx="30" cy="28" rx="5" ry="4.5" fill="#5E3A24" />
      <ellipse cx="90" cy="28" rx="5" ry="4.5" fill="#5E3A24" />
      {/* head */}
      <rect x="16" y="22" width="88" height="86" rx="40" fill="#B07A4F" />
      <rect x="22" y="26" width="76" height="40" rx="20" fill="#BF8A5E" opacity="0.6" />
      {/* snout */}
      <rect x="30" y="60" width="60" height="40" rx="20" fill="#8E5C3A" />
      <ellipse cx="60" cy="70" rx="15" ry="7" fill="#4A2C1A" />
      <ellipse cx="54" cy="69" rx="3" ry="2" fill="#2B1A10" />
      <ellipse cx="66" cy="69" rx="3" ry="2" fill="#2B1A10" />
      {mouth}
      {/* eyes */}
      {eye(40)}
      {eye(80)}
      {/* cheeks */}
      <ellipse cx="30" cy="66" rx="6" ry="4" fill="#F2826A" opacity="0.55" />
      <ellipse cx="90" cy="66" rx="6" ry="4" fill="#F2826A" opacity="0.55" />
      {mood === 'wow' && (
        <g fill="#FFB627">
          <path d="M8 40 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" />
          <path d="M106 44 l2.5 5 5 .8 -4 3.4 1 5 -4.5 -2.5 -4.5 2.5 1 -5 -4 -3.4 5 -.8z" />
        </g>
      )}
    </motion.svg>
  );
}
