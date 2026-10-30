import type { GameKey, Medal } from './gameKey';

/** Temps cible (secondes) par jeu. */
export const GAME_TARGET_TIMES: Record<GameKey, number> = {
  ws: 120,
  pz: 90,
  sc: 60,
  mt: 60,
  cw: 120,
  ls: 90,
};

/** Multiplicateur de score selon la rapidité par rapport au temps cible. */
export function timeBonus(elapsed: number, target: number): number {
  if (elapsed <= target * 0.5) return 0.5;
  if (elapsed <= target) return 0.25;
  if (elapsed <= target * 1.5) return 0;
  if (elapsed <= target * 2) return -0.1;
  return -0.25;
}

export interface ResultInput {
  score: number;
  maxScore: number;
  elapsed: number;
  target: number;
}

export interface GameResult {
  score: number;
  timeBonus: number;
  bonusPoints: number;
  finalScore: number;
  medal: Medal | null;
  /** De 1 à 4 étoiles. */
  stars: number;
}

export function evaluateResult({ score, maxScore, elapsed, target }: ResultInput): GameResult {
  const bonus = timeBonus(elapsed, target);
  const bonusPoints = Math.round(score * bonus);
  const finalScore = Math.max(0, score + bonusPoints);
  const ratio = maxScore > 0 ? finalScore / maxScore : 0;
  const medal: Medal | null = ratio >= 0.95 ? 'gold' : ratio >= 0.75 ? 'silver' : ratio >= 0.5 ? 'bronze' : null;
  const stars = ratio >= 0.95 ? 4 : ratio >= 0.75 ? 3 : ratio >= 0.5 ? 2 : 1;
  return { score, timeBonus: bonus, bonusPoints, finalScore, medal, stars };
}

const LEVELS: ReadonlyArray<readonly [number, string]> = [
  [2000, 'خبير 🏆'],
  [1000, 'بطل 🌟'],
  [600, 'متمكّن'],
  [300, 'متقدّم'],
  [100, 'متعلّم'],
  [0, 'مبتدئ'],
];

export function levelFor(totalScore: number): string {
  return (LEVELS.find(([threshold]) => totalScore >= threshold) ?? LEVELS[LEVELS.length - 1])![1];
}

export function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
