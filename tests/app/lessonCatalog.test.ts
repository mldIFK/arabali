import { describe, expect, it } from 'vitest';
import { LessonCatalog } from '../../src/app/lessonCatalog';
import { WordRepository } from '../../src/app/wordRepository';
import { DEFAULT_THEMES, DEFAULT_WORDS } from '../../src/domain/themes';
import { WordList } from '../../src/domain/word';
import { MemoryStore } from '../../src/infrastructure/keyValueStore';

const make = (store = new MemoryStore()) => ({
  store,
  words: new WordRepository(store),
  catalog: new LessonCatalog(store, new WordRepository(store)),
});

describe('LessonCatalog', () => {
  it('propose le lot de départ puis toutes les leçons par défaut, sans « كلماتي » au premier lancement', () => {
    const { catalog } = make();
    expect(catalog.lessons.map(l => l.id)).toEqual(['starter', ...DEFAULT_THEMES.map(t => t.id)]);
    expect(catalog.custom).toBeNull();
  });

  it('active le lot de départ (mots du Coran) au premier lancement', () => {
    const { catalog } = make();
    expect(catalog.active.id).toBe('starter');
    expect(catalog.activeWords.texts).toEqual(DEFAULT_WORDS.map(w => w.text));
  });

  it('change de leçon et s’en souvient', () => {
    const { store, catalog } = make();
    expect(catalog.activate('quran-animals')).toBe(true);
    expect(catalog.active.id).toBe('quran-animals');
    expect(new LessonCatalog(store, new WordRepository(store)).active.id).toBe('quran-animals');
  });

  it('refuse une leçon inconnue', () => {
    const { catalog } = make();
    expect(catalog.activate('nimporte-quoi')).toBe(false);
    expect(catalog.active.id).toBe('starter');
  });

  it('classe chaque leçon selon son origine', () => {
    const kinds = Object.fromEntries(make().catalog.lessons.map(l => [l.id, l.kind]));
    expect(kinds.starter).toBe('starter');
    expect(kinds['quran-cosmos']).toBe('quran');
    expect(kinds.animaux).toBe('classic');
  });

  it('saveCustom crée « كلماتي » en tête de liste et l’active', () => {
    const { catalog } = make();
    catalog.saveCustom(WordList.parse('قطة، كلب، أسد'));
    expect(catalog.lessons[0]?.id).toBe('custom');
    expect(catalog.active.id).toBe('custom');
    expect(catalog.activeWords.texts).toEqual(['قطة', 'كلب', 'أسد']);
    expect(catalog.lessons).toHaveLength(DEFAULT_THEMES.length + 2);
  });

  it('activer une leçon par défaut ne touche pas à « كلماتي »', () => {
    const { catalog } = make();
    catalog.saveCustom(WordList.parse('قطة، كلب'));
    catalog.activate('quran-values');
    expect(catalog.active.id).toBe('quran-values');
    expect(catalog.custom?.words.texts).toEqual(['قطة', 'كلب']);
    catalog.activate('custom');
    expect(catalog.activeWords.texts).toEqual(['قطة', 'كلب']);
  });

  it('reprend la liste de l’ancienne application comme « كلماتي » active', () => {
    const store = new MemoryStore();
    store.set('arabicGamesPremiumWords_v1', JSON.stringify({ words: ['شمس', 'قمر'], savedAt: 1 }));
    const catalog = new LessonCatalog(store, new WordRepository(store));
    expect(catalog.active.id).toBe('custom');
    expect(catalog.activeWords.texts).toEqual(['شمس', 'قمر']);
  });

  it('retombe sur le lot de départ si la leçon mémorisée n’existe plus', () => {
    const store = new MemoryStore();
    store.set('arabaliActiveLesson_v1', 'custom'); // mais aucune liste personnelle
    expect(new LessonCatalog(store, new WordRepository(store)).active.id).toBe('starter');
  });
});

describe('WordRepository.loadStored', () => {
  it('renvoie null tant que rien n’est enregistré, puis la liste', () => {
    const store = new MemoryStore();
    const repo = new WordRepository(store);
    expect(repo.loadStored()).toBeNull();
    repo.save(WordList.parse('قطة، كلب'));
    expect(repo.loadStored()?.texts).toEqual(['قطة', 'كلب']);
  });
});
