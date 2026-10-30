import type { RandomSource } from '../domain/random';
import type { KeyValueStore } from '../infrastructure/keyValueStore';

export type PhraseKind = 'correct' | 'wrong' | 'win';

export interface Phrase {
  key: string;
  kind: PhraseKind;
  text: string;
}

const make = (kind: PhraseKind, texts: string[]): Phrase[] =>
  texts.map((text, i) => ({ key: `${kind}_${i + 1}`, kind, text }));

export const DEFAULT_PHRASES: Record<PhraseKind, Phrase[]> = {
  correct: make('correct', ['أحسنت!', 'جيد جدًا!', 'رائع!', 'ممتاز!', 'عمل جميل!', 'بارك الله فيك!']),
  wrong: make('wrong', ['حاول مرة أخرى', 'لا بأس، أعد المحاولة', 'ليس صحيحًا', 'جرّب من جديد']),
  win: make('win', ['مبروك! لقد فزت!']),
};

const PHRASES_KEY = 'arabicGamesPremiumPhrases_v1';

/** Phrases d'encouragement, dont le texte est personnalisable. */
export class PhraseBook {
  private custom: Record<string, string> = {};

  constructor(private readonly store: KeyValueStore) {
    try {
      const raw: unknown = JSON.parse(store.get(PHRASES_KEY) ?? '{}');
      if (raw && typeof raw === 'object') this.custom = { ...(raw as Record<string, string>) };
    } catch {
      this.custom = {};
    }
  }

  get allKeys(): string[] {
    return Object.values(DEFAULT_PHRASES).flatMap(list => list.map(p => p.key));
  }

  get customTexts(): Readonly<Record<string, string>> {
    return this.custom;
  }

  phrases(kind: PhraseKind): readonly Phrase[] {
    return DEFAULT_PHRASES[kind].map(p => ({ ...p, text: this.textOf(p.key) }));
  }

  textOf(key: string): string {
    const custom = this.custom[key];
    if (custom) return custom;
    return Object.values(DEFAULT_PHRASES).flat().find(p => p.key === key)?.text ?? '';
  }

  setText(key: string, text: string): void {
    this.custom[key] = text;
    this.persist();
  }

  reset(key: string): void {
    delete this.custom[key];
    this.persist();
  }

  mergeCustom(texts: Record<string, string>): void {
    this.custom = { ...this.custom, ...texts };
    this.persist();
  }

  random(kind: PhraseKind, rng: RandomSource): Phrase {
    return rng.pick(this.phrases(kind));
  }

  private persist(): void {
    this.store.set(PHRASES_KEY, JSON.stringify(this.custom));
  }
}
