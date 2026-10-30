import type { KeyValueStore } from '../infrastructure/keyValueStore';

const VISITED_KEY = 'arabicGamesPremiumLessonVisited_v1';

/** Mots déjà découverts dans le mode leçon. */
export class LessonProgress {
  private readonly visited = new Set<string>();

  constructor(private readonly store: KeyValueStore) {
    try {
      const raw: unknown = JSON.parse(store.get(VISITED_KEY) ?? '[]');
      if (Array.isArray(raw)) raw.forEach(w => typeof w === 'string' && this.visited.add(w));
    } catch {
      // ignoré : on repart de zéro
    }
  }

  get all(): string[] {
    return [...this.visited];
  }

  has(word: string): boolean {
    return this.visited.has(word);
  }

  visit(word: string): void {
    this.addAll([word]);
  }

  addAll(words: readonly string[]): void {
    words.forEach(w => this.visited.add(w));
    this.store.set(VISITED_KEY, JSON.stringify(this.all));
  }

  countVisited(words: readonly string[]): number {
    return words.filter(w => this.visited.has(w)).length;
  }
}
