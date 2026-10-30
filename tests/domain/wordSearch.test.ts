import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../../src/domain/random';
import {
  WordSearchSession,
  generateWordSearch,
  placementCells,
  suggestGridSize,
  type WordSearchGrid,
} from '../../src/domain/wordSearch';

const ARABIC_LETTER = /^[ء-ي]$/;
const WORDS = ['قطة', 'كلب', 'أسد', 'فيل', 'قمر'];

describe('suggestGridSize', () => {
  it.each([
    [2, 7],
    [3, 7],
    [4, 8],
    [5, 9],
    [6, 10],
    [7, 11],
    [8, 12],
    [15, 12],
  ])('mot le plus long de %s lettres → grille %s', (longest, size) => {
    expect(suggestGridSize(longest)).toBe(size);
  });
});

describe('generateWordSearch', () => {
  it('place tous les mots, dans la grille, avec les bonnes lettres', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const grid = generateWordSearch(WORDS, 8, new SeededRandom(seed));
      expect(grid.placements.map(p => p.word).sort()).toEqual([...WORDS].sort());
      for (const p of grid.placements) {
        placementCells(p).forEach(([r, c], i) => {
          expect(r).toBeGreaterThanOrEqual(0);
          expect(c).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(8);
          expect(c).toBeLessThan(8);
          expect(grid.cells[r]?.[c]).toBe([...p.word][i]);
        });
      }
    }
  });

  it('remplit toute la grille avec une lettre arabe par case', () => {
    const grid = generateWordSearch(WORDS, 9, new SeededRandom(3));
    expect(grid.cells).toHaveLength(9);
    for (const row of grid.cells) {
      expect(row).toHaveLength(9);
      for (const cell of row) expect(cell).toMatch(ARABIC_LETTER);
    }
  });

  it('est déterministe pour une graine donnée', () => {
    const a = generateWordSearch(WORDS, 8, new SeededRandom(99));
    const b = generateWordSearch(WORDS, 8, new SeededRandom(99));
    expect(a).toEqual(b);
  });

  it('écarte les mots qui ne tiennent pas (longueur > taille - 1)', () => {
    const grid = generateWordSearch(['سلحفاة', 'قطة'], 6, new SeededRandom(1));
    expect(grid.placements.map(p => p.word)).toEqual(['قطة']);
  });

  it('renvoie aucune position si aucun mot ne tient', () => {
    expect(generateWordSearch(['سلحفاة'], 6, new SeededRandom(1)).placements).toEqual([]);
  });
});

/** Grille fixe : قطة (horizontal en 0,0) et كلب (vertical en 2,3), le reste « ز ». */
function fixedGrid(): WordSearchGrid {
  const cells = Array.from({ length: 7 }, () => Array<string>(7).fill('ز'));
  [...'قطة'].forEach((l, i) => (cells[0]![i] = l));
  [...'كلب'].forEach((l, i) => (cells[2 + i]![3] = l));
  return {
    size: 7,
    cells,
    placements: [
      { word: 'قطة', row: 0, col: 0, dir: 'H' },
      { word: 'كلب', row: 2, col: 3, dir: 'V' },
    ],
  };
}

const newSession = () => new WordSearchSession(fixedGrid(), new SeededRandom(1));

function selectAll(session: WordSearchSession, cells: Array<[number, number]>) {
  let last;
  for (const [r, c] of cells) last = session.select(r, c);
  return last;
}

describe('WordSearchSession', () => {
  it('trouve un mot sélectionné dans l’ordre (+10)', () => {
    const s = newSession();
    const outcome = selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    expect(outcome).toEqual({ kind: 'found', placement: expect.objectContaining({ word: 'قطة' }) });
    expect(s.score).toBe(10);
    expect(s.foundWords).toEqual(['قطة']);
    expect(s.selection).toEqual([]);
  });

  it('trouve aussi un mot sélectionné à l’envers', () => {
    const s = newSession();
    expect(selectAll(s, [[4, 3], [3, 3], [2, 3]])?.kind).toBe('found');
  });

  it('indique si la sélection est un début de mot possible', () => {
    const s = newSession();
    expect(s.select(0, 0)).toEqual({ kind: 'extended', letters: 'ق', promising: true });
    expect(s.select(1, 0)).toMatchObject({ kind: 'extended', promising: false });
  });

  it('un clic non adjacent recommence une sélection', () => {
    const s = newSession();
    s.select(0, 0);
    expect(s.select(5, 5).kind).toBe('restarted');
    expect(s.selection).toEqual([[5, 5]]);
  });

  it('cliquer la dernière case la désélectionne', () => {
    const s = newSession();
    s.select(0, 0);
    s.select(0, 1);
    expect(s.select(0, 1).kind).toBe('deselected');
    expect(s.selection).toEqual([[0, 0]]);
  });

  it('cliquer une case plus ancienne tronque la sélection', () => {
    const s = newSession();
    selectAll(s, [[0, 0], [0, 1]]);
    expect(s.select(0, 0).kind).toBe('truncated');
    expect(s.selection).toEqual([[0, 0]]);
  });

  it('rejette une sélection sans issue dès qu’elle atteint la longueur max', () => {
    const s = newSession();
    expect(s.select(4, 0).kind).toBe('extended');
    expect(s.select(4, 1).kind).toBe('extended');
    expect(s.select(4, 2).kind).toBe('rejected');
    expect(s.selection).toEqual([]);
  });

  it('ne recompte pas un mot déjà trouvé', () => {
    const s = newSession();
    selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    expect(s.foundWords).toEqual(['قطة']);
    expect(s.score).toBe(10);
  });

  it('l’indice coûte 5 points sans passer sous zéro', () => {
    const s = newSession();
    expect(s.hint()).not.toBeNull();
    expect(s.score).toBe(0);
    selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    s.hint();
    expect(s.score).toBe(5);
  });

  it('l’indice désigne un mot restant et sa première case', () => {
    const s = newSession();
    selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    expect(s.hint()).toEqual({ row: 2, col: 3, word: 'كلب', length: 3 });
  });

  it('terminer la grille donne 25 points de bonus', () => {
    const s = newSession();
    selectAll(s, [[0, 0], [0, 1], [0, 2]]);
    expect(s.isComplete).toBe(false);
    selectAll(s, [[2, 3], [3, 3], [4, 3]]);
    expect(s.isComplete).toBe(true);
    expect(s.score).toBe(45);
    expect(s.maxScore).toBe(45);
    expect(s.hint()).toBeNull();
  });
});
