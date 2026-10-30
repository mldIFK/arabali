import { describe, expect, it } from 'vitest';
import { CrosswordSession, generateCrossword, type Crossword } from '../../src/domain/crossword';
import { SeededRandom } from '../../src/domain/random';
import { placementCells } from '../../src/domain/wordSearch';

const WORDS = ['سماء', 'ماء', 'نجم', 'جمل'];

describe('generateCrossword', () => {
  it('croise les mots entre eux', () => {
    const cw = generateCrossword(WORDS, new SeededRandom(1));
    expect(cw.placements.length).toBeGreaterThanOrEqual(3);
  });

  it('écrit chaque mot dans la grille de façon cohérente', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const cw = generateCrossword(WORDS, new SeededRandom(seed));
      for (const p of cw.placements) {
        placementCells(p).forEach(([r, c], i) => expect(cw.grid[r]?.[c]).toBe([...p.word][i]));
      }
    }
  });

  it('place le mot le plus long en premier, au centre', () => {
    const cw = generateCrossword(WORDS, new SeededRandom(1));
    expect(cw.placements[0]).toMatchObject({ word: 'سماء', dir: 'H', row: 12 });
  });

  it('donne la première lettre de chaque mot mais pas toutes les lettres', () => {
    const cw = generateCrossword(WORDS, new SeededRandom(2));
    let total = 0;
    const all = new Set<string>();
    for (const p of cw.placements) {
      const cells = placementCells(p);
      expect(cw.givenCells.has(cells[0]!.join(','))).toBe(true);
      cells.forEach(c => all.add(c.join(',')));
      total += cells.length;
    }
    expect(total).toBeGreaterThan(0);
    expect(cw.givenCells.size).toBeLessThan(all.size);
  });

  it('calcule des bornes qui englobent tous les mots', () => {
    const cw = generateCrossword(WORDS, new SeededRandom(1));
    for (const p of cw.placements) {
      for (const [r, c] of placementCells(p)) {
        expect(r).toBeGreaterThanOrEqual(cw.bounds.minRow);
        expect(r).toBeLessThanOrEqual(cw.bounds.maxRow);
        expect(c).toBeGreaterThanOrEqual(cw.bounds.minCol);
        expect(c).toBeLessThanOrEqual(cw.bounds.maxCol);
      }
    }
  });

  it('est déterministe pour une graine donnée', () => {
    const a = generateCrossword(WORDS, new SeededRandom(5));
    const b = generateCrossword(WORDS, new SeededRandom(5));
    expect(a.placements).toEqual(b.placements);
    expect([...a.givenCells]).toEqual([...b.givenCells]);
  });

  it('échoue si les mots ne peuvent pas se croiser', () => {
    expect(() => generateCrossword(['قط', 'بو'], new SeededRandom(1))).toThrow();
  });
});

describe('CrosswordSession', () => {
  const make = (): { cw: Crossword; session: CrosswordSession } => {
    const cw = generateCrossword(WORDS, new SeededRandom(1));
    return { cw, session: new CrosswordSession(cw, new SeededRandom(1)) };
  };

  const solution = (cw: Crossword, keys: readonly string[]) =>
    new Map(keys.map(k => {
      const [r, c] = k.split(',').map(Number) as [number, number];
      return [k, cw.grid[r]![c]!] as const;
    }));

  it('liste les cases à remplir (celles qui ne sont pas données)', () => {
    const { cw, session } = make();
    for (const key of session.editableCells) expect(cw.givenCells.has(key)).toBe(false);
    expect(session.editableCells.length).toBeGreaterThan(0);
  });

  it('valide une grille complète et juste', () => {
    const { cw, session } = make();
    const result = session.check(solution(cw, session.editableCells));
    expect(result).toEqual({ correct: session.editableCells.length, total: session.editableCells.length, solved: true });
    expect(session.isComplete).toBe(true);
    expect(session.score).toBe(session.maxScore);
    expect(session.maxScore).toBe(cw.placements.length * 20 + 30);
  });

  it('signale les cases fausses ou vides', () => {
    const { session } = make();
    const entries = new Map<string, string>([[session.editableCells[0]!, 'ز']]);
    const result = session.check(entries);
    expect(result.solved).toBe(false);
    expect(result.correct).toBeLessThan(result.total);
    expect(session.isComplete).toBe(false);
    expect(session.score).toBe(0);
  });

  it('l’indice révèle une lettre juste et coûte 3 points sur le score final', () => {
    const { cw, session } = make();
    const hint = session.hint(new Map());
    expect(hint).not.toBeNull();
    expect(session.editableCells).toContain(hint!.key);
    const [r, c] = hint!.key.split(',').map(Number) as [number, number];
    expect(hint!.letter).toBe(cw.grid[r]![c]);
    session.check(solution(cw, session.editableCells));
    expect(session.score).toBe(session.maxScore - 3);
  });

  it('l’indice ne propose pas une case déjà juste', () => {
    const { cw, session } = make();
    const entries = solution(cw, session.editableCells);
    expect(session.hint(entries)).toBeNull();
  });
});
