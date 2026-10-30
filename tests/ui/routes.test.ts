import { describe, expect, it } from 'vitest';
import { SCREENS, hashFor, routeFromHash } from '../../src/ui/routes';

describe('routes', () => {
  it('connaît les cinq sections', () => {
    expect([...SCREENS]).toEqual(['home', 'lesson', 'games', 'words', 'progress']);
  });

  it.each([
    ['#/home', 'home'],
    ['#/lesson', 'lesson'],
    ['#/games', 'games'],
    ['#/words', 'words'],
    ['#/progress', 'progress'],
  ])('%s → %s', (hash, screen) => {
    expect(routeFromHash(hash)).toBe(screen);
  });

  it('retombe sur l’accueil pour une adresse vide ou inconnue', () => {
    expect(routeFromHash('')).toBe('home');
    expect(routeFromHash('#')).toBe('home');
    expect(routeFromHash('#/nimporte')).toBe('home');
    expect(routeFromHash('#/games/extra')).toBe('home');
  });

  it('hashFor est l’inverse de routeFromHash', () => {
    for (const s of SCREENS) expect(routeFromHash(hashFor(s))).toBe(s);
  });
});
