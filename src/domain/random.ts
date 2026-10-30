/** Source d'aléa injectable : permet des tests reproductibles. */
export interface RandomSource {
  /** Nombre dans [0, 1[. */
  next(): number;
  /** Entier dans [0, maxExclusive[. */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
}

abstract class BaseRandom implements RandomSource {
  abstract next(): number;

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Impossible de choisir dans une liste vide');
    return items[this.int(items.length)] as T;
  }
}

export class MathRandomSource extends BaseRandom {
  next(): number {
    return Math.random();
  }
}

/** Générateur déterministe (mulberry32). */
export class SeededRandom extends BaseRandom {
  private state: number;

  constructor(seed: number) {
    super();
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

/** Mélange de Fisher-Yates sur une copie. */
export function shuffle<T>(items: readonly T[], rng: RandomSource): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}
