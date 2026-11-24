import { motion } from 'motion/react';
import { Board, ColumnBoard, LongDivBoard } from '../lib/explain';

const pop = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
};

function Dots({ board }: { board: Extract<Board, { kind: 'dots' }> }) {
  const dots: string[] = [];
  board.groups.forEach((g) => {
    for (let i = 0; i < g.n; i++) dots.push(g.color);
  });
  const total = dots.length;
  const frames = Math.max(1, Math.ceil(total / 10));
  const crossFrom = total - board.crossed;
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {Array.from({ length: frames }, (_, f) => (
        <div key={f} className="grid grid-cols-5 gap-1.5 p-2 rounded-xl bg-white border-2 border-sand">
          {Array.from({ length: 10 }, (_, k) => {
            const idx = f * 10 + k;
            const color = dots[idx];
            return (
              <div key={k} className="w-7 h-7 rounded-md bg-cream flex items-center justify-center">
                {color && (
                  <motion.div
                    {...pop}
                    transition={{ delay: (idx % 10) * 0.03 }}
                    className="relative w-5.5 h-5.5 rounded-full"
                    style={{ background: color, opacity: idx >= crossFrom ? 0.35 : 1 }}
                  >
                    {idx >= crossFrom && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (idx - crossFrom) * 0.08 }}
                        className="absolute inset-0 flex items-center justify-center text-coral-dark font-black text-lg leading-none"
                      >
                        ✕
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ArrayView({ board }: { board: Extract<Board, { kind: 'array' }> }) {
  const size = Math.min(22, Math.floor(200 / Math.max(board.cols, 1)));
  return (
    <div className="flex flex-col gap-1.5 items-start mx-auto">
      {Array.from({ length: board.rows }, (_, r) => (
        <div key={r} className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg bg-white border border-sand">
            {Array.from({ length: board.cols }, (_, c) => (
              <motion.div
                key={c}
                {...pop}
                transition={{ delay: r * 0.06 + c * 0.015 }}
                className="rounded-full"
                style={{ width: size, height: size, background: r % 2 ? '#3BA7D9' : '#F29E38' }}
              />
            ))}
          </div>
          {board.labels && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: r * 0.25 }}
              className="text-sm font-bold bg-sun/30 text-forest rounded-md px-1.5"
            >
              {(r + 1) * board.cols}
            </motion.span>
          )}
        </div>
      ))}
    </div>
  );
}

function Share({ board }: { board: Extract<Board, { kind: 'share' }> }) {
  return (
    <div className="flex flex-col items-center gap-3">
      {!board.filled && (
        <div className="flex flex-wrap justify-center gap-1 max-w-xs">
          {Array.from({ length: board.total }, (_, i) => (
            <motion.div key={i} {...pop} transition={{ delay: i * 0.01 }} className="w-3.5 h-3.5 rounded-full bg-[#F29E38]" />
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: board.groups }, (_, g) => (
          <div
            key={g}
            className="min-w-14 min-h-14 rounded-full border-2 border-dashed border-grape/60 bg-white p-2 flex flex-wrap gap-1 items-center justify-center content-center"
            style={{ width: board.per > 6 ? 84 : 64 }}
          >
            {board.filled &&
              Array.from({ length: board.per }, (_, k) => (
                <motion.div
                  key={k}
                  {...pop}
                  transition={{ delay: k * 0.18 + g * 0.03 }}
                  className="w-3.5 h-3.5 rounded-full bg-grape"
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

const CELL = 'w-10 h-12 flex items-center justify-center';

export function ColumnView({ board }: { board: ColumnBoard }) {
  const cols = board.width + 1;
  const col = (i: number) => board.width - i + 1; // grid column (1-based) for digit index i
  const cells = (render: (i: number) => React.ReactNode, extra = '') =>
    Array.from({ length: board.width }, (_, k) => {
      const i = board.width - 1 - k;
      return (
        <div
          key={i}
          className={`${CELL} ${extra} ${board.hl === i ? 'bg-sun/35' : ''}`}
          style={{ gridColumn: col(i) + 0 }}
        >
          {render(i)}
        </div>
      );
    });

  return (
    <div
      className="grid mx-auto font-display text-4xl font-semibold text-ink"
      style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}
    >
      {/* above: carries / borrows */}
      <div className={`${CELL} h-8`} style={{ gridColumn: 1 }} />
      {cells(
        (i) =>
          board.above[i] ? (
            <motion.span {...pop} className="text-xl font-bold text-coral">
              {board.above[i]}
            </motion.span>
          ) : null,
        'h-8! rounded-t-lg',
      )}
      {/* top */}
      <div className={CELL} style={{ gridColumn: 1 }} />
      {cells((i) =>
        board.top[i] !== undefined ? (
          <span className={board.crossed.includes(i) ? 'relative text-muted/60' : ''}>
            {board.top[i]}
            {board.crossed.includes(i) && (
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="absolute left-[-4px] right-[-4px] top-1/2 h-[3px] bg-coral origin-left -rotate-12"
              />
            )}
          </span>
        ) : null,
      )}
      {/* bottom with sign */}
      <div className={`${CELL} text-leaf-dark`} style={{ gridColumn: 1 }}>
        {board.sign}
      </div>
      {cells((i) => (board.bottom[i] !== undefined ? board.bottom[i] : null))}
      {/* line */}
      <div className="h-1 bg-ink rounded-full my-1" style={{ gridColumn: `1 / span ${cols}` }} />
      {/* result */}
      <div className={CELL} style={{ gridColumn: 1 }} />
      {cells(
        (i) =>
          board.result[i] !== undefined ? (
            <motion.span {...pop} className="text-leaf-dark">
              {board.result[i]}
            </motion.span>
          ) : null,
        'rounded-b-lg',
      )}
    </div>
  );
}

export function LongDivView({ board }: { board: LongDivBoard }) {
  const len = board.dividend.length;
  const inHl = (i: number) => board.hl && i >= board.hl[0] && i <= board.hl[1];
  const grid = { gridTemplateColumns: `1.6rem repeat(${len}, 2.3rem)` };
  return (
    <div className="flex items-start justify-center font-display text-3xl font-semibold">
      <div className="grid" style={grid}>
        <div className="h-11" />
        {board.dividend.split('').map((d, i) => (
          <div key={i} className={`h-11 flex items-center justify-center rounded-md ${inHl(i) ? 'bg-sun/40' : ''}`}>
            {d}
          </div>
        ))}
        {board.rows.map((row, r) => (
          <RowCells key={r} row={row} len={len} />
        ))}
      </div>
      <div className="ml-1">
        <div className="h-11 flex items-center px-3 border-l-4 border-b-4 border-ink">{board.divisor}</div>
        <div className="h-11 flex items-center px-3 text-leaf-dark">
          {board.quotient.split('').map((d, i) => (
            <motion.span key={i} {...pop}>
              {d}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

function RowCells({ row, len }: { row: LongDivBoard['rows'][number]; len: number }) {
  return (
    <>
      <div className="h-10 flex items-center justify-center text-coral">{row.minus ? '−' : ''}</div>
      {Array.from({ length: len }, (_, i) => {
        const underline = row.line && i >= row.line[0] && i <= row.line[1];
        return (
          <div
            key={i}
            className={`h-10 flex items-center justify-center ${row.minus ? 'text-coral' : 'text-ink'} ${
              underline ? 'border-t-[3px] border-ink' : ''
            }`}
          >
            {row.cells[i] !== undefined && <motion.span {...pop}>{row.cells[i]}</motion.span>}
          </div>
        );
      })}
    </>
  );
}

export default function BoardView({ board }: { board: Board }) {
  const caption = 'caption' in board ? board.caption : undefined;
  return (
    <div className="flex flex-col items-center gap-3 w-full overflow-x-auto py-1">
      {board.kind === 'dots' && <Dots board={board} />}
      {board.kind === 'array' && <ArrayView board={board} />}
      {board.kind === 'share' && <Share board={board} />}
      {board.kind === 'column' && <ColumnView board={board} />}
      {board.kind === 'longdiv' && <LongDivView board={board} />}
      {caption && (
        <motion.div
          key={caption}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl font-semibold text-forest bg-sun/25 rounded-xl px-4 py-1"
        >
          {caption}
        </motion.div>
      )}
    </div>
  );
}
