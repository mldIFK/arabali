import { describe, expect, it } from 'vitest';
import { BackupService } from '../../src/app/backup';
import { LessonProgress } from '../../src/app/lessonProgress';
import { PhraseBook } from '../../src/app/phraseBook';
import { WordRepository } from '../../src/app/wordRepository';
import { PlayerRegistry } from '../../src/domain/progress';
import { SeededRandom } from '../../src/domain/random';
import { DEFAULT_WORDS } from '../../src/domain/themes';
import { Word, WordList } from '../../src/domain/word';
import { MemoryStore } from '../../src/infrastructure/keyValueStore';
import { InMemoryMediaStore } from '../../src/infrastructure/mediaStore';

describe('WordRepository', () => {
  it('propose les mots du Coran au premier lancement', () => {
    const list = new WordRepository(new MemoryStore()).load();
    expect(list.texts).toEqual(DEFAULT_WORDS.map(w => w.text));
  });

  it('retrouve la liste enregistrée', () => {
    const store = new MemoryStore();
    new WordRepository(store).save(WordList.parse('قطة، كلب، أسد'));
    expect(new WordRepository(store).load().texts).toEqual(['قطة', 'كلب', 'أسد']);
  });

  it('retombe sur les mots par défaut si la liste enregistrée est vide ou illisible', () => {
    const store = new MemoryStore();
    store.set('arabicGamesPremiumWords_v1', '{pas du json');
    expect(new WordRepository(store).load().size).toBe(DEFAULT_WORDS.length);
    store.set('arabicGamesPremiumWords_v1', JSON.stringify({ words: [] }));
    expect(new WordRepository(store).load().size).toBe(DEFAULT_WORDS.length);
  });

  it('relit le format de l’ancienne application', () => {
    const store = new MemoryStore();
    store.set('arabicGamesPremiumWords_v1', JSON.stringify({ words: ['شمس', 'قمر'], savedAt: 1 }));
    expect(new WordRepository(store).load().texts).toEqual(['شمس', 'قمر']);
  });

  it('retrouve la sourate des mots du Coran', () => {
    const store = new MemoryStore();
    const repo = new WordRepository(store);
    repo.save(WordList.of([Word.of('شمس')]));
    expect(repo.load().words[0]?.source).toBe('سورة الشمس');
  });
});

describe('PhraseBook', () => {
  it('fournit des phrases par défaut pour chaque situation', () => {
    const book = new PhraseBook(new MemoryStore());
    expect(book.phrases('correct').length).toBeGreaterThanOrEqual(6);
    expect(book.phrases('wrong').length).toBeGreaterThanOrEqual(4);
    expect(book.phrases('win')).toHaveLength(1);
  });

  it('permet de personnaliser puis restaurer un texte', () => {
    const store = new MemoryStore();
    const book = new PhraseBook(store);
    book.setText('correct_1', 'ما شاء الله');
    expect(new PhraseBook(store).textOf('correct_1')).toBe('ما شاء الله');
    book.reset('correct_1');
    expect(book.textOf('correct_1')).toBe('أحسنت!');
  });

  it('tire une phrase de la bonne catégorie', () => {
    const book = new PhraseBook(new MemoryStore());
    expect(book.random('wrong', new SeededRandom(1)).key).toMatch(/^wrong_/);
  });
});

describe('LessonProgress', () => {
  it('mémorise les mots découverts', () => {
    const store = new MemoryStore();
    const lessons = new LessonProgress(store);
    lessons.visit('شمس');
    lessons.visit('شمس');
    expect(lessons.has('شمس')).toBe(true);
    expect(new LessonProgress(store).has('شمس')).toBe(true);
    expect(lessons.countVisited(['شمس', 'قمر'])).toBe(1);
  });
});

describe('InMemoryMediaStore', () => {
  it('stocke, lit, supprime et vide par préfixe', async () => {
    const media = new InMemoryMediaStore();
    await media.put('word:شمس', new Blob(['a']));
    await media.put('word:قمر', new Blob(['b']));
    await media.put('image:شمس', new Blob(['c']));
    expect(await media.get('word:شمس')).not.toBeNull();
    await media.delete('word:شمس');
    expect(await media.get('word:شمس')).toBeNull();
    await media.clearPrefix('word:');
    expect(await media.get('word:قمر')).toBeNull();
    expect(await media.get('image:شمس')).not.toBeNull();
  });
});

describe('BackupService', () => {
  const setup = () => {
    const store = new MemoryStore();
    const media = new InMemoryMediaStore();
    const words = new WordRepository(store);
    const phrases = new PhraseBook(store);
    const players = new PlayerRegistry(store);
    const lessons = new LessonProgress(store);
    return { store, media, words, phrases, players, lessons, backup: new BackupService({ words, phrases, players, lessons, media }) };
  };

  it('exporte puis réimporte tout (mots, médias, joueurs, leçons, phrases)', async () => {
    const a = setup();
    a.words.save(WordList.parse('شمس، قمر'));
    await a.media.put('word:شمس', new Blob(['audio-شمس'], { type: 'audio/wav' }));
    await a.media.put('image:قمر', new Blob(['png'], { type: 'image/png' }));
    await a.media.put('correct_1', new Blob(['bravo'], { type: 'audio/wav' }));
    a.phrases.setText('wrong_1', 'مرة أخرى');
    a.players.setCurrent('ليلى');
    a.players.current.addPoints(150);
    a.players.save();
    a.lessons.visit('شمس');

    const exported = JSON.parse(JSON.stringify(await a.backup.collect()));
    expect(exported.version).toBe(2);

    const b = setup();
    await b.backup.apply(exported);
    expect(b.words.load().texts).toEqual(['شمس', 'قمر']);
    expect(await (await b.media.get('word:شمس'))!.text()).toBe('audio-شمس');
    expect((await b.media.get('image:قمر'))!.type).toBe('image/png');
    expect(await (await b.media.get('correct_1'))!.text()).toBe('bravo');
    expect(b.phrases.textOf('wrong_1')).toBe('مرة أخرى');
    expect(b.players.names).toContain('ليلى');
    expect(b.lessons.has('شمس')).toBe(true);
  });

  it('refuse un fichier invalide', async () => {
    await expect(setup().backup.apply({ pas: 'une sauvegarde' })).rejects.toThrow();
    await expect(setup().backup.apply(null)).rejects.toThrow();
  });
});
