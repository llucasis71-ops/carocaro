import { useState } from 'react';
import { Lock, TrendingUp, AlertTriangle, Settings, FileText, Clock, Flame, CheckCircle2 } from 'lucide-react';
import Capi from '../components/Capi';
import Keypad from '../components/Keypad';
import { Page, ProgressBar } from '../components/ui';
import {
  useStore,
  setLevel,
  updateSettings,
  updateProfile,
  resetAll,
  skillAccuracy,
  weakSkills,
  today as todayKey,
  State,
} from '../lib/store';
import { OPS, OP_NAME, OP_SYMBOL, OP_COLOR, LEVELS, maxLevel } from '../lib/math';
import { navigate } from '../lib/router';

function PinGate({ onOk }: { onOk: () => void }) {
  const pin = useStore((s) => s.settings.pin);
  const [v, setV] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [forgot, setForgot] = useState(false);
  const creating = !pin;

  const submit = () => {
    if (forgot) {
      if (Number(v) === 37 * 6) {
        updateSettings({ pin: null });
        setForgot(false);
        setErr('');
      } else setErr('Resposta errada.');
      setV('');
      return;
    }
    if (v.length !== 4) return setErr('Use 4 números.');
    if (creating) {
      if (!first) {
        setFirst(v);
        setErr('');
      } else if (first === v) {
        updateSettings({ pin: v });
        onOk();
      } else {
        setFirst(null);
        setErr('As senhas não bateram. Comece de novo.');
      }
    } else if (v === pin) onOk();
    else setErr('Senha incorreta.');
    setV('');
  };

  return (
    <Page className="text-center">
      <Lock className="mx-auto text-leaf-dark mt-4" size={40} />
      <h1 className="font-display text-3xl font-bold mt-2">Área dos pais</h1>
      <p className="font-semibold text-muted mt-1 mb-6">
        {forgot
          ? 'Para criar uma nova senha, responda: quanto é 37 × 6?'
          : creating
            ? first
              ? 'Digite a senha de novo para confirmar.'
              : 'Crie uma senha de 4 números para esta área.'
            : 'Digite a senha de 4 números.'}
      </p>
      <div className="flex justify-center gap-3 mb-2">
        {forgot ? (
          <div className="h-14 min-w-32 rounded-2xl border-[3px] border-sand bg-white font-display text-3xl flex items-center justify-center px-4">
            {v || ' '}
          </div>
        ) : (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="w-12 h-14 rounded-2xl border-[3px] border-sand bg-white flex items-center justify-center text-3xl">
              {v[i] ? '•' : ''}
            </div>
          ))
        )}
      </div>
      <div className="h-6 text-coral-dark font-bold mb-3">{err}</div>
      <Keypad value={v} onChange={setV} onSubmit={submit} maxLength={forgot ? 4 : 4} />
      {!creating && !forgot && (
        <button className="mt-6 text-sm font-bold text-muted underline" onClick={() => setForgot(true)}>
          Esqueci a senha
        </button>
      )}
    </Page>
  );
}

function last7(s: State) {
  const out: { label: string; total: number; right: number; secs: number }[] = [];
  const names = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const v = s.days[k];
    out.push({ label: i === 0 ? 'hoje' : names[d.getDay()], total: v ? v.right + v.wrong : 0, right: v?.right ?? 0, secs: v?.secs ?? 0 });
  }
  return out;
}

