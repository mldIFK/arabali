import { describe, expect, it } from 'vitest';
import { GameClock } from '../../src/domain/clock';
import { completeGame } from '../../src/domain/completion';
import { PlayerProgress } from '../../src/domain/progress';

describe('GameClock', () => {
  it('mesure le temps écoulé avec une horloge injectée', () => {
    let now = 1000;
    const clock = new GameClock(() => now);
    expect(clock.elapsedSeconds).toBe(0);
    clock.start();
    now += 2500;
    expect(clock.elapsedSeconds).toBe(2.5);
    expect(clock.running).toBe(true);
  });

  it('se fige à l’arrêt', () => {
    let now = 0;
    const clock = new GameClock(() => now);
    clock.start();
    now += 4000;
    clock.stop();
    now += 9000;
    expect(clock.elapsedSeconds).toBe(4);
    expect(clock.running).toBe(false);
  });

  it('reset remet à zéro', () => {
    let now = 0;
    const clock = new GameClock(() => now);
    clock.start();
    now += 4000;
    clock.reset();
    expect(clock.elapsedSeconds).toBe(0);
  });
});

describe('completeGame', () => {
  it('met à jour points, record et médaille du joueur', () => {
    const progress = new PlayerProgress();
    const result = completeGame(progress, 'sc', 65, 65, 25);
    expect(result.finalScore).toBe(65 + Math.round(65 * 0.5));
    expect(result.medal).toBe('gold');
    expect(progress.totalScore).toBe(result.finalScore);
    expect(progress.gamesCompleted).toBe(1);
    expect(progress.bestScores.sc).toBe(result.finalScore);
    expect(progress.bestTimes.sc).toBe(25);
    expect(progress.bestMedal('sc')).toBe('gold');
  });

  it('n’attribue aucune médaille sous 50 %', () => {
    const progress = new PlayerProgress();
    completeGame(progress, 'ws', 10, 100, 100);
    expect(progress.medalCount).toBe(0);
    expect(progress.gamesCompleted).toBe(1);
  });
});
