import type { RandomSource } from '../../domain/random';
import type { Praise, Sfx, Speech, Toast } from '../services';
import type { WordImages } from '../images';

export interface GameHost {
  readonly area: HTMLElement;
  setScore(score: number): void;
  setTitle(title: string): void;
  startTimer(): void;
  /** Termine la partie : calcul du résultat et passage à l'écran de résultat. */
  finish(title: string, score: number, maxScore: number): void;
  /** Quitte vers le choix des jeux (ex. : impossible de construire la partie). */
  exit(): void;
}

export interface GameServices {
  sfx: Sfx;
  speech: Speech;
  praise: Praise;
  images: WordImages;
  toast: Toast;
  rng: RandomSource;
}

/** Couleurs distinctes pour repérer chaque mot. */
export const WORD_COLORS = [
  '#e74c3c', '#2980b9', '#27ae60', '#e67e22', '#8e44ad', '#16a085',
  '#d35400', '#c0392b', '#7f8c8d', '#3498db', '#f39c12', '#2c3e50',
];

export abstract class GameView {
  private readonly timers = new Set<number>();
  private closed = false;

  constructor(
    protected readonly host: GameHost,
    protected readonly svc: GameServices,
    protected readonly words: readonly string[],
  ) {}

  abstract start(): void | Promise<void>;

  /** Minuterie annulée automatiquement si le joueur quitte la partie. */
  protected after(ms: number, fn: () => void): void {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.closed) fn();
    }, ms);
    this.timers.add(id);
  }

  protected get isClosed(): boolean {
    return this.closed;
  }

  dispose(): void {
    this.closed = true;
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();
  }
}
