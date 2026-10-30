import { shuffle, type RandomSource } from './random';

const POINTS_PER_WORD = 15;
const COMPLETION_BONUS = 20;
const MAX_SHUFFLE_ATTEMPTS = 50;

export class ScrambleSession {
  private readonly words: string[];
  private wordIndex = 0;
  private correctCount = 0;
  private letters: string[] = [];

  constructor(
    words: readonly string[],
    private readonly rng: RandomSource,
  ) {
    this.words = shuffle([...new Set(words)], rng);
    this.load();
  }

  get current(): string {
    return this.words[this.wordIndex] ?? '';
  }

  get scrambled(): readonly string[] {
    return this.letters;
  }

  get index(): number {
    return this.wordIndex;
  }

  get total(): number {
    return this.words.length;
  }

  get finished(): boolean {
    return this.wordIndex >= this.words.length;
  }

  get maxScore(): number {
    return this.words.length * POINTS_PER_WORD + COMPLETION_BONUS;
  }

  get score(): number {
    const bonus = this.finished && this.correctCount === this.words.length ? COMPLETION_BONUS : 0;
    return this.correctCount * POINTS_PER_WORD + bonus;
  }

  answer(text: string): { correct: boolean; word: string } {
    const word = this.current;
    if (this.finished || text.trim() !== word) return { correct: false, word };
    this.correctCount++;
    this.next();
    return { correct: true, word };
  }

  skip(): void {
    if (!this.finished) this.next();
  }

  private next(): void {
    this.wordIndex++;
    this.load();
  }

  private load(): void {
    const word = this.current;
    const original = [...word];
    let letters = original;
    for (let i = 0; i < MAX_SHUFFLE_ATTEMPTS; i++) {
      letters = shuffle(original, this.rng);
      if (letters.join('') !== word) break;
    }
    this.letters = letters;
  }
}