function Dashboard() {
  const s = useStore((x) => x);
  const profile = s.profile!;
  const week = last7(s);
  const max = Math.max(5, ...week.map((d) => d.total));
  const weekTotal = week.reduce((a, d) => a + d.total, 0);
  const weekRight = week.reduce((a, d) => a + d.right, 0);
  const weekMin = Math.round(week.reduce((a, d) => a + d.secs, 0) / 60);
  const weak = weakSkills(s);
  const facts = Object.entries(s.facts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const [name, setName] = useState(profile.name);

  return (
    <Page>
      <div className="flex items-center gap-3 mb-5">
        <Capi size={56} mood="calm" />
        <div>
          <h1 className="font-display text-2xl font-bold">Painel dos pais</h1>
          <p className="text-sm font-bold text-muted">
            {profile.name} · {profile.grade}º ano
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-3 text-center">
          <CheckCircle2 className="mx-auto text-leaf" size={22} />
          <div className="font-display text-2xl font-bold">{weekTotal}</div>
          <div className="text-[11px] font-bold text-muted">contas na semana</div>
        </div>
        <div className="card p-3 text-center">
          <TrendingUp className="mx-auto text-river-dark" size={22} />
          <div className="font-display text-2xl font-bold">{weekTotal ? Math.round((weekRight / weekTotal) * 100) : 0}%</div>
          <div className="text-[11px] font-bold text-muted">de acerto de 1ª</div>
        </div>
        <div className="card p-3 text-center">
          <Clock className="mx-auto text-grape" size={22} />
          <div className="font-display text-2xl font-bold">{weekMin}</div>
          <div className="text-[11px] font-bold text-muted">minutos na semana</div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Últimos 7 dias</h2>
          <span className="text-sm font-bold text-muted flex items-center gap-1">
            <Flame size={16} className="text-coral" /> {s.streak.count} {s.streak.count === 1 ? 'dia' : 'dias'} seguidos
          </span>
        </div>
        <div className="flex items-end gap-2 h-32">
          {week.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div className="text-[11px] font-black text-muted">{d.total || ''}</div>
              <div className="w-full rounded-t-lg bg-sand relative overflow-hidden" style={{ height: `${(d.total / max) * 100}%`, minHeight: 4 }}>
                <div className="absolute bottom-0 left-0 right-0 bg-leaf" style={{ height: d.total ? `${(d.right / d.total) * 100}%` : 0 }} />
              </div>
              <div className="text-[11px] font-bold text-muted">{d.label}</div>
            </div>
          ))}
        </div>
        <div className="text-xs font-semibold text-muted mt-2">Verde: acertou de primeira. Bege: precisou de ajuda.</div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-display text-lg font-semibold mb-3">Raio-x por operação</h2>
        <div className="flex flex-col gap-4">
          {OPS.map((op) => {
            const acc = skillAccuracy(s, op);
            return (
              <div key={op}>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-7 h-7 rounded-lg text-white font-display font-bold flex items-center justify-center"
                    style={{ background: OP_COLOR[op] }}
                  >
                    {OP_SYMBOL[op]}
                  </span>
                  <span className="font-bold flex-1">
                    {OP_NAME[op]}{' '}
                    <span className="text-muted text-sm">
                      · nível {s.levels[op]}/{maxLevel(op)}: {LEVELS[op][s.levels[op] - 1]}
                    </span>
                  </span>
                  <span className="font-black text-sm">{acc.pct === null ? '—' : `${acc.pct}%`}</span>
                </div>
                <ProgressBar value={acc.pct ?? 0} max={100} color={OP_COLOR[op]} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-display text-lg font-semibold mb-1 flex items-center gap-2">
          <AlertTriangle size={20} className="text-coral" /> Onde está travando
        </h2>
        {weak.length === 0 ? (
          <p className="text-sm font-semibold text-muted">
            Nada preocupante por enquanto. Os pontos de dificuldade aparecem aqui depois de algumas contas de cada tipo.
          </p>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {weak.slice(0, 4).map((w) => (
              <div key={`${w.op}:${w.level}`} className="flex items-center gap-3 rounded-2xl bg-coral/10 p-3">
                <div className="flex-1">
                  <div className="font-bold">{LEVELS[w.op][w.level - 1]}</div>
                  <div className="text-xs font-bold text-muted">
                    {w.pct}% de acerto em {w.total} contas
                  </div>
                </div>
                <button
                  className="btn btn-ghost py-1.5 px-3 text-sm"
                  onClick={() => navigate(`/app/folhinha?op=${w.op}&level=${w.level}`)}
                >
                  <FileText size={16} /> Folhinha
                </button>
              </div>
            ))}
          </div>
        )}
        {facts.length > 0 && (
          <>
            <div className="text-sm font-extrabold text-muted mt-4 mb-2">Fatos que mais erra</div>
            <div className="flex flex-wrap gap-2">
              {facts.map(([k, n]) => (
                <span key={k} className="rounded-xl bg-white border-2 border-sand px-3 py-1 font-display font-semibold">
                  {k} <span className="text-coral text-sm">×{n}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
          <Settings size={20} /> Ajustes
        </h2>
        <label className="block text-sm font-extrabold text-muted mb-1">Nome</label>
        <div className="flex gap-2 mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            className="flex-1 rounded-xl border-2 border-sand bg-white px-3 py-2 font-bold"
          />
          <button className="btn btn-ghost py-2 text-base" onClick={() => name.trim() && updateProfile({ name: name.trim() })}>
            Salvar
          </button>
        </div>
        <label className="block text-sm font-extrabold text-muted mb-1">Ano escolar</label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((g) => (
            <button
              key={g}
              className={`btn py-2 text-base ${profile.grade === g ? 'btn-river' : 'btn-ghost'}`}
              onClick={() => updateProfile({ grade: g })}
            >
              {g}º
            </button>
          ))}
        </div>
        <label className="block text-sm font-extrabold text-muted mb-1">Meta diária</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[10, 20, 30].map((g) => (
            <button
              key={g}
              className={`btn py-2 text-base ${s.settings.dailyGoal === g ? 'btn-river' : 'btn-ghost'}`}
              onClick={() => updateSettings({ dailyGoal: g })}
            >
              {g} contas
            </button>
          ))}
        </div>
        <Toggle label="Voz da Capi" on={s.settings.voice} set={(v) => updateSettings({ voice: v })} />
        <Toggle label="Sons" on={s.settings.sound} set={(v) => updateSettings({ sound: v })} />
        <div className="text-sm font-extrabold text-muted mt-4 mb-1">Nível de cada operação</div>
        <p className="text-xs font-semibold text-muted mb-2">O app ajusta sozinho, mas você pode mudar se quiser.</p>
        {OPS.map((op) => (
          <div key={op} className="flex items-center gap-2 mb-2">
            <span className="w-24 font-bold">{OP_NAME[op]}</span>
            <select
              value={s.levels[op]}
              onChange={(e) => setLevel(op, Number(e.target.value))}
              className="flex-1 rounded-xl border-2 border-sand bg-white px-2 py-1.5 font-semibold text-sm"
            >
              {LEVELS[op].map((l, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}. {l}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex flex-col gap-2 mt-5">
          <button className="btn btn-ghost text-base" onClick={() => updateSettings({ pin: null })}>
            Trocar senha
          </button>
          <button
            className="btn btn-ghost text-base text-coral-dark"
            onClick={() => {
              if (confirm('Apagar todo o progresso deste aparelho? Isso não pode ser desfeito.')) {
                resetAll();
                navigate('/app', true);
              }
            }}
          >
            Apagar progresso
          </button>
        </div>
      </div>
      <p className="text-xs font-semibold text-muted text-center">
        O progresso fica salvo neste aparelho. Nada é enviado para a internet.
      </p>
    </Page>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button className="flex items-center justify-between w-full py-2" onClick={() => set(!on)}>
      <span className="font-bold">{label}</span>
      <span className={`w-14 h-8 rounded-full p-1 transition-colors ${on ? 'bg-leaf' : 'bg-sand'}`}>
        <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : ''}`} />
      </span>
    </button>
  );
}

export default function Parents() {
  const [ok, setOk] = useState(false);
  return ok ? <Dashboard /> : <PinGate onOk={() => setOk(true)} />;
}
