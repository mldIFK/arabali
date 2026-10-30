import { describe, expect, it } from 'vitest';
import {
  GAME_TARGET_TIMES,
  evaluateResult,
  formatTime,
  levelFor,
  timeBonus,
} from '../../src/domain/scoring';

describe('timeBonus', () => {
  it.each([
    [10, 60, 0.5],
    [30, 60, 0.5],
    [31, 60, 0.25],
    [60, 60, 0.25],
    [61, 60, 0],
    [90, 60, 0],
    [91, 60, -0.1],
    [120, 60, -0.1],
    [121, 60, -0.25],
  ])('temps %s s pour une cible de %s s → %s', (elapsed, target, expected) => {
    expect(timeBonus(elapsed, target)).toBe(expected);
  });
});

describe('evaluateResult', () => {
  it('récompense un jeu parfait et rapide par l’or', () => {
    const r = evaluateResult({ score: 100, maxScore: 100, elapsed: 30, target: 60 });
    expect(r.bonusPoints).toBe(50);
    expect(r.finalScore).toBe(150);
    expect(r.medal).toBe('gold');
    expect(r.stars).toBe(4);
  });

  it('pénalise un jeu lent', () => {
    const r = evaluateResult({ score: 100, maxScore: 100, elapsed: 200, target: 60 });
    expect(r.bonusPoints).toBe(-25);
    expect(r.finalScore).toBe(75);
    expect(r.medal).toBe('silver');
    expect(r.stars).toBe(3);
  });

  it('donne le bronze entre 50 % et 75 %', () => {
    const r = evaluateResult({ score: 60, maxScore: 100, elapsed: 100, target: 60 });
    expect(r.medal).toBe('bronze');
    expect(r.stars).toBe(2);
  });

  it('ne donne pas de médaille sous 50 %', () => {
    const r = evaluateResult({ score: 40, maxScore: 100, elapsed: 100, target: 60 });
    expect(r.medal).toBeNull();
    expect(r.stars).toBe(1);
  });

  it('ne descend jamais sous zéro', () => {
    const r = evaluateResult({ score: 0, maxScore: 100, elapsed: 500, target: 60 });
    expect(r.finalScore).toBe(0);
  });

  it('gère un score maximal nul sans diviser par zéro', () => {
    const r = evaluateResult({ score: 0, maxScore: 0, elapsed: 10, target: 60 });
    expect(r.medal).toBeNull();
  });

  it('arrondit la prime de vitesse', () => {
    expect(evaluateResult({ score: 15, maxScore: 100, elapsed: 61, target: 60 }).bonusPoints).toBe(0);
    expect(evaluateResult({ score: 15, maxScore: 100, elapsed: 20, target: 60 }).bonusPoints).toBe(8);
  });
});

describe('GAME_TARGET_TIMES', () => {
  it('définit une cible pour chacun des six jeux', () => {
    expect(GAME_TARGET_TIMES).toEqual({ ws: 120, pz: 90, sc: 60, mt: 60, cw: 120, ls: 90 });
  });
});

describe('levelFor', () => {
  it.each([
    [0, 'مبتدئ'],
    [99, 'مبتدئ'],
    [100, 'متعلّم'],
    [300, 'متقدّم'],
    [600, 'متمكّن'],
    [1000, 'بطل 🌟'],
    [2000, 'خبير 🏆'],
    [99999, 'خبير 🏆'],
  ])('%s points → %s', (points, level) => {
    expect(levelFor(points)).toBe(level);
  });
});

describe('formatTime', () => {
  it('formate en mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(125.9)).toBe('02:05');
    expect(formatTime(3600)).toBe('60:00');
  });
});
