import { useSyncExternalStore } from 'react';
import { Op, OPS, Problem, factKey, maxLevel, startLevels } from './math';

export interface Profile {
  name: string;
  grade: number;
}

export interface DayStat {
  right: number;
  wrong: number;
  secs: number;
}

export interface State {
  profile: Profile | null;
  stars: number;
  streak: { count: number; last: string | null };
  levels: Record<Op, number>;
  recent: Record<Op, boolean[]>;
  /** Accuracy per skill, key = `${op}:${level}` */
  skills: Record<string, { right: number; wrong: number }>;
  /** How many times each fact was missed (e.g. "7×8"). */
  facts: Record<string, number>;
  phases: Record<number, number>; // phase id -> stars (1..3)
  stickers: string[];
  daily: { date: string; count: number };
  days: Record<string, DayStat>;
  raceBest: Record<string, number>;
  settings: { voice: boolean; sound: boolean; dailyGoal: number; pin: string | null };
}

const KEY = 'conta-comigo:v1';

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fresh = (): State => ({
  profile: null,
  stars: 0,
  streak: { count: 0, last: null },
  levels: { add: 1, sub: 1, mul: 1, div: 1 },
  recent: { add: [], sub: [], mul: [], div: [] },
  skills: {},
  facts: {},
  phases: {},
  stickers: [],
  daily: { date: today(), count: 0 },
  days: {},
  raceBest: {},
  settings: { voice: true, sound: true, dailyGoal: 20, pin: null },
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const base = fresh();
      const s = JSON.parse(raw);
      return { ...base, ...s, settings: { ...base.settings, ...s.settings } };
    }
  } catch {
    /* ignore */
  }
  return fresh();
}

let state: State = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — keep in memory */
  }
}

export function getState() {
  return state;
}

export function setState(fn: (s: State) => State) {
  state = fn(state);
  persist();
  listeners.forEach((l) => l());
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => sel(state),
  );
}

/* ---------- Actions ---------- */

export function createProfile(name: string, grade: number) {
  setState((s) => ({ ...s, profile: { name, grade }, levels: startLevels(grade) }));
}

export function updateProfile(p: Partial<Profile>) {
  setState((s) => (s.profile ? { ...s, profile: { ...s.profile, ...p } } : s));
}

export function resetAll() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  state = fresh();
  listeners.forEach((l) => l());
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return today(d);
}

function touchDay(s: State, patch: Partial<DayStat>): State {
  const t = today();
  const cur = s.days[t] ?? { right: 0, wrong: 0, secs: 0 };
  const days = {
    ...s.days,
    [t]: {
      right: cur.right + (patch.right ?? 0),
      wrong: cur.wrong + (patch.wrong ?? 0),
      secs: cur.secs + (patch.secs ?? 0),
    },
  };
  // keep ~90 days
  const keys = Object.keys(days).sort();
  while (keys.length > 90) delete days[keys.shift() as string];
  let streak = s.streak;
  if (streak.last !== t) {
    streak = { count: streak.last === yesterday() ? streak.count + 1 : 1, last: t };
  }
  return { ...s, days, streak };
}

export function addTime(secs: number) {
  if (secs <= 0) return;
  setState((s) => touchDay(s, { secs }));
}

export interface AnswerResult {
  levelChange: 1 | -1 | 0;
}

/**
 * Records the first attempt at a problem. Adapts the level of the operation.
 */
