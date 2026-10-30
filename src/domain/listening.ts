import { shuffle, type RandomSource } from './random';

const MIN_WORDS = 4;
const MAX_QUESTIONS = 8;
const OPTIONS_PER_QUESTION = 4;
const POINTS_PER_ANSWER = 12;
const COMPLETION_BONUS = 25;

export interface ListeningQuestion {
  /** Mot prononcé. */
  word: string;
  /** Mots dont l'image est proposée (dans l'ordre d'affichage). */
  options: string[];
}

export class ListeningSession {
  readonly totalQuestions: number;
  private readonly pool: string[];
  private readonly asked: ListeningQuestion[] = [];
  private correctCount = 0;
  private answered = false;

  constructor(
    words: readonly string[],
    private readonly rng: RandomSource,
  ) {
    this.pool = [...new Set(words)];
    if (this.pool.length < MIN_WORDS) throw new Error(`Il faut au moins ${MIN_WORDS} mots différents`);
    this.totalQuestions = Math.min(MAX_QUESTIONS, this.pool.length * 2);
    this.ask();
  }

  get question(): ListeningQuestion {
    return this.asked[this.asked.length - 1] as ListeningQuestion;
  }

  /** Questions posées jusqu'ici (utile pour l'impression). */
  get history(): readonly ListeningQuestion[] {
    return this.asked;
  }

  get finished(): boolean {
    return this.asked.length >= this.totalQuestions && this.answered;
  }

  get maxScore(): number {
    return this.totalQuestions * POINTS_PER_ANSWER + COMPLETION_BONUS;
  }

  get score(): number {
    const bonus = this.finished && this.correctCount === this.totalQuestions ? COMPLETION_BONUS : 0;
    return this.correctCount * POINTS_PER_ANSWER + bonus;
  }

  answer(word: string): { correct: boolean; expected: string } {
    const expected = this.question.word;
    if (this.answered) return { correct: false, expected };
    this.answered = true;
    const correct = word === expected;
    if (correct) this.correctCount++;
    return { correct, expected };
  }

  /** Passe à la question suivante (sans effet si le quiz est terminé). */
  next(): void {
    if (!this.answered || this.asked.length >= this.totalQuestions) return;
    this.ask();
  }

  private ask(): void {
    const previous = this.asked[this.asked.length - 1]?.word;
    const word = this.rng.pick(this.pool.filter(w => w !== previous));
    const wrong = shuffle(this.pool.filter(w => w !== word), this.rng).slice(0, OPTIONS_PER_QUESTION - 1);
    this.asked.push({ word, options: shuffle([word, ...wrong], this.rng) });
    this.answered = false;
  }
}
