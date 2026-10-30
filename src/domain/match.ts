import { shuffle, type RandomSource } from './random';

const MAX_PAIRS = 5;
const MIN_WORDS = 3;
const POINTS_PER_PAIR = 12;
const COMPLETION_BONUS = 15;

export class MatchSession {
  /** Mots en jeu (colonne de gauche). */
  readonly words: string[];
  /** Ordre d'affichage des images (colonne de droite). */
  readonly imageOrder: string[];
  private readonly matched = new Set<string>();
  private selectedWord: string | null = null;

  constructor(words: readonly string[], rng: RandomSource) {
    const distinct = [...new Set(words)];
    if (distinct.length < MIN_WORDS) throw new Error(`Il faut au moins ${MIN_WORDS} mots différents`);
    this.words = shuffle(distinct, rng).slice(0, MAX_PAIRS);
    this.imageOrder = shuffle(this.words, rng);
  }

  get isComplete(): boolean {
    return this.matched.size === this.words.length;
  }

  get maxScore(): number {
    return this.words.length * POINTS_PER_PAIR + COMPLETION_BONUS;
  }

  get score(): number {
    return this.matched.size * POINTS_PER_PAIR + (this.isComplete ? COMPLETION_BONUS : 0);
  }

  isMatched(word: string): boolean {
    return this.matched.has(word);
  }

  /** Renvoie false si le mot n'est pas sélectionnable. */
  selectWord(word: string): boolean {
    if (!this.words.includes(word) || this.matched.has(word)) return false;
    this.selectedWord = word;
    return true;
  }

  selectImage(word: string): 'ignored' | 'correct' | 'wrong' {
    if (this.selectedWord === null || this.matched.has(word)) return 'ignored';
    if (this.selectedWord !== word) return 'wrong';
    this.matched.add(word);
    this.selectedWord = null;
    return 'correct';
  }
}
