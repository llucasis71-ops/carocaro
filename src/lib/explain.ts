import { Problem, OP_SYMBOL } from './math';

/* ---------- Boards: pure snapshots the renderer draws ---------- */

export interface DotsBoard {
  kind: 'dots';
  /** Dots in order, filling ten-frames. */
  groups: { n: number; color: string }[];
  /** Cross out the last N dots. */
  crossed: number;
  caption?: string;
}

export interface ArrayBoard {
  kind: 'array';
  rows: number;
  cols: number;
  labels: boolean;
  caption?: string;
}

export interface ShareBoard {
  kind: 'share';
  groups: number;
  per: number;
  filled: boolean;
  total: number;
  caption?: string;
}

export interface ColumnBoard {
  kind: 'column';
  sign: string;
  /** Rows as digit arrays, index 0 = units. */
  top: number[];
  bottom: number[];
  width: number;
  above: Record<number, string>;
  crossed: number[];
  result: Record<number, string>;
  hl: number | null;
}

export interface LongDivBoard {
  kind: 'longdiv';
  dividend: string;
  divisor: number;
  quotient: string;
  /** Cells indexed from the left (0 = first digit of the dividend). */
  rows: { cells: Record<number, string>; minus?: boolean; line?: [number, number] }[];
  hl: [number, number] | null;
}

export type Board = DotsBoard | ArrayBoard | ShareBoard | ColumnBoard | LongDivBoard;

export interface Step {
  say: string;
  board: Board;
  /** Small highlighted tip shown under the board. */
  tip?: boolean;
}

const PLACE = ['unidades', 'dezenas', 'centenas', 'unidades de milhar'];
const A = '#F29E38';
const B = '#3BA7D9';

const digitsOf = (n: number) => String(n).split('').map(Number).reverse();

/* ---------- Small facts ---------- */

function explainDotsAdd(a: number, b: number): Step[] {
  const s = a + b;
  const steps: Step[] = [
    { say: `Temos ${a}.`, board: { kind: 'dots', groups: [{ n: a, color: A }], crossed: 0 } },
    {
      say: `Chegam mais ${b}.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }, { n: b, color: B }], crossed: 0 },
    },
    {
      say: `Contando tudo: ${a} + ${b} = ${s}.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }, { n: b, color: B }], crossed: 0, caption: `${a} + ${b} = ${s}` },
    },
  ];
  if (a < 10 && s > 10) {
    const fill = 10 - a;
    steps.push({
      tip: true,
      say: `Dica: complete o 10! ${a} + ${fill} = 10. Sobram ${b - fill}. E 10 + ${b - fill} = ${s}.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }, { n: b, color: B }], crossed: 0, caption: `10 + ${b - fill} = ${s}` },
    });
  } else if (a < b) {
    steps.push({
      tip: true,
      say: `Dica: comece pelo maior. Guarde o ${b} na cabeça e conte mais ${a} nos dedos.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }, { n: b, color: B }], crossed: 0, caption: `${b} + ${a} = ${s}` },
    });
  }
  return steps;
}

function explainDotsSub(a: number, b: number): Step[] {
  const d = a - b;
  const steps: Step[] = [
    { say: `Temos ${a}.`, board: { kind: 'dots', groups: [{ n: a, color: A }], crossed: 0 } },
    {
      say: `Vamos tirar ${b}. Riscamos ${b} bolinhas.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }], crossed: b },
    },
    {
      say: `Sobraram ${d}. Então ${a} − ${b} = ${d}.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }], crossed: b, caption: `${a} − ${b} = ${d}` },
    },
  ];
  if (a > 10 && b > a - 10 && a <= 20) {
    const first = a - 10;
    steps.push({
      tip: true,
      say: `Dica: tire primeiro ${first} para chegar no 10. Depois tire mais ${b - first}: sobra ${d}.`,
      board: { kind: 'dots', groups: [{ n: a, color: A }], crossed: b, caption: `${a} − ${first} = 10 → 10 − ${b - first} = ${d}` },
    });
  } else {
    steps.push({
      tip: true,
      say: `Para conferir, faça a volta: ${d} + ${b} = ${a}.`,
      board: { kind: 'dots', groups: [{ n: d, color: A }, { n: b, color: B }], crossed: 0, caption: `${d} + ${b} = ${a}` },
    });
  }
  return steps;
}

