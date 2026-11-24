import { useEffect } from 'react';
import { Delete } from 'lucide-react';
import { sfx } from '../lib/voice';

export default function Keypad({
  value,
  onChange,
  onSubmit,
  disabled,
  maxLength = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxLength?: number;
}) {
  const press = (k: string) => {
    if (disabled) return;
    if (k === 'del') {
      onChange(value.slice(0, -1));
    } else if (k === 'ok') {
      if (value.length) onSubmit();
      return;
    } else if (value.length < maxLength) {
      onChange(value === '0' ? k : value + k);
    }
    sfx('tap');
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') press('ok');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mx-auto select-none">
      {keys.map((k) =>
        k === 'ok' ? (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={disabled || !value.length}
            className="btn btn-leaf h-14 text-xl"
            aria-label="Confirmar"
          >
            OK
          </button>
        ) : k === 'del' ? (
          <button key={k} onClick={() => press(k)} disabled={disabled} className="btn btn-ghost h-14" aria-label="Apagar">
            <Delete size={24} />
          </button>
        ) : (
          <button
            key={k}
            onClick={() => press(k)}
            disabled={disabled}
            className="btn btn-ghost h-14 text-2xl font-bold"
          >
            {k}
          </button>
        ),
      )}
    </div>
  );
}
