import type { GameKey } from './gameKey';
import type { PlayerProgress } from './progress';
import { GAME_TARGET_TIMES, evaluateResult, type GameResult } from './scoring';

/** Évalue une partie terminée et enregistre points, record et médaille du joueur. */
export function completeGame(
  progress: PlayerProgress,
  key: GameKey,
  score: number,
  maxScore: number,
  elapsed: number,
): GameResult {
  const result = evaluateResult({ score, maxScore, elapsed, target: GAME_TARGET_TIMES[key] });
  if (result.medal) progress.awardMedal(key, result.medal);
  progress.addPoints(result.finalScore);
  progress.recordGame(key, result.finalScore, elapsed);
  return result;
}
