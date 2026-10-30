import { shuffle, type RandomSource } from './random';

export type Direction = 'H' | 'V';
export type Cell = readonly [row: number, col: number];

export interface Placement {
  word: string;
  row: number;
  col: number;
  dir: Direction;
}

export interface WordSearchGrid {
  size: number;
  cells: string[][];
  placements: Placement[];
}

const FILLER = [...'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'];
const RANDOM_ATTEMPTS = 300;

export function suggestGridSize(longestWord: number): number {
  return Math.min(12, Math.max(7, longestWord + 4));
}

export function placementCells(p: Placement): Cell[] {
  return [...p.word].map((_, i) => (p.dir === 'H' ? [p.row, p.col + i] : [p.row + i, p.col]) as Cell);
}

/** Positions de croisement : le mot `word` coupe perpendiculairement le mot déjà posé `host`. */
export function crossingPlacements(word: string, host: Placement): Placement[] {
  const letters = [...word];
  const hostLetters = [...host.word];
  const result: Placement[] = [];
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < hostLetters.length; j++) {
      if (letters[i] !== hostLetters[j]) continue;
      const placement: Placement =
        host.dir === 'H'
          ? { word, row: host.row - i, col: host.col + j, dir: 'V' }
          : { word, row: host.row + j, col: host.col - i, dir: 'H' };
      if (placement.row >= 0 && placement.col >= 0) result.push(placement);
    }
  }
  return result;
}

export function generateWordSearch(words: readonly string[], size: number, rng: RandomSource): WordSearchGrid {
  const cells = Array.from({ length: size }, () => Array<string>(size).fill(''));
  const placements: Placement[] = [];
  const pool = shuffle([...new Set(words)].filter(w => [...w].length <= size - 1), rng);

  const fits = (p: Placement, requireOverlap: boolean): boolean => {
    const letters = [...p.word];
    const end = (p.dir === 'H' ? p.col : p.row) + letters.length;
    if (end > size || p.row >= size || p.col >= size) return false;
    let overlaps = 0;
    for (const [i, [r, c]] of placementCells(p).entries()) {
      const current = cells[r]![c]!;
      if (current === '') continue;
      if (current !== letters[i]) return false;
      overlaps++;
    }
    return !requireOverlap || overlaps > 0;
  };
  const put = (p: Placement): void => {
    const letters = [...p.word];
    placementCells(p).forEach(([r, c], i) => (cells[r]![c] = letters[i]!));
    placements.push(p);
  };

  const [first, ...rest] = pool;
  if (first !== undefined) {
    const len = [...first].length;
    const dir: Direction = rng.next() < 0.5 ? 'H' : 'V';
    const mid = Math.floor(size / 2);
    const start = Math.floor((size - len) / 2);
    put({ word: first, row: dir === 'H' ? mid : start, col: dir === 'H' ? start : mid, dir });
  }

  for (const word of rest) {
    const crossings = placements.flatMap(host => crossingPlacements(word, host)).filter(p => fits(p, true));
    if (crossings.length > 0) {
      put(rng.pick(crossings));
      continue;
    }
    const len = [...word].length;
    for (let attempt = 0; attempt < RANDOM_ATTEMPTS; attempt++) {
      const dir: Direction = rng.next() < 0.5 ? 'H' : 'V';
      const candidate: Placement =
        dir === 'H'
          ? { word, row: rng.int(size), col: rng.int(size - len + 1), dir }
          : { word, row: rng.int(size - len + 1), col: rng.int(size), dir };
      if (fits(candidate, false)) {
        put(candidate);
        break;
      }
    }
  }

  for (const row of cells) for (let c = 0; c < size; c++) if (row[c] === '') row[c] = rng.pick(FILLER);
  return { size, cells, placements };
}

export type SelectionOutcome =
  | { kind: 'deselected' }
  | { kind: 'truncated' }
  | { kind: 'restarted' }
  | { kind: 'extended'; letters: string; promising: boolean }
  | { kind: 'rejected'; letters: string }
  | { kind: 'found'; placement: Placement };

export interface Hint {
  row: number;
  col: number;
  word: string;
  length: number;
}

const POINTS_PER_WORD = 10;
const HINT_COST = 5;
const COMPLETION_BONUS = 25;

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
const reversed = (s: string) => [...s].reverse().join('');

export class WordSearchSession {
  private readonly found = new Set<string>();
  private selected: Cell[] = [];
  private points = 0;

  constructor(
    readonly grid: WordSearchGrid,
    private readonly rng: RandomSource,
  ) {}

  get selection(): readonly Cell[] {
    return this.selected;
  }

  get foundWords(): string[] {
    return [...this.found];
  }

  get isComplete(): boolean {
    return this.grid.placements.length > 0 && this.found.size === this.grid.placements.length;
  }

  get score(): number {
    return this.points;
  }

  get maxScore(): number {
    return this.grid.placements.length * POINTS_PER_WORD + COMPLETION_BONUS;
  }

  select(row: number, col: number): SelectionOutcome {
    const cell: Cell = [row, col];
    const last = this.selected[this.selected.length - 1];
    if (last && same(last, cell)) {
      this.selected.pop();
      return { kind: 'deselected' };
    }
    const earlier = this.selected.findIndex(c => same(c, cell));
    if (earlier >= 0) {
      this.selected = this.selected.slice(0, earlier + 1);
      return { kind: 'truncated' };
    }
    if (last && Math.abs(row - last[0]) + Math.abs(col - last[1]) !== 1) {
      this.selected = [cell];
      return { kind: 'restarted' };
    }

    this.selected.push(cell);
    const letters = this.selected.map(([r, c]) => this.grid.cells[r]![c]!).join('');
    const match = this.remaining().find(p => p.word === letters || p.word === reversed(letters));
    if (match) {
      this.found.add(match.word);
      this.selected = [];
      this.points += POINTS_PER_WORD + (this.isComplete ? COMPLETION_BONUS : 0);
      return { kind: 'found', placement: match };
    }

    const promising = this.remaining().some(p => p.word.startsWith(letters) || reversed(p.word).startsWith(letters));
    const longest = Math.max(0, ...this.remaining().map(p => [...p.word].length));
    if (!promising && this.selected.length >= longest) {
      this.selected = [];
      return { kind: 'rejected', letters };
    }
    return { kind: 'extended', letters, promising };
  }

  hint(): Hint | null {
    const remaining = this.remaining();
    if (remaining.length === 0) return null;
    const p = this.rng.pick(remaining);
    this.points = Math.max(0, this.points - HINT_COST);
    return { row: p.row, col: p.col, word: p.word, length: [...p.word].length };
  }

  private remaining(): Placement[] {
    return this.grid.placements.filter(p => !this.found.has(p.word));
  }
}
