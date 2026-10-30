import { shuffle, type RandomSource } from './random';
import { crossingPlacements, placementCells, type Placement } from './wordSearch';

const GRID_SIZE = 25;
const POINTS_PER_WORD = 20;
const COMPLETION_BONUS = 30;
const HINT_COST = 3;
/** Part des lettres (hors première) révélées d'office dans chaque mot. */
const GIVEN_RATIO = 0.3;

export interface Bounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

export interface Crossword {
  size: number;
  grid: string[][];
  placements: Placement[];
  /** Clés « ligne,colonne » des cases déjà remplies. */
  givenCells: ReadonlySet<string>;
  bounds: Bounds;
}

export const cellKey = (row: number, col: number) => `${row},${col}`;

export function parseCellKey(key: string): [number, number] {
  const [r, c] = key.split(',').map(Number);
  return [r ?? 0, c ?? 0];
}

export function generateCrossword(words: readonly string[], rng: RandomSource, size = GRID_SIZE): Crossword {
  const grid = Array.from({ length: size }, () => Array<string>(size).fill(''));
  const placements: Placement[] = [];
  const sorted = [...new Set(words)].sort((a, b) => [...b].length - [...a].length);

  const fits = (p: Placement): boolean => {
    const letters = [...p.word];
    if ((p.dir === 'H' ? p.col : p.row) + letters.length > size || p.row >= size || p.col >= size) return false;
    return placementCells(p).every(([r, c], i) => grid[r]![c] === '' || grid[r]![c] === letters[i]);
  };
  const put = (p: Placement): void => {
    const letters = [...p.word];
    placementCells(p).forEach(([r, c], i) => (grid[r]![c] = letters[i]!));
    placements.push(p);
  };

  const [first, ...rest] = sorted;
  if (first !== undefined) {
    put({ word: first, row: Math.floor(size / 2), col: Math.floor((size - [...first].length) / 2), dir: 'H' });
  }
  for (const word of rest) {
    const spot = placements.flatMap(host => crossingPlacements(word, host)).find(fits);
    if (spot) put(spot);
  }
  if (placements.length < 2) throw new Error('Impossible de construire la grille de mots croisés');

  const given = new Set<string>();
  for (const p of placements) {
    const keys = placementCells(p).map(([r, c]) => cellKey(r, c));
    given.add(keys[0]!);
    const extra = Math.max(0, Math.round((keys.length - 1) * GIVEN_RATIO));
    shuffle(keys.slice(1), rng).slice(0, extra).forEach(k => given.add(k));
  }

  const rows = placements.flatMap(p => placementCells(p).map(([r]) => r));
  const cols = placements.flatMap(p => placementCells(p).map(([, c]) => c));
  const bounds: Bounds = {
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
    minCol: Math.min(...cols),
    maxCol: Math.max(...cols),
  };
  return { size, grid, placements, givenCells: given, bounds };
}

export interface CheckResult {
  correct: number;
  total: number;
  solved: boolean;
}

export class CrosswordSession {
  readonly editableCells: string[];
  private hints = 0;
  private complete = false;

  constructor(
    readonly crossword: Crossword,
    private readonly rng: RandomSource,
  ) {
    const keys = new Set<string>();
    for (const p of crossword.placements) for (const [r, c] of placementCells(p)) keys.add(cellKey(r, c));
    this.editableCells = [...keys].filter(k => !crossword.givenCells.has(k)).sort();
  }

  get isComplete(): boolean {
    return this.complete;
  }

  get maxScore(): number {
    return this.crossword.placements.length * POINTS_PER_WORD + COMPLETION_BONUS;
  }

  get score(): number {
    return this.complete ? Math.max(0, this.maxScore - this.hints * HINT_COST) : 0;
  }

  expected(key: string): string {
    const [r, c] = parseCellKey(key);
    return this.crossword.grid[r]?.[c] ?? '';
  }

  check(entries: ReadonlyMap<string, string>): CheckResult {
    const correct = this.editableCells.filter(k => entries.get(k) === this.expected(k)).length;
    const total = this.editableCells.length;
    const solved = correct === total;
    if (solved) this.complete = true;
    return { correct, total, solved };
  }

  /** Révèle une case fausse ou vide ; null si tout est déjà juste. */
  hint(entries: ReadonlyMap<string, string>): { key: string; letter: string } | null {
    const wrong = this.editableCells.filter(k => entries.get(k) !== this.expected(k));
    if (wrong.length === 0) return null;
    const key = this.rng.pick(wrong);
    this.hints++;
    return { key, letter: this.expected(key) };
  }
}