function mulTip(a: number, b: number): string | null {
  const p = a * b;
  const has = (n: number) => a === n || b === n;
  const other = (n: number) => (a === n ? b : a);
  if (has(1)) return `Qualquer número vezes 1 é ele mesmo: ${other(1)}.`;
  if (has(10)) return `Vezes 10 é fácil: coloque um zero no final do ${other(10)}. Fica ${p}.`;
  if (has(2)) return `Vezes 2 é o dobro: ${other(2)} + ${other(2)} = ${p}.`;
  if (has(5)) {
    const x = other(5);
    return `Truque do 5: ${x} × 10 = ${x * 10}, e a metade é ${p}. Na tabuada do 5 sempre termina em 0 ou 5.`;
  }
  if (has(9)) {
    const x = other(9);
    return `Truque do 9: ${x} × 10 = ${x * 10}, tira um ${x}: ${x * 10} − ${x} = ${p}.`;
  }
  if (has(4)) {
    const x = other(4);
    return `Vezes 4 é o dobro do dobro: ${x} + ${x} = ${2 * x}, e ${2 * x} + ${2 * x} = ${p}.`;
  }
  if (has(3)) {
    const x = other(3);
    return `Vezes 3 é o dobro e mais um: ${x} + ${x} = ${2 * x}, mais ${x} = ${p}.`;
  }
  return `Lembre: a ordem não muda o resultado. ${a} × ${b} é igual a ${b} × ${a}.`;
}

function explainArray(a: number, b: number): Step[] {
  const p = a * b;
  const seq = Array.from({ length: a }, (_, i) => (i + 1) * b).join(', ');
  const steps: Step[] = [
    {
      say: `${a} × ${b} quer dizer ${a} ${a === 1 ? 'grupo' : 'grupos'} de ${b}.`,
      board: { kind: 'array', rows: a, cols: b, labels: false },
    },
    {
      say: `Contando de ${b} em ${b}: ${seq}.`,
      board: { kind: 'array', rows: a, cols: b, labels: true },
    },
    {
      say: `Então ${a} × ${b} = ${p}.`,
      board: { kind: 'array', rows: a, cols: b, labels: true, caption: `${a} × ${b} = ${p}` },
    },
  ];
  const tip = mulTip(a, b);
  if (tip) steps.push({ tip: true, say: tip, board: { kind: 'array', rows: a, cols: b, labels: true, caption: `${a} × ${b} = ${p}` } });
  return steps;
}

function explainShare(a: number, b: number): Step[] {
  const q = a / b;
  return [
    {
      say: `${a} ÷ ${b} é repartir ${a} em ${b} grupos iguais.`,
      board: { kind: 'share', groups: b, per: q, filled: false, total: a },
    },
    {
      say: `Colocamos uma bolinha em cada grupo, de novo e de novo, até acabar.`,
      board: { kind: 'share', groups: b, per: q, filled: true, total: a },
    },
    {
      say: `Cada grupo ficou com ${q}. Então ${a} ÷ ${b} = ${q}.`,
      board: { kind: 'share', groups: b, per: q, filled: true, total: a, caption: `${a} ÷ ${b} = ${q}` },
    },
    {
      tip: true,
      say: `Dica: a divisão é a tabuada ao contrário. ${b} vezes quanto dá ${a}? ${b} × ${q} = ${a}.`,
      board: { kind: 'share', groups: b, per: q, filled: true, total: a, caption: `${b} × ${q} = ${a}` },
    },
  ];
}

/* ---------- Column algorithms ---------- */

function colBase(sign: string, top: number, bottom: number, resultLen: number): ColumnBoard {
  const t = digitsOf(top);
  const bt = digitsOf(bottom);
  return {
    kind: 'column',
    sign,
    top: t,
    bottom: bt,
    width: Math.max(t.length, bt.length, resultLen),
    above: {},
    crossed: [],
    result: {},
    hl: null,
  };
}

const snap = (b: ColumnBoard, patch: Partial<ColumnBoard> = {}): ColumnBoard => ({
  ...b,
  above: { ...b.above },
  crossed: [...b.crossed],
  result: { ...b.result },
  ...patch,
});

function explainColumnAdd(a: number, b: number): Step[] {
  const sum = a + b;
  let board = colBase('+', a, b, String(sum).length);
  const steps: Step[] = [
    { say: 'Vamos armar a conta: unidade embaixo de unidade, dezena embaixo de dezena.', board: snap(board) },
  ];
  const n = Math.max(board.top.length, board.bottom.length);
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const da = board.top[i];
    const db = board.bottom[i];
    const s = (da ?? 0) + (db ?? 0) + carry;
    const last = i === n - 1;
    let say: string;
    if (da === undefined || db === undefined) {
      const only = (da ?? db) as number;
      say = carry
        ? `Nas ${PLACE[i]}: ${only} + ${carry} que subiu = ${s}.`
        : `Nas ${PLACE[i]}: só tem o ${only}, então ele desce.`;
    } else {
      say = carry
        ? `Nas ${PLACE[i]}: ${da} + ${db} + ${carry} que subiu = ${s}.`
        : `Nas ${PLACE[i]}: ${da} + ${db} = ${s}.`;
    }
    board = snap(board, { hl: i });
    if (s >= 10 && !last) {
      say += ` Escrevemos o ${s % 10} embaixo e vai ${Math.floor(s / 10)} para as ${PLACE[i + 1]}.`;
      board.result[i] = String(s % 10);
      board.above[i + 1] = String(Math.floor(s / 10));
      carry = Math.floor(s / 10);
    } else if (s >= 10 && last) {
      say += ` É a última coluna, então escrevemos o ${s} inteiro.`;
      board.result[i] = String(s % 10);
      board.result[i + 1] = String(Math.floor(s / 10));
      carry = 0;
    } else {
      if (da !== undefined && db !== undefined) say += ` Escrevemos o ${s} embaixo.`;
      board.result[i] = String(s);
      carry = 0;
    }
    steps.push({ say, board });
  }
  steps.push({ say: `Pronto! ${a} + ${b} = ${sum}.`, board: snap(board, { hl: null }) });
  return steps;
}

