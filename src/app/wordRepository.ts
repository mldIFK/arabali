import { DEFAULT_THEMES, DEFAULT_WORDS } from '../domain/themes';
import { Word, WordList } from '../domain/word';
import type { KeyValueStore } from '../infrastructure/keyValueStore';

// Même clé que l'ancienne application.
const WORDS_KEY = 'arabicGamesPremiumWords_v1';

/** Sourate connue pour chaque mot du catalogue (les listes enregistrées ne stockent que le texte). */
const KNOWN_SOURCES = new Map(
  DEFAULT_THEMES.flatMap(t => t.words).flatMap(w => (w.source ? [[w.text, w.source] as const] : [])),
);

/** Rattache la sourate aux mots connus du catalogue coranique. */
export function withKnownSources(list: WordList): WordList {
  return WordList.of(list.words.map(w => Word.of(w.text, w.source ?? KNOWN_SOURCES.get(w.text))));
}

export class WordRepository {
  constructor(private readonly store: KeyValueStore) {}

  /** La liste enregistrée par l'utilisateur, ou null s'il n'en a jamais enregistré. */
  loadStored(): WordList | null {
    try {
      const raw: unknown = JSON.parse(this.store.get(WORDS_KEY) ?? 'null');
      const texts = (raw as { words?: unknown } | null)?.words;
      if (Array.isArray(texts)) {
        const list = WordList.parse(texts.filter((t): t is string => typeof t === 'string').join('،'));
        if (list.size > 0) return withKnownSources(list);
      }
    } catch {
      // liste illisible : comme si elle n'existait pas
    }
    return null;
  }

  /** La liste enregistrée, sinon les mots du Coran par défaut. */
  load(): WordList {
    return this.loadStored() ?? WordList.of(DEFAULT_WORDS);
  }

  save(list: WordList): void {
    this.store.set(WORDS_KEY, JSON.stringify({ words: list.texts, savedAt: Date.now() }));
  }
}
