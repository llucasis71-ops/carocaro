import { getState } from './store';

/* ---------- Speech (pt-BR) ---------- */

let voice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices();
  const pt = voices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith('pt-br'));
  const pref = ['Francisca', 'Luciana', 'Google português do Brasil', 'Thalita', 'Maria'];
  for (const name of pref) {
    const v = pt.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return pt[0] ?? voices.find((v) => v.lang?.toLowerCase().startsWith('pt')) ?? null;
}

if (typeof speechSynthesis !== 'undefined') {
  voice = pickVoice();
  speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice();
  };
}

export const canSpeak = () => typeof speechSynthesis !== 'undefined';

/** Turns math notation into words that read well aloud. */
export function sayify(text: string) {
  return text
    .replace(/(\d)\s*×\s*(\d)/g, '$1 vezes $2')
    .replace(/×/g, ' vezes ')
    .replace(/(\d)\s*÷\s*(\d)/g, '$1 dividido por $2')
    .replace(/÷/g, ' dividido por ')
    .replace(/\s−\s/g, ' menos ')
    .replace(/−/g, ' menos ')
    .replace(/\s\+\s/g, ' mais ')
    .replace(/\s=\s/g, ' é igual a ')
    .replace(/→/g, ', depois ')
    .replace(/"/g, '');
}

let speakToken = 0;

export function speak(text: string, onEnd?: () => void) {
  const token = ++speakToken;
  if (!canSpeak() || !getState().settings.voice) {
    if (onEnd) setTimeout(() => token === speakToken && onEnd(), 1800 + text.length * 35);
    return;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(sayify(text));
  u.lang = 'pt-BR';
  if (voice) u.voice = voice;
  u.rate = 0.98;
  u.pitch = 1.1;
  let done = false;
  const finish = () => {
    if (done || token !== speakToken) return;
    done = true;
    onEnd?.();
  };
  u.onend = finish;
  u.onerror = finish;
  // Some Android voices never fire onend — safety net.
  setTimeout(finish, 2500 + text.length * 90);
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  speakToken++;
  if (canSpeak()) speechSynthesis.cancel();
}

/* ---------- Sound effects (WebAudio, no files) ---------- */

let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.15) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export type Sfx = 'right' | 'wrong' | 'tap' | 'win' | 'level' | 'coin';

export function sfx(kind: Sfx) {
  if (!getState().settings.sound) return;
  try {
    switch (kind) {
      case 'tap':
        tone(660, 0, 0.06, 'triangle', 0.06);
        break;
      case 'right':
        tone(660, 0, 0.12, 'triangle');
        tone(990, 0.09, 0.2, 'triangle');
        break;
      case 'wrong':
        tone(220, 0, 0.18, 'sine', 0.12);
        tone(180, 0.12, 0.25, 'sine', 0.1);
        break;
      case 'coin':
        tone(1320, 0, 0.08, 'square', 0.05);
        tone(1760, 0.07, 0.12, 'square', 0.05);
        break;
      case 'level':
        [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.18, 'triangle'));
        break;
      case 'win':
        [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'));
        break;
    }
  } catch {
    /* audio unavailable */
  }
}