function explainColumnSub(a: number, b: number): Step[] {
  const diff = a - b;
  let board = colBase('−', a, b, String(a).length);
  const cur = [...board.top];
  const steps: Step[] = [
    { say: 'Vamos armar a conta: o número maior em cima, unidade embaixo de unidade.', board: snap(board) },
  ];
  const n = board.top.length;
  for (let i = 0; i < n; i++) {
    const db = board.bottom[i];
    board = snap(board, { hl: i });
    let say = '';
    if (db === undefined) {
      if (i === n - 1 && cur[i] === 0) {
        say = `Nas ${PLACE[i]} ficou 0, então não precisamos escrever nada.`;
      } else {
        say = `Nas ${PLACE[i]}: só tem o ${cur[i]}, então ele desce.`;
        board.result[i] = String(cur[i]);
      }
      steps.push({ say, board });
      continue;
    }
    if (cur[i] >= db) {
      const d = cur[i] - db;
      say = `Nas ${PLACE[i]}: ${cur[i]} − ${db} = ${d}.`;
      if (!(i === n - 1 && d === 0 && n > 1)) board.result[i] = String(d);
      steps.push({ say, board });
      continue;
    }
    // Borrow
    let j = i + 1;
    while (j < n && cur[j] === 0) j++;
    const before = cur[i];
    say = `Nas ${PLACE[i]}: ${before} − ${db} não dá, porque ${before} é menor que ${db}. `;
    if (j === i + 1) {
      say += `Pedimos 1 emprestado das ${PLACE[j]}: o ${cur[j]} vira ${cur[j] - 1}, e o ${before} vira ${before + 10}. `;
    } else {
      say += `As ${PLACE[i + 1]} estão com 0, então pedimos às ${PLACE[j]}: o ${cur[j]} vira ${cur[j] - 1}, o 0 do meio vira 9, e o ${before} vira ${before + 10}. `;
    }
    if (!board.crossed.includes(j)) board.crossed.push(j);
    cur[j] -= 1;
    board.above[j] = String(cur[j]);
    for (let k = i + 1; k < j; k++) {
      if (!board.crossed.includes(k)) board.crossed.push(k);
      cur[k] = 9;
      board.above[k] = '9';
    }
    if (!board.crossed.includes(i)) board.crossed.push(i);
    cur[i] = before + 10;
    board.above[i] = String(cur[i]);
    const d = cur[i] - db;
    say += `Agora ${cur[i]} − ${db} = ${d}.`;
    board.result[i] = String(d);
    steps.push({ say, board });
  }
  // Drop leading zeros in the result
  const res = board.result;
  for (let i = n - 1; i > 0; i--) {
    if (res[i] === '0') delete res[i];
    else break;
  }
  steps.push({ say: `Pronto! ${a} − ${b} = ${diff}. Para conferir: ${diff} + ${b} = ${a}.`, board: snap(board, { hl: null }) });
  return steps;
}

function explainColumnMul(a: number, b: number): Step[] {
  // Keep the multi-digit number on top
  const [top, m] = a >= b ? [a, b] : [b, a];
  const prod = top * m;
  let board = colBase('×', top, m, String(prod).length);
  const steps: Step[] = [
    {
      say: `Vamos armar: o ${top} em cima e o ${m} embaixo, nas unidades. O ${m} vai multiplicar cada algarismo do ${top}, começando pelas unidades.`,
      board: snap(board),
    },
  ];
  const n = board.top.length;
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const t = board.top[i];
    const p = t * m;
    const s = p + carry;
    board = snap(board, { hl: i });
    let say = `${m} × ${t} = ${p}.`;
    if (carry) say += ` Mais ${carry} que subiu: ${s}.`;
    if (i < n - 1) {
      if (s >= 10) {
        say += ` Escrevemos o ${s % 10} e vai ${Math.floor(s / 10)}.`;
        board.above[i + 1] = String(Math.floor(s / 10));
      } else {
        say += ` Escrevemos o ${s}.`;
      }
      board.result[i] = String(s % 10);
      carry = Math.floor(s / 10);
    } else {
      say += ` É o último, escrevemos ${s} inteiro.`;
      String(s)
        .split('')
        .reverse()
        .forEach((d, k) => (board.result[i + k] = d));
    }
    steps.push({ say, board });
  }
  steps.push({ say: `Pronto! ${top} × ${m} = ${prod}.`, board: snap(board, { hl: null }) });
  return steps;
}

