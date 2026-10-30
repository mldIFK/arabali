/** Chronomètre de partie, avec horloge injectable pour les tests. */
export class GameClock {
  private startedAt: number | null = null;
  private frozen = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  get running(): boolean {
    return this.startedAt !== null;
  }

  get elapsedSeconds(): number {
    return this.startedAt === null ? this.frozen : (this.now() - this.startedAt) / 1000;
  }

  start(): void {
    this.frozen = 0;
    this.startedAt = this.now();
  }

  stop(): void {
    this.frozen = this.elapsedSeconds;
    this.startedAt = null;
  }

  reset(): void {
    this.startedAt = null;
    this.frozen = 0;
  }
}
