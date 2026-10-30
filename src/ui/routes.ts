/** Sections principales, dans l'ordre de la barre de navigation. */
export const SCREENS = ['home', 'lesson', 'games', 'words', 'progress'] as const;
export type ScreenId = (typeof SCREENS)[number];

export function hashFor(screen: ScreenId): string {
  return `#/${screen}`;
}

export function routeFromHash(hash: string): ScreenId {
  const name = hash.replace(/^#\/?/, '');
  return (SCREENS as readonly string[]).includes(name) ? (name as ScreenId) : 'home';
}
