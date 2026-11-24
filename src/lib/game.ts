import { Op } from './math';

export interface Phase {
  id: number;
  name: string;
  ops: Op[];
  bonus: number;
  count: number;
  sticker: string;
}

export const PHASES: Phase[] = [
  { id: 1, name: 'Prainha do Sapo', ops: ['add'], bonus: 0, count: 8, sticker: 'sapo' },
  { id: 2, name: 'Ninho da Arara', ops: ['sub'], bonus: 0, count: 8, sticker: 'arara' },
  { id: 3, name: 'Pedra da Tartaruga', ops: ['add', 'sub'], bonus: 0, count: 8, sticker: 'tartaruga' },
  { id: 4, name: 'Galho do Mico', ops: ['mul'], bonus: 0, count: 8, sticker: 'mico' },
  { id: 5, name: 'Jardim das Borboletas', ops: ['div'], bonus: 0, count: 8, sticker: 'borboleta' },
  { id: 6, name: 'Lagoa do Jacaré', ops: ['mul', 'div'], bonus: 0, count: 8, sticker: 'jacare' },
  { id: 7, name: 'Árvore da Preguiça', ops: ['add'], bonus: 1, count: 8, sticker: 'preguica' },
  { id: 8, name: 'Curva do Boto', ops: ['sub'], bonus: 1, count: 8, sticker: 'boto' },
  { id: 9, name: 'Toca da Coruja', ops: ['mul'], bonus: 1, count: 8, sticker: 'coruja' },
  { id: 10, name: 'Morada da Onça', ops: ['add', 'sub', 'mul', 'div'], bonus: 1, count: 10, sticker: 'onca' },
];

export interface Sticker {
  id: string;
  emoji: string;
  name: string;
  price?: number;
}

export const STICKERS: Sticker[] = [
  { id: 'sapo', emoji: '🐸', name: 'Sapo' },
  { id: 'arara', emoji: '🦜', name: 'Arara' },
  { id: 'tartaruga', emoji: '🐢', name: 'Tartaruga' },
  { id: 'mico', emoji: '🐒', name: 'Mico' },
  { id: 'borboleta', emoji: '🦋', name: 'Borboleta' },
  { id: 'jacare', emoji: '🐊', name: 'Jacaré' },
  { id: 'preguica', emoji: '🦥', name: 'Preguiça' },
  { id: 'boto', emoji: '🐬', name: 'Boto' },
  { id: 'coruja', emoji: '🦉', name: 'Coruja' },
  { id: 'onca', emoji: '🐆', name: 'Onça' },
  { id: 'abelha', emoji: '🐝', name: 'Abelha', price: 25 },
  { id: 'joaninha', emoji: '🐞', name: 'Joaninha', price: 25 },
  { id: 'caranguejo', emoji: '🦀', name: 'Caranguejo', price: 30 },
  { id: 'peixe', emoji: '🐟', name: 'Tambaqui', price: 30 },
  { id: 'calango', emoji: '🦎', name: 'Calango', price: 35 },
  { id: 'caracol', emoji: '🐌', name: 'Caracol', price: 35 },
  { id: 'pato', emoji: '🦆', name: 'Pato', price: 40 },
  { id: 'jiboia', emoji: '🐍', name: 'Jiboia', price: 45 },
  { id: 'galo', emoji: '🐓', name: 'Galo', price: 50 },
  { id: 'tubarao', emoji: '🦈', name: 'Tubarão', price: 60 },
];

export const stickerById = (id: string) => STICKERS.find((s) => s.id === id);

export const PRAISE = ['Isso!', 'Mandou bem!', 'Arrasou!', 'Certinho!', 'Show!', 'Muito bom!', 'Perfeito!', 'Boa!'];
export const ENCOURAGE = ['Quase!', 'Opa, não foi dessa vez.', 'Errar faz parte!', 'Vamos juntos?'];
export const pickOne = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

/** Stars for a phase, from the number of mistakes. */
export const phaseStars = (mistakes: number) => (mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1);
