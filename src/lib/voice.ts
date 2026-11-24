import { useSyncExternalStore } from 'react';
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

/* ---------- Voice availability (some in-app browsers have no voice) ---------- */

export type VoiceStatus = 'unknown' | 'ok' | 'unavailable';
let status: VoiceStatus = canSpeak() ? 'unknown' : 'unavailable';
const statusListeners = new Set<() => void>();
function setStatus(s: VoiceStatus) {
  if (status === s || status === 'ok') return;
  status = s;
  statusListeners.forEach((l) => l());
}
export function useVoiceStatus(): VoiceStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => status,
  );
}

// iOS/Android only allow speech after a user gesture: "unlock" it on the first tap.
if (canSpeak()) {
  const unlock = () => {
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
}

let speakToken = 0;
let misses = 0;

export function speak(text: string, onEnd?: () => void) {
  const token = ++speakToken;
  if (!canSpeak() || !getState().settings.voice || status === 'unavailable') {
    if (onEnd) setTimeout(() => token === speakToken && onEnd(), 1800 + text.length * 45);
    return;
  }
  let done = false;
  let started = false;
  const finish = () => {
    if (done || token !== speakToken) return;
    done = true;
    onEnd?.();
  };
  const u = new SpeechSynthesisUtterance(sayify(text));
  u.lang = 'pt-BR';
  if (!voice) voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = 0.98;
  u.pitch = 1.1;
  u.onstart = () => {
    started = true;
    misses = 0;
    setStatus('ok');
  };
  u.onend = finish;
  u.onerror = (e) => {
    if ((e as SpeechSynthesisErrorEvent).error === 'synthesis-unavailable') setStatus('unavailable');
    finish();
  };
  // If speech never starts, this browser has no working voice: carry on silently.
  setTimeout(() => {
    if (token !== speakToken || started) return;
    misses += 1;
    if (misses >= 2) setStatus('unavailable');
    speechSynthesis.cancel();
    setTimeout(finish, 1500 + text.length * 45);
  }, 2500);
  // Some Android voices never fire onend: safety net.
  setTimeout(finish, 4000 + text.length * 90);

  // Chrome drops an utterance spoken right after cancel(): give it a moment.
  speechSynthesis.cancel();
  setTimeout(() => {
    if (token !== speakToken) return;
    speechSynthesis.speak(u);
    if (speechSynthesis.paused) speechSynthesis.resume();
  }, 80);
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
