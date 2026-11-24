import { useMemo, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { TopBar } from '../components/ui';
import { Op, OPS, OP_NAME, OP_SYMBOL, LEVELS, Problem, generate, isColumnProblem } from '../lib/math';
import { useStore, weakSkills } from '../lib/store';

function Item({ p, n, answers }: { p: Problem; n: number; answers: boolean }) {
  const ans = answers ? String(p.answer) : '';
  if (p.op === 'div' && isColumnProblem(p)) {
    return (
      <div className="flex items-start gap-2 font-display text-2xl break-inside-avoid">
        <span className="text-xs font-sans font-bold text-muted mt-1">{n})</span>
        <div className="flex">
          <div className="pr-2 pt-0.5">{p.a}</div>
          <div>
            <div className="border-l-2 border-b-2 border-ink px-2">{p.b}</div>
            <div className="px-2 text-leaf-dark min-h-8">{ans}</div>
          </div>
        </div>
      </div>
    );
  }
  if (isColumnProblem(p)) {
    const w = Math.max(String(p.a).length, String(p.b).length, String(p.answer).length);
    const row = (v: string, sign = '') => (
      <>
        <span className="text-center text-leaf-dark">{sign}</span>
        {v.padStart(w, ' ').split('').map((ch, i) => (
          <span key={i} className="text-center">
            {ch.trim()}
          </span>
        ))}
      </>
    );
    return (
      <div className="flex items-start gap-2 break-inside-avoid">
        <span className="text-xs font-bold text-muted mt-1">{n})</span>
        <div className="grid font-display text-2xl leading-9" style={{ gridTemplateColumns: `repeat(${w + 1}, 1.3rem)` }}>
          {row(String(p.a))}
          {row(String(p.b), OP_SYMBOL[p.op])}
          <div className="border-t-2 border-ink" style={{ gridColumn: `1 / span ${w + 1}` }} />
          {ans ? <span className="contents text-leaf-dark">{row(ans)}</span> : <div className="h-9" />}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 font-display text-xl sm:text-2xl whitespace-nowrap break-inside-avoid">
      <span className="text-xs font-sans font-bold text-muted">{n})</span>
      <span>
        {p.a} {OP_SYMBOL[p.op]} {p.b} =
      </span>
      <span className="inline-block min-w-12 border-b-2 border-ink text-center text-leaf-dark">{ans}</span>
    </div>
  );
}

export default function Worksheet({ query }: { query: URLSearchParams }) {
  const profile = useStore((s) => s.profile);
  const levels = useStore((s) => s.levels);
  const skills = useStore((s) => s.skills);
  const weak = useMemo(() => weakSkills({ skills } as Parameters<typeof weakSkills>[0]), [skills]);
  const qOp = query.get('op') as Op | null;
  const [op, setOp] = useState<Op | 'auto'>(qOp && OPS.includes(qOp) ? qOp : 'auto');
  const [level, setLevel] = useState<number>(Number(query.get('level')) || (qOp ? levels[qOp] : 1));
  const [qty, setQty] = useState(20);
  const [seed, setSeed] = useState(0);

  const problems = useMemo(() => {
    const out: Problem[] = [];
    const seen = new Set<string>();
    const sources: { op: Op; level: number }[] =
      op === 'auto'
        ? weak.length
          ? weak.slice(0, 3).map((w) => ({ op: w.op, level: w.level }))
          : OPS.map((o) => ({ op: o, level: levels[o] }))
        : [{ op, level }];
    let guard = 0;
    while (out.length < qty && guard++ < 500) {
      const src = sources[out.length % sources.length];
      const p = generate(src.op, src.level);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      out.push(p);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, level, qty, seed]);

  const title =
    op === 'auto' ? (weak.length ? 'Reforço: onde mais erra' : 'Revisão das 4 operações') : `${OP_NAME[op]} · ${LEVELS[op][level - 1]}`;

  const Sheet = ({ answers }: { answers: boolean }) => (
    <div className={`print-sheet bg-white rounded-3xl border-2 border-sand p-6 ${answers ? 'page-break mt-6' : ''}`}>
      <div className="flex items-end justify-between border-b-2 border-ink pb-2 mb-5">
        <div>
          <div className="font-display text-2xl font-bold">Conta Comigo · {answers ? 'Gabarito' : 'Folhinha de reforço'}</div>
          <div className="text-sm font-bold text-muted">{title}</div>
        </div>
        {!answers && (
          <div className="text-sm font-bold text-right leading-7">
            Nome: {profile?.name ? <span className="underline">{profile.name}</span> : '________________'}
            <br />
            Data: ____/____/______
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-4 gap-x-6 gap-y-7">
        {problems.map((p, i) => (
          <Item key={i} p={p} n={i + 1} answers={answers} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-cream">
      <TopBar title="Folhinha" />
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-16">
        <div className="card p-4 mb-5 no-print flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button className={`btn py-2 text-base ${op === 'auto' ? 'btn-river' : 'btn-ghost'}`} onClick={() => setOp('auto')}>
              ✨ Onde trava
            </button>
            {OPS.map((o) => (
              <button
                key={o}
                className={`btn py-2 text-base ${op === o ? 'btn-river' : 'btn-ghost'}`}
                onClick={() => {
                  setOp(o);
                  setLevel(levels[o]);
                }}
              >
                {OP_SYMBOL[o]} {OP_NAME[o]}
              </button>
            ))}
          </div>
          {op !== 'auto' && (
            <select
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
              className="rounded-xl border-2 border-sand bg-white px-3 py-2 font-bold"
            >
              {LEVELS[op].map((l, i) => (
                <option key={i} value={i + 1}>
                  Nível {i + 1}: {l}
                </option>
              ))}
            </select>
          )}
          {op === 'auto' && (
            <p className="text-sm font-semibold text-muted">
              {weak.length
                ? `Mistura o que mais precisa de reforço: ${weak
                    .slice(0, 3)
                    .map((w) => LEVELS[w.op][w.level - 1])
                    .join(', ')}.`
                : 'Ainda não temos dados de erros. A folhinha mistura as 4 operações no nível atual.'}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {[12, 20, 32].map((n) => (
              <button key={n} className={`btn py-2 text-base ${qty === n ? 'btn-river' : 'btn-ghost'}`} onClick={() => setQty(n)}>
                {n} contas
              </button>
            ))}
            <div className="flex-1" />
            <button className="btn btn-ghost py-2 text-base" onClick={() => setSeed((s) => s + 1)}>
              <RefreshCw size={18} /> Outra
            </button>
            <button className="btn btn-sun py-2 text-base" onClick={() => window.print()}>
              <Printer size={18} /> Imprimir / PDF
            </button>
          </div>
        </div>
        <Sheet answers={false} />
        <div className="no-print text-center text-sm font-bold text-muted mt-6">O gabarito sai na página seguinte ao imprimir.</div>
        <div className="hidden print:block">
          <Sheet answers />
        </div>
      </main>
    </div>
  );
}
