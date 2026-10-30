import { describe, expect, it } from 'vitest';
import { SeededRandom, shuffle } from '../../src/domain/random';

describe('SeededRandom', () => {
  it('produit la même séquence pour la même graine', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produit des séquences différentes pour des graines différentes', () => {
    expect(new SeededRandom(1).next()).not.toBe(new SeededRandom(2).next());
  });

  it('reste dans [0, 1[', () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) renvoie un entier dans [0, n[', () => {
    const rng = new SeededRandom(3);
    for (let i = 0; i < 500; i++) {
      const v = rng.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });

  it('pick() choisit un élément du tableau', () => {
    expect(['a', 'b', 'c']).toContain(new SeededRandom(9).pick(['a', 'b', 'c']));
  });

  it('pick() échoue sur un tableau vide', () => {
    expect(() => new SeededRandom(1).pick([])).toThrow();
  });
});

describe('shuffle', () => {
  const source = [1, 2, 3, 4, 5, 6, 7, 8];

  it('ne modifie pas le tableau d’origine', () => {
    const copy = [...source];
    shuffle(source, new SeededRandom(1));
    expect(source).toEqual(copy);
  });

  it('conserve les mêmes éléments', () => {
    expect([...shuffle(source, new SeededRandom(5))].sort()).toEqual(source);
  });

  it('est déterministe avec une graine donnée', () => {
    expect(shuffle(source, new SeededRandom(11))).toEqual(shuffle(source, new SeededRandom(11)));
  });
});
