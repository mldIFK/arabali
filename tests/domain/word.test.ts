import { describe, expect, it } from 'vitest';
import { Word, WordList } from '../../src/domain/word';

describe('Word', () => {
  it('nettoie les espaces', () => {
    expect(Word.of('  قوس   قزح ').text).toBe('قوس قزح');
  });

  it('expose les lettres une à une', () => {
    expect(Word.of('قطة').letters).toEqual(['ق', 'ط', 'ة']);
  });

  it('refuse un mot de moins de deux lettres', () => {
    expect(() => Word.of('ا')).toThrow();
    expect(() => Word.of('   ')).toThrow();
  });

  it('garde la source facultative (sourate)', () => {
    expect(Word.of('شمس', 'سورة الشمس').source).toBe('سورة الشمس');
    expect(Word.of('شمس').source).toBeUndefined();
  });

  it('considère deux mots égaux si leur texte est identique', () => {
    expect(Word.of('قمر').equals(Word.of(' قمر '))).toBe(true);
    expect(Word.of('قمر').equals(Word.of('شمس'))).toBe(false);
  });
});

describe('WordList.parse', () => {
  it('sépare sur les virgules arabes et latines, point-virgules et retours à la ligne', () => {
    const list = WordList.parse('قطة، كلب; أسد,فيل\nقمر؛نجم');
    expect(list.texts).toEqual(['قطة', 'كلب', 'أسد', 'فيل', 'قمر', 'نجم']);
  });

  it('ignore les éléments trop courts et les vides', () => {
    expect(WordList.parse('قطة، ، ا، كلب').texts).toEqual(['قطة', 'كلب']);
  });

  it('supprime les doublons en gardant l’ordre', () => {
    expect(WordList.parse('قطة، كلب، قطة').texts).toEqual(['قطة', 'كلب']);
  });

  it('retire le BOM éventuel', () => {
    expect(WordList.parse('﻿قطة، كلب').texts).toEqual(['قطة', 'كلب']);
  });

  it('se re-sérialise avec la virgule arabe', () => {
    expect(WordList.parse('قطة,كلب').toInputString()).toBe('قطة، كلب');
  });

  it('longestLength renvoie la longueur du mot le plus long', () => {
    expect(WordList.parse('قطة، سلحفاة').longestLength).toBe(6);
  });

  it('une liste vide est valide', () => {
    const list = WordList.parse('');
    expect(list.size).toBe(0);
    expect(list.longestLength).toBe(0);
  });
});
