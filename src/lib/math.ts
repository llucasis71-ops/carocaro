export type Op = 'add' | 'sub' | 'mul' | 'div';

export const OPS: Op[] = ['add', 'sub', 'mul', 'div'];

export interface Problem {
  op: Op;
  a: number;
  b: number;
  answer: number;
  level: number;
  key: string;
}

export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: '÷' };
export const OP_NAME: Record<Op, string> = {
  add: 'Somar',
  sub: 'Subtrair',
  mul: 'Multiplicar',
  div: 'Dividir',
};
export const OP_COLOR: Record<Op, string> = {
  add: '#2E9D5B',
  sub: '#E8663D',
  mul: '#2F8FD0',
  div: '#9B5BD6',
};

export const LEVELS: Record<Op, string[]> = {
  add: [
    'Somas até 10',
    'Somas até 20',
    'Dezena + unidade',
    'Dezenas sem "vai um"',
    'Dezenas com "vai um"',
    'Centenas + dezenas',
    'Centenas com "vai um"',
  ],
  sub: [
    'Tirar até 10',
    'Tirar até 20',
    'Dezena − unidade',
    'Dezenas sem empréstimo',
    'Dezenas com empréstimo',
    'Centenas − dezenas',
    'Centenas com empréstimo',
  ],
  mul: [
    'Tabuadas do 1, 2, 5 e 10',
    'Tabuadas do 2 ao 5',
    'Tabuadas do 2 ao 9',
    'Dezena × unidade',
    'Dezena × unidade com "vai um"',
    'Centena × unidade',
  ],
  div: [
    'Divisões por 2, 5 e 10',
    'Divisões por 2 a 5',
    'Divisões por 2 a 9',
    'Dezena ÷ unidade (chave)',
    'Centena ÷ unidade (chave)',
  ],
};

export const maxLevel = (op: Op) => LEVELS[op].length;

const r = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const digits = (n: number) => String(n).split('').map(Number).reverse(); // units first

function hasCarry(a: number, b: number) {
  const da = digits(a);
  const db = digits(b);
  let c = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const s = (da[i] ?? 0) + (db[i] ?? 0) + c;
    if (s >= 10) return true;
    c = 0;
  }
  return false;
}

function hasBorrow(a: number, b: number) {
  const da = digits(a);
  const db = digits(b);
  return db.some((d, i) => d > (da[i] ?? 0));
}

function make(op: Op, a: number, b: number, level: number): Problem {
  const answer = op === 'add' ? a + b : op === 'sub' ? a - b : op === 'mul' ? a * b : a / b;
  return { op, a, b, answer, level, key: `${a}${OP_SYMBOL[op]}${b}` };
}

function genAdd(level: number): [number, number] {
  switch (level) {
    case 1: {
      const a = r(1, 9);
      return [a, r(1, 10 - a)];
    }
    case 2: {
      if (Math.random() < 0.75) {
        let a = r(2, 9), b = r(2, 9);
        while (a + b <= 10) { a = r(3, 9); b = r(3, 9); }
        return [a, b];
      }
      return [r(10, 15), r(1, 5)];
    }
    case 3: {
      for (;;) {
        const a = r(11, 88), b = r(1, 8);
        if ((a % 10) + b <= 9) return [a, b];
      }
    }
    case 4: {
      for (;;) {
        const a = r(10, 88), b = r(10, 88);
        if (!hasCarry(a, b) && a + b < 100) return [a, b];
      }
    }
    case 5: {
      for (;;) {
        const a = r(12, 89), b = r(12, 89);
        if ((a % 10) + (b % 10) >= 10) return [a, b];
      }
    }
    case 6:
      return [r(100, 899), r(10, 99)];
    default: {
      for (;;) {
        const a = r(100, 799), b = r(100, 799);
        if (hasCarry(a, b) && a + b < 1000) return [a, b];
      }
    }
  }
}

function genSub(level: number): [number, number] {
  switch (level) {
    case 1: {
      const a = r(2, 10);
      return [a, r(1, a)];
    }
    case 2: {
      const a = r(11, 18);
      return [a, r(2, 9)];
    }
    case 3: {
      for (;;) {
        const a = r(11, 99), b = r(1, 9);
        if (a % 10 >= b) return [a, b];
      }
    }
    case 4: {
      for (;;) {
        const a = r(20, 99), b = r(10, 89);
        if (b < a && !hasBorrow(a, b)) return [a, b];
      }
    }
    case 5: {
      for (;;) {
        const a = r(21, 98), b = r(11, 89);
        if (b < a && a % 10 < b % 10) return [a, b];
      }
    }
    case 6:
      return [r(100, 999), r(10, 99)];
    default: {
      for (;;) {
        const a = r(200, 999), b = r(100, 899);
        if (b < a && hasBorrow(a, b)) return [a, b];
      }
    }
  }
}