/* ---------- Long division (método da chave) ---------- */

function explainLongDiv(a: number, d: number): Step[] {
  const D = String(a);
  const len = D.length;
  let rows: LongDivBoard['rows'] = [];
  let quotient = '';
  const board = (hl: [number, number] | null): LongDivBoard => ({
    kind: 'longdiv',
    dividend: D,
    divisor: d,
    quotient,
    rows: rows.map((r) => ({ ...r, cells: { ...r.cells } })),
    hl,
  });
  const steps: Step[] = [
    {
      say: `Vamos usar a chave: o ${a} fica dentro e o ${d} do lado. Dividimos da esquerda para a direita.`,
      board: board(null),
    },
  ];
  let i = 0;
  let cur = Number(D[0]);
  let startCol = 0;
  if (cur < d && len > 1) {
    i = 1;
    cur = Number(D.slice(0, 2));
    steps.push({
      say: `O ${D[0]} é menor que ${d}, não dá para dividir. Então pegamos os dois primeiros: ${cur}.`,
      board: board([0, 1]),
    });
  } else {
    steps.push({ say: `Começamos pelo ${cur}.`, board: board([0, 0]) });
  }
  const place = (num: number, endCol: number): Record<number, string> => {
    const s = String(num);
    const cells: Record<number, string> = {};
    s.split('').forEach((ch, k) => (cells[endCol - s.length + 1 + k] = ch));
    return cells;
  };
  for (;;) {
    const q = Math.floor(cur / d);
    const prod = q * d;
    const rem = cur - prod;
    const hlStart = Math.max(0, i - String(cur).length + 1);
    startCol = hlStart;
    if (q === 0) {
      quotient += '0';
      steps.push({
        say: `O ${d} não cabe em ${cur}. Escrevemos 0 no quociente.`,
        board: board([hlStart, i]),
      });
    } else {
      quotient += String(q);
      steps.push({
        say: `Quantas vezes o ${d} cabe em ${cur}? ${q} ${q === 1 ? 'vez' : 'vezes'}, porque ${d} × ${q} = ${prod}. Escrevemos ${q} no quociente.`,
        board: board([hlStart, i]),
      });
      rows.push({ cells: place(prod, i), minus: true });
      rows.push({ cells: place(rem, i), line: [startCol, i] });
      steps.push({ say: `${cur} − ${prod} = ${rem}.`, board: board([hlStart, i]) });
    }
    if (i >= len - 1) {
      steps.push({
        say: rem === 0
          ? `Sobrou 0, a divisão é exata. Então ${a} ÷ ${d} = ${Number(quotient)}.`
          : `Sobrou ${rem}. Então ${a} ÷ ${d} = ${Number(quotient)} e resto ${rem}.`,
        board: board(null),
      });
      break;
    }
    i += 1;
    cur = rem * 10 + Number(D[i]);
    if (q === 0 && rows.length === 0) {
      rows.push({ cells: place(cur, i) });
    } else if (rows.length) {
      const last = rows[rows.length - 1].cells;
      if (rem === 0) {
        Object.keys(last).forEach((k) => {
          if (Number(k) < i && last[Number(k)] === '0') delete last[Number(k)];
        });
      }
      last[i] = D[i];
    }
    steps.push({ say: `Baixamos o ${D[i]}. Agora temos ${cur}.`, board: board([i, i]) });
  }
  quotient = String(Number(quotient));
  return steps;
}

/* ---------- Entry point ---------- */

export function explain(p: Problem): Step[] {
  const { op, a, b } = p;
  if (op === 'add') return a + b <= 20 && p.level <= 2 ? explainDotsAdd(a, b) : explainColumnAdd(a, b);
  if (op === 'sub') return a <= 20 ? explainDotsSub(a, b) : explainColumnSub(a, b);
  if (op === 'mul') return a <= 10 && b <= 10 ? explainArray(a, b) : explainColumnMul(a, b);
  return p.answer <= 10 && a <= 100 ? explainShare(a, b) : explainLongDiv(a, b);
}

/** Board of the problem "armed" without answers — used as a hint. */
export function armedBoard(p: Problem): Board | null {
  const steps = explain(p);
  const first = steps[0]?.board;
  if (first && (first.kind === 'column' || first.kind === 'longdiv')) return first;
  return null;
}

export const symbolOf = (p: Problem) => OP_SYMBOL[p.op];
