import { DEFAULT_THEMES, DEFAULT_WORDS } from '../domain/themes';
import { WordList } from '../domain/word';
import type { KeyValueStore } from '../infrastructure/keyValueStore';
import type { WordRepository } from './wordRepository';

export type LessonKind = 'custom' | 'starter' | 'quran' | 'classic';

export interface Lesson {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: LessonKind;
  readonly words: WordList;
}

export const CUSTOM_LESSON_ID = 'custom';
export const STARTER_LESSON_ID = 'starter';
const ACTIVE_KEY = 'arabaliActiveLesson_v1';

const STARTER: Lesson = {
  id: STARTER_LESSON_ID,
  name: '🌟 مختارات من القرآن',
  description: 'كلمات متنوعة للبداية',
  kind: 'starter',
  words: WordList.of(DEFAULT_WORDS),
};

const BUILT_IN: readonly Lesson[] = [
  STARTER,
  ...DEFAULT_THEMES.map<Lesson>(t => {
    const quran = t.id.startsWith('quran-');
    return {
      id: t.id,
      name: t.name,
      description: quran ? 'من القرآن الكريم' : 'درس عام',
      kind: quran ? 'quran' : 'classic',
      words: WordList.of(t.words),
    };
  }),
];

/**
 * Leçons disponibles (par défaut + « كلماتي ») et leçon active, partagée par toutes les sections.
 * Choisir une leçon par défaut ne modifie jamais la liste personnelle.
 */
export class LessonCatalog {
  private activeId: string;

  constructor(
    private readonly store: KeyValueStore,
    private readonly words: WordRepository,
  ) {
    const saved = store.get(ACTIVE_KEY);
    // Données de l'ancienne application : sa liste devient « كلماتي » et reste active.
    this.activeId = saved ?? (this.custom ? CUSTOM_LESSON_ID : STARTER_LESSON_ID);
    if (!this.find(this.activeId)) this.activeId = STARTER_LESSON_ID;
  }

  get custom(): Lesson | null {
    const list = this.words.loadStored();
    return list
      ? { id: CUSTOM_LESSON_ID, name: '✏️ كلماتي', description: 'قائمتك الخاصة', kind: 'custom', words: list }
      : null;
  }

  get lessons(): Lesson[] {
    const custom = this.custom;
    return custom ? [custom, ...BUILT_IN] : [...BUILT_IN];
  }

  get active(): Lesson {
    return this.find(this.activeId) ?? STARTER;
  }

  get activeWords(): WordList {
    return this.active.words;
  }

  activate(id: string): boolean {
    if (!this.find(id)) return false;
    this.activeId = id;
    this.store.set(ACTIVE_KEY, id);
    return true;
  }

  /** Enregistre la liste personnelle et l'active. */
  saveCustom(list: WordList): void {
    this.words.save(list);
    this.activate(CUSTOM_LESSON_ID);
  }

  private find(id: string): Lesson | undefined {
    return this.lessons.find(l => l.id === id);
  }
}