function genMul(level: number): [number, number] {
  switch (level) {
    case 1: {
      const t = pick([1, 2, 5, 10]);
      const n = r(1, 10);
      return Math.random() < 0.5 ? [t, n] : [n, t];
    }
    case 2: {
      const t = r(2, 5), n = r(1, 10);
      return Math.random() < 0.5 ? [t, n] : [n, t];
    }
    case 3: {
      const t = r(2, 9), n = r(2, 10);
      return Math.random() < 0.5 ? [t, n] : [n, t];
    }
    case 4: {
      for (;;) {
        const a = r(11, 44), b = r(2, 4);
        if (digits(a).every((d) => d * b < 10)) return [a, b];
      }
    }
    case 5: {
      for (;;) {
        const a = r(12, 99), b = r(2, 9);
        if ((a % 10) * b >= 10) return [a, b];
      }
    }
    default:
      return [r(101, 999), r(2, 9)];
  }
}

function genDiv(level: number): [number, number] {
  switch (level) {
    case 1: {
      const d = pick([2, 5, 10]);
      return [d * r(1, 10), d];
    }
    case 2: {
      const d = r(2, 5);
      return [d * r(1, 10), d];
    }
    case 3: {
      const d = r(2, 9);
      return [d * r(2, 10), d];
    }
    case 4: {
      const d = r(2, 9);
      const q = r(11, Math.floor(99 / d));
      return [d * q, d];
    }
    default: {
      const d = r(2, 9);
      const q = r(Math.ceil(100 / d) + 1, Math.floor(999 / d));
      return [d * q, d];
    }
  }
}

export function generate(op: Op, level: number, avoidKey?: string): Problem {
  const lv = Math.min(Math.max(1, level), maxLevel(op));
  for (let i = 0; i < 20; i++) {
    const [a, b] =
      op === 'add' ? genAdd(lv) : op === 'sub' ? genSub(lv) : op === 'mul' ? genMul(lv) : genDiv(lv);
    const p = make(op, a, b, lv);
    if (p.key !== avoidKey) return p;
  }
  const [a, b] = op === 'add' ? genAdd(lv) : op === 'sub' ? genSub(lv) : op === 'mul' ? genMul(lv) : genDiv(lv);
  return make(op, a, b, lv);
}

export function makeProblem(op: Op, a: number, b: number, level = 1): Problem {
  return make(op, a, b, level);
}

/** Operations a child of the given grade practises. */
export function opsForGrade(grade: number): Op[] {
  if (grade <= 1) return ['add', 'sub'];
  if (grade === 2) return ['add', 'sub', 'mul'];
  return ['add', 'sub', 'mul', 'div'];
}

export function startLevels(grade: number): Record<Op, number> {
  switch (grade) {
    case 1: return { add: 1, sub: 1, mul: 1, div: 1 };
    case 2: return { add: 3, sub: 2, mul: 1, div: 1 };
    case 3: return { add: 5, sub: 4, mul: 2, div: 1 };
    case 4: return { add: 6, sub: 6, mul: 3, div: 3 };
    default: return { add: 7, sub: 7, mul: 4, div: 4 };
  }
}

/** Fact key used to track which tabuada facts the child misses. */
export function factKey(p: Problem): string | null {
  if (p.op === 'mul' && p.level <= 3) {
    const [x, y] = [p.a, p.b].sort((m, n) => m - n);
    return `${x}×${y}`;
  }
  if (p.op === 'div' && p.level <= 3) return `${p.a}÷${p.b}`;
  if (p.op === 'add' && p.level <= 2) return `${p.a}+${p.b}`;
  return null;
}

/** Whether the problem is best shown "armed" (vertical). */
export function isColumnProblem(p: Problem) {
  if (p.op === 'add') return !(p.a <= 10 && p.b <= 10) && p.level >= 3;
  if (p.op === 'sub') return p.a > 20;
  if (p.op === 'mul') return p.a > 10 || p.b > 10;
  return p.answer > 10 || p.a > 100;
}
