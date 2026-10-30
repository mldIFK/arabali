const MIN_LETTERS = 2;
const SEPARATORS = /[،,؛;\n\r]+/;

function clean(raw: string): string {
  return raw.replace(/^﻿/, '').trim().replace(/\s+/g, ' ');
}

export class Word {
  private constructor(
    readonly text: string,
    readonly source?: string,
  ) {}

  /** Crée un mot ; lève une erreur s'il a moins de deux lettres. */
  static of(raw: string, source?: string): Word {
    const text = clean(raw);
    if ([...text].filter(c => c !== ' ').length < MIN_LETTERS) {
      throw new Error(`Mot invalide : « ${raw} »`);
    }
    return new Word(text, source);
  }

  /** Lettres sans les espaces. */
  get letters(): string[] {
    return [...this.text].filter(c => c !== ' ');
  }

  equals(other: Word): boolean {
    return this.text === other.text;
  }
}

export class WordList {
  private constructor(readonly words: readonly Word[]) {}

  static of(words: readonly Word[]): WordList {
    const seen = new Set<string>();
    return new WordList(words.filter(w => !seen.has(w.text) && !!seen.add(w.text)));
  }

  /** Analyse un texte libre (virgules, point-virgules, lignes…). */
  static parse(raw: string): WordList {
    const words: Word[] = [];
    for (const part of raw.split(SEPARATORS)) {
      try {
        words.push(Word.of(part));
      } catch {
        // élément vide ou trop court : ignoré
      }
    }
    return WordList.of(words);
  }

  get size(): number {
    return this.words.length;
  }

  get texts(): string[] {
    return this.words.map(w => w.text);
  }

  get longestLength(): number {
    return this.words.reduce((max, w) => Math.max(max, w.letters.length), 0);
  }

  toInputString(): string {
    return this.texts.join('، ');
  }
}
