import { describe, expect, it } from 'vitest';
import { DEFAULT_THEMES, DEFAULT_WORDS, QURAN_THEMES } from '../../src/domain/themes';

const DIACRITICS = /[ً-ٰٟۖ-ۭ]/;

describe('thèmes par défaut', () => {
  it('commence par des thèmes coraniques', () => {
    expect(QURAN_THEMES.length).toBeGreaterThanOrEqual(4);
    expect(DEFAULT_THEMES.slice(0, QURAN_THEMES.length)).toEqual(QURAN_THEMES);
  });

  it('les mots par défaut proviennent du Coran et sont assez nombreux pour tous les jeux', () => {
    expect(DEFAULT_WORDS.length).toBeGreaterThanOrEqual(10);
    const quranWords = new Set(QURAN_THEMES.flatMap(t => t.words.map(w => w.text)));
    for (const w of DEFAULT_WORDS) expect(quranWords.has(w.text)).toBe(true);
  });

  it('chaque thème a un identifiant unique, un nom et des mots uniques', () => {
    const ids = DEFAULT_THEMES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of DEFAULT_THEMES) {
      expect(t.name.length).toBeGreaterThan(0);
      const texts = t.words.map(w => w.text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it('les mots n’ont pas de signes diacritiques (ils casseraient les jeux de lettres)', () => {
    for (const t of DEFAULT_THEMES) {
      for (const w of t.words) {
        expect(DIACRITICS.test(w.text), w.text).toBe(false);
        expect(w.letters.length, w.text).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('conserve les huit thèmes de l’application d’origine', () => {
    expect(DEFAULT_THEMES.length).toBeGreaterThanOrEqual(QURAN_THEMES.length + 8);
  });
});
