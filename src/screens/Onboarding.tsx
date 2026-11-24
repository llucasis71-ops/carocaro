import { useState } from 'react';
import { motion } from 'motion/react';
import Capi from '../components/Capi';
import { createProfile } from '../lib/store';
import { speak } from '../lib/voice';
import { navigate } from '../lib/router';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);

  return (
    <div className="min-h-dvh bg-cream dotgrid flex flex-col items-center justify-center px-5 py-10">
      <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <Capi size={170} pose={step === 0 ? 'ideia' : step === 1 ? 'rosto' : 'joinha'} bounce={step === 0} className="mx-auto" />
        {step === 0 && (
          <>
            <h1 className="font-display text-4xl font-bold mt-4">Oi! Eu sou a Capi.</h1>
            <p className="text-lg font-semibold text-muted mt-2 mb-8">
              Vou te ajudar a ficar craque nas contas. E quando errar, eu explico tudinho, sem bronca!
            </p>
            <button
              className="btn btn-sun w-full text-xl py-4"
              onClick={() => {
                speak('Oi! Eu sou a Capi. Qual é o seu nome?');
                setStep(1);
              }}
            >
              Vamos lá! ▶
            </button>
          </>
        )}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              speak(`Que nome lindo, ${name.trim()}! Em que ano da escola você está?`);
              setStep(2);
            }}
          >
            <h1 className="font-display text-3xl font-bold mt-4 mb-6">Qual é o seu nome?</h1>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              placeholder="Digite seu nome"
              className="w-full text-center text-2xl font-bold rounded-2xl border-[3px] border-sand bg-white px-4 py-4 outline-none focus:border-river"
            />
            <button className="btn btn-sun w-full text-xl py-4 mt-6" disabled={!name.trim()}>
              Continuar ▶
            </button>
          </form>
        )}
        {step === 2 && (
          <>
            <h1 className="font-display text-3xl font-bold mt-4">Em que ano você está, {name.trim()}?</h1>
            <p className="text-muted font-semibold mt-1 mb-6">Assim eu começo do jeito certo pra você.</p>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((g) => (
                <button
                  key={g}
                  onClick={() => setGrade(g)}
                  className={`btn py-5 text-2xl ${grade === g ? 'btn-river' : 'btn-ghost'}`}
                >
                  {g}º
                </button>
              ))}
            </div>
            <button
              className="btn btn-sun w-full text-xl py-4 mt-8"
              disabled={!grade}
              onClick={() => {
                createProfile(name.trim(), grade!);
                speak('Prontinho! Vamos começar a aventura!');
                navigate('/app', true);
              }}
            >
              Começar a aventura ▶
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
