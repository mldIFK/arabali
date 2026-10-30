import { shuffle, type RandomSource } from './random';

const POINTS_PER_WORD = 20;
const COMPLETION_BONUS = 30;
/** Nombre d'échecs à partir duquel on souligne la première lettre. */
const HINT_AFTER_ATTEMPTS = 2;

export interface Piece {
  id: number;
  letter: string;
  used: boolean;
}

export type PickOutcome = 'ignored' | 'placed' | 'correct' | 'wrong';

export class PuzzleSession {
  private readonly words: string[];
  private wordIndex = 0;
  private correctWords = 0;
  private attemptCount = 0;
  private hintOn = false;
  private locked = false;
  private pieceList: Piece[] = [];
  private placedLetters: Piece[] = [];

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

  get index(): number {
    return this.wordIndex;
  }

  get total(): number {
    return this.words.length;
  }

  get pieces(): readonly Piece[] {
    return this.pieceList;
  }

  get placed(): string[] {
    return this.placedLetters.map(p => p.letter);
  }

  get attempts(): number {
    return this.attemptCount;
  }

  get hintActive(): boolean {
    return this.hintOn;
  }

  get finished(): boolean {
    return this.wordIndex >= this.words.length;
  }

  get maxScore(): number {
    return this.words.length * POINTS_PER_WORD + COMPLETION_BONUS;
  }

  get score(): number {
    const bonus = this.finished && this.correctWords === this.words.length ? COMPLETION_BONUS : 0;
    return this.correctWords * POINTS_PER_WORD + bonus;
  }

  pick(id: number): PickOutcome {
    const piece = this.pieceList.find(p => p.id === id);
    if (this.locked || this.finished || !piece || piece.used) return 'ignored';
    piece.used = true;
    this.placedLetters.push(piece);
    if (this.placedLetters.length < this.pieceList.length) return 'placed';

    this.locked = true;
    if (this.placed.join('') === this.current) {
      this.correctWords++;
      return 'correct';
    }
    this.attemptCount++;
    return 'wrong';
  }

  /** Après une erreur : repose toutes les pièces, mélangées. */
  retry(): void {
    this.placedLetters = [];
    this.pieceList = shuffle(this.pieceList, this.rng).map(p => ({ ...p, used: false }));
    this.hintOn = this.attemptCount >= HINT_AFTER_ATTEMPTS;
    this.locked = false;
  }

  /** Après une réussite : mot suivant. */
  advance(): void {
    this.wordIndex++;
    this.load();
  }

  private load(): void {
    this.attemptCount = 0;
    this.hintOn = false;
    this.locked = false;
    this.placedLetters = [];
    this.pieceList = shuffle(
      [...this.current].map((letter, id) => ({ id, letter, used: false })),
      this.rng,
    );
  }
}
