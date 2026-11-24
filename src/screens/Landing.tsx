import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2, Map, BarChart3, FileText, Zap, ShieldCheck, WifiOff, HeartHandshake, Play } from 'lucide-react';
import Capi from '../components/Capi';
import Keypad from '../components/Keypad';
import ExplainSheet from '../components/ExplainSheet';
import BoardView, { ColumnView } from '../components/BoardView';
import { makeProblem } from '../lib/math';
import { armedBoard, explain } from '../lib/explain';
import { navigate } from '../lib/router';
import { sfx, speak } from '../lib/voice';

const start = () => navigate('/app');

function Demo() {
  const problem = useMemo(() => makeProblem('add', 47, 38, 5), []);
  const armed = useMemo(() => armedBoard(problem)!, [problem]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<'ask' | 'right' | 'explain' | 'wrong'>('ask');

  const board =
    armed.kind === 'column'
      ? { ...armed, result: Object.fromEntries(input.split('').reverse().map((d, i) => [i, d])) }
      : armed;

  return (
    <div className="card p-5 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Capi size={64} pose={state === 'right' ? 'joinha' : state === 'wrong' ? 'ops' : 'ideia'} bounce={state === 'right'} className="shrink-0" />
        <div className="font-bold">
          {state === 'right'
            ? 'Isso! Viu como é? Agora imagine isso todo dia, 10 minutinhos.'
            : state === 'wrong'
              ? 'Errou? Sem problema! Toque em "Me explica" e veja a mágica.'
              : 'Teste você mesmo: quanto é 47 + 38? Erre de propósito, se quiser!'}
        </div>
      </div>
      <div className={`flex justify-center bg-cream rounded-2xl py-3 mb-4 ${state === 'wrong' ? 'wobble' : ''}`}>
        {board.kind === 'column' && <ColumnView board={board} />}
      </div>
      {state === 'right' ? (
        <button className="btn btn-sun w-full text-xl py-4" onClick={start}>
          Começar agora, é grátis ▶
        </button>
      ) : state === 'wrong' ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="btn btn-ghost"
            onClick={() => {
              setInput('');
              setState('ask');
            }}
          >
            Tentar de novo
          </button>
          <button className="btn btn-sun" onClick={() => setState('explain')}>
            Me explica 🔊
          </button>
        </div>
      ) : (
        <Keypad
          value={input}
          onChange={setInput}
          onSubmit={() => {
            if (Number(input) === problem.answer) {
              sfx('right');
              speak('Isso! Mandou bem!');
              setState('right');
            } else {
              sfx('wrong');
              setState('wrong');
            }
          }}
          maxLength={3}
          disabled={state === 'explain'}
        />
      )}
      <AnimatePresence>
        {state === 'explain' && (
          <ExplainSheet
            problem={problem}
            doneLabel="Entendi! ▶"
            onDone={() => {
              setInput('');
              setState('ask');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PhoneMock() {
  const steps = useMemo(() => explain(makeProblem('sub', 52, 27, 5)), []);
  const board = steps[1].board;
  return (
    <div className="relative mx-auto w-[260px] h-[520px] rounded-[2.6rem] bg-forest p-2.5 shadow-2xl rotate-2">
      <div className="w-full h-full rounded-[2.1rem] bg-cream overflow-hidden flex flex-col">
        <div className="px-4 pt-5 pb-2 flex items-center gap-2">
          <Capi size={44} pose="estudando" />
          <div className="text-[11px] font-bold leading-tight bg-white border border-sand rounded-xl px-2 py-1">
            2 − 7 não dá. Pedimos 1 emprestado das dezenas...
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center scale-[0.78]">
          <BoardView board={board} />
        </div>
        <div className="px-4 pb-6">
          <div className="h-2 rounded-full bg-sand overflow-hidden mb-3">
            <div className="h-full w-2/3 bg-leaf rounded-full" />
          </div>
          <div className="btn btn-leaf w-full text-sm py-2">Próximo ▶</div>
        </div>
      </div>
    </div>
  );
}

const PAINS = [
  ['😮‍💨', 'Você chega cansado e ainda tem lição pra explicar.', 'E a continha simples vira meia hora de discussão.'],
  ['🙄', '"Não é assim que a professora ensina!"', 'Você explica de um jeito, a escola de outro, e ninguém se entende.'],
  ['📱', 'O celular vira moeda de troca.', 'E as horas de joguinho não ensinam nada.'],
];

const FEATURES = [
  { icon: Map, title: 'Aventura no Rio das Contas', text: '10 fases: cada conta certa vira uma tábua da ponte. Atravessou, ganhou figurinha.' },
  { icon: Volume2, title: 'A Capi explica com voz', text: 'Errou? Ela mostra passo a passo: conta armada, "vai um", empréstimo, método da chave.' },
  { icon: Zap, title: 'Nível que se ajusta sozinho', text: 'Acertou 5 seguidas, sobe. Travou, a Capi volta um passo. Do 1º ao 5º ano.' },
  { icon: BarChart3, title: 'Painel dos pais', text: 'Veja quanto treinou, o acerto em cada operação e exatamente onde está travando.' },
  { icon: FileText, title: 'Folhinhas para imprimir', text: 'Exercícios ilimitados com gabarito, focados no que mais precisa de reforço.' },
  { icon: WifiOff, title: 'Funciona como app', text: 'Instale na tela inicial do celular. Sem anúncios, sem chat com estranhos.' },
];

const FAQ = [
  ['Para qual idade é?', 'Crianças do 1º ao 5º ano (6 a 11 anos). No começo você escolhe o ano escolar e o app ajusta o nível sozinho.'],
  ['Precisa baixar na loja?', 'Não. Abre no navegador e dá para instalar na tela inicial como um app ("Adicionar à tela inicial").'],
  ['A explicação é igual à da escola?', 'Sim. Usamos os métodos ensinados nas escolas brasileiras: conta armada, "vai um", empréstimo e divisão pelo método da chave.'],
  ['Meu filho vai ficar só jogando?', 'O jogo só avança com a conta certa. E a missão do dia tem cerca de 10 minutos. É tela com propósito.'],
  ['Os dados do meu filho vão para a internet?', 'Não. O progresso fica salvo no próprio aparelho.'],
];

export default function Landing() {
  return (
    <div className="bg-cream text-ink">
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur border-b-2 border-sand">
        <div className="max-w-5xl mx-auto flex items-center gap-2 px-4 h-16">
          <Capi size={44} pose="rosto" />
          <div className="font-display text-2xl font-bold flex-1">
            Conta <span className="text-leaf">Comigo</span>
          </div>
          <button className="btn btn-sun py-2 text-base" onClick={start}>
            Jogar grátis
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-14 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border-2 border-sand px-4 py-1.5 text-sm font-extrabold text-muted mb-5">
            🧮 Matemática do 1º ao 5º ano
          </div>
          <h1 className="font-display text-[2.6rem] sm:text-6xl font-bold leading-[1.05]">
            A lição de matemática <span className="text-leaf">sem briga.</span>
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-muted mt-5">
            Ele joga, a conta abre o caminho. Errou? A <b className="text-ink">Capi explica com voz, passo a passo, do jeito da escola</b>. E
            você só acompanha.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-7 justify-center md:justify-start">
            <button className="btn btn-sun text-xl py-4 px-7" onClick={start}>
              <Play className="fill-current" size={20} /> Começar grátis
            </button>
            <a href="#demo" className="btn btn-ghost text-lg py-4">
              Testar uma conta ↓
            </a>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-6 justify-center md:justify-start text-sm font-bold text-muted">
            <span>✅ 10 minutos por dia</span>
            <span>✅ Sem anúncios</span>
            <span>✅ Funciona no celular</span>
          </div>
        </div>
        <PhoneMock />
      </section>

      {/* Pains */}
      <section className="bg-forest text-white py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-8">A hora da lição não precisa ser assim</h2>
          <div className="flex flex-col gap-3">
            {PAINS.map(([e, t, d]) => (
              <div key={t} className="rounded-3xl bg-white/8 border border-white/15 p-5 flex gap-4">
                <span className="text-4xl">{e}</span>
                <div>
                  <div className="font-display text-xl font-semibold">{t}</div>
                  <div className="text-white/75 font-semibold">{d}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-semibold text-white/85 mt-8 max-w-xl mx-auto">
            As 4 operações são a base de tudo que vem depois: frações, equações, porcentagem. Firmar agora evita o "odeio matemática" lá na
            frente.
          </p>
        </div>
      </section>

      {/* Banner */}
      <section className="max-w-5xl mx-auto px-4 pt-14">
        <p className="text-center text-lg font-semibold text-muted">E se a tela que ele já pede ensinasse matemática?</p>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mt-1 mb-6">
          No Conta Comigo, <span className="text-leaf">o jogo é a conta.</span>
        </h2>
        <img
          src="/capi/banner.webp"
          alt="Criança jogando no celular ao lado da Capi"
          className="w-full rounded-[2rem] border-2 border-sand"
          style={{ boxShadow: '0 6px 0 var(--color-sand)' }}
          loading="lazy"
        />
      </section>

      {/* Demo */}
      <section id="demo" className="max-w-5xl mx-auto px-4 py-14 scroll-mt-20">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">Experimente agora</h2>
        <p className="text-center font-semibold text-muted mt-2 mb-8">É exatamente assim dentro do app. Ligue o som 🔊</p>
        <Demo />
      </section>

      {/* How */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-8">Como funciona</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            ['1', 'Ele joga a missão do dia', 'Uns 10 minutos de contas no nível certo, com estrelas, figurinhas e sequência de dias.'],
            ['2', 'Errou? A Capi explica', 'Primeiro ele tenta de novo. Se precisar, a Capi mostra passo a passo, falando. Depois ele mesmo resolve.'],
            ['3', 'Você vê o progresso', 'No painel dos pais aparece o que ele domina e onde trava. Com um toque, gera a folhinha de reforço.'],
          ].map(([n, t, d]) => (
            <div key={n} className="card p-5">
              <div className="w-10 h-10 rounded-full bg-sun font-display text-xl font-bold flex items-center justify-center mb-3">{n}</div>
              <div className="font-display text-xl font-semibold">{t}</div>
              <p className="font-semibold text-muted mt-1">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-sand/50 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-8">Tudo o que vem no Conta Comigo</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5">
                <f.icon className="text-leaf mb-2" size={28} />
                <div className="font-display text-xl font-semibold">{f.title}</div>
                <p className="font-semibold text-muted mt-1">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-3xl mx-auto px-4 py-14 text-center">
        <HeartHandshake className="mx-auto text-coral" size={40} />
        <h2 className="font-display text-3xl font-bold mt-2">Feito para criança, pensado para os pais</h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-6 text-left">
          {[
            [ShieldCheck, 'Sem anúncios', 'Nada de propaganda ou link estranho no meio do jogo.'],
            [ShieldCheck, 'Sem bronca', 'Errar faz parte: a Capi nunca tira ponto nem "mata" o personagem.'],
            [ShieldCheck, 'Privado', 'O progresso fica no seu aparelho, sem cadastro da criança.'],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={t as string} className="card p-4">
                <I className="text-leaf mb-1" size={22} />
                <div className="font-bold">{t as string}</div>
                <div className="text-sm font-semibold text-muted">{d as string}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-14">
        <h2 className="font-display text-3xl font-bold text-center mb-6">Perguntas frequentes</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card p-4 group">
              <summary className="font-bold cursor-pointer list-none flex justify-between items-center">
                {q} <span className="text-leaf text-2xl group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="font-semibold text-muted mt-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-leaf text-white py-14 text-center px-4">
        <Capi size={150} pose="trofeu" bounce className="mx-auto" />
        <h2 className="font-display text-3xl sm:text-4xl font-bold mt-3">Conta comigo? Conta com a Capi!</h2>
        <p className="font-semibold text-white/90 mt-2 mb-7">Comece hoje a missão do dia. Leva 10 minutos.</p>
        <button className="btn btn-sun text-xl py-4 px-8" onClick={start}>
          Começar grátis ▶
        </button>
      </section>
      <footer className="text-center text-sm font-semibold text-muted py-6">© {new Date().getFullYear()} Conta Comigo</footer>
    </div>
  );
}