export function recordAttempt(p: Problem, correct: boolean, adapt = true): AnswerResult {
  let levelChange: AnswerResult['levelChange'] = 0;
  setState((s0) => {
    let s = touchDay(s0, correct ? { right: 1 } : { wrong: 1 });
    const skillKey = `${p.op}:${p.level}`;
    const sk = s.skills[skillKey] ?? { right: 0, wrong: 0 };
    const skills = { ...s.skills, [skillKey]: correct ? { ...sk, right: sk.right + 1 } : { ...sk, wrong: sk.wrong + 1 } };
    const facts = { ...s.facts };
    const fk = factKey(p);
    if (fk && !correct) facts[fk] = (facts[fk] ?? 0) + 1;

    let levels = s.levels;
    let recent = s.recent;
    if (adapt) {
      const list = [...(s.recent[p.op] ?? []), correct].slice(-6);
      const lv = s.levels[p.op];
      let next = lv;
      const last5 = list.slice(-5);
      if (last5.length === 5 && last5.every(Boolean) && lv < maxLevel(p.op) && p.level >= lv) {
        next = lv + 1;
        levelChange = 1;
      } else if (list.slice(-4).filter((x) => !x).length >= 3 && lv > 1) {
        next = lv - 1;
        levelChange = -1;
      }
      levels = { ...s.levels, [p.op]: next };
      recent = { ...s.recent, [p.op]: next !== lv ? [] : list };
    }
    s = { ...s, skills, facts, levels, recent, stars: s.stars + (correct ? 1 : 0) };
    return s;
  });
  return { levelChange };
}

/** A problem was finished (answered right, first try or after help). */
export function countSolved() {
  setState((s) => {
    const t = today();
    const daily = s.daily.date === t ? { date: t, count: s.daily.count + 1 } : { date: t, count: 1 };
    return { ...s, daily };
  });
}

export function dailyCount(s: State) {
  return s.daily.date === today() ? s.daily.count : 0;
}

export function finishPhase(id: number, stars: number, sticker: string) {
  setState((s) => ({
    ...s,
    phases: { ...s.phases, [id]: Math.max(s.phases[id] ?? 0, stars) },
    stickers: s.stickers.includes(sticker) ? s.stickers : [...s.stickers, sticker],
    stars: s.stars + stars * 5,
  }));
}

export function buySticker(id: string, price: number): boolean {
  if (state.stars < price || state.stickers.includes(id)) return false;
  setState((s) => ({ ...s, stars: s.stars - price, stickers: [...s.stickers, id] }));
  return true;
}

export function saveRace(mode: string, score: number): boolean {
  const best = state.raceBest[mode] ?? 0;
  if (score > best) {
    setState((s) => ({ ...s, raceBest: { ...s.raceBest, [mode]: score } }));
    return true;
  }
  return false;
}

export function setLevel(op: Op, level: number) {
  setState((s) => ({ ...s, levels: { ...s.levels, [op]: level }, recent: { ...s.recent, [op]: [] } }));
}

export function updateSettings(p: Partial<State['settings']>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...p } }));
}

export function skillAccuracy(s: State, op: Op) {
  let right = 0, wrong = 0;
  Object.entries(s.skills).forEach(([k, v]) => {
    if (k.startsWith(op + ':')) {
      right += v.right;
      wrong += v.wrong;
    }
  });
  return { right, wrong, total: right + wrong, pct: right + wrong ? Math.round((right / (right + wrong)) * 100) : null };
}

/** Skills where the child struggles most (min 5 attempts, < 80 %). */
export function weakSkills(s: State) {
  return Object.entries(s.skills)
    .map(([k, v]) => {
      const [op, lv] = k.split(':');
      const total = v.right + v.wrong;
      return { op: op as Op, level: Number(lv), total, pct: total ? Math.round((v.right / total) * 100) : 100 };
    })
    .filter((x) => x.total >= 5 && x.pct < 80)
    .sort((a, b) => a.pct - b.pct);
}

/** Pick an operation for the daily mission, weighting weak operations. */
export function pickMissionOp(s: State, allowed: Op[]): Op {
  const weights = allowed.map((op) => {
    const key = `${op}:${s.levels[op]}`;
    const sk = s.skills[key];
    const wrongRate = sk && sk.right + sk.wrong >= 3 ? sk.wrong / (sk.right + sk.wrong) : 0.2;
    return 1 + wrongRate * 3;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < allowed.length; i++) {
    x -= weights[i];
    if (x <= 0) return allowed[i];
  }
  return allowed[0];
}

export { OPS };
