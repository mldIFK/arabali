# ألعاب المفردات العربية — Arabali

Jeux de vocabulaire arabe (mots cachés, lettres, association, écoute, mots croisés) avec des mots du Coran par défaut.
TypeScript + HTML5 + CSS moderne, sans framework. Développé en TDD.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm test` | tests (Vitest) |
| `npm run typecheck` | vérification TypeScript |
| `npm run build` | build de production dans `dist/` |

## Architecture

```
src/
  domain/          règles pures, sans DOM ni stockage (100 % testées)
    word, themes   Word, WordList, thèmes (dont les thèmes coraniques)
    scoring        bonus de vitesse, médailles, niveaux
    progress       PlayerProgress, PlayerRegistry (classements)
    wordSearch, crossword, puzzle, scramble, match, listening   un jeu = une classe
    random         RandomSource injectable (SeededRandom pour les tests)
  app/             cas d'usage : LessonCatalog (leçon active), WordRepository, PhraseBook, LessonProgress, BackupService
  infrastructure/  KeyValueStore (localStorage), MediaStore (IndexedDB), avec doublures mémoire
  ui/              DOM, services audio/voix, vues de jeux, écrans
  main.ts          racine de composition
```

Principes : injection de dépendances par constructeur, aléa et horloge injectés, interfaces
pour le stockage (remplacées par des doublures en mémoire dans les tests).

## Navigation

Cinq sections (`#/home`, `#/lesson`, `#/games`, `#/words`, `#/progress`) dans une barre fixe
(en haut sur ordinateur, en bas sur téléphone). La **leçon active** est globale : la pastille
« 📖 … ▾ » de l'en-tête ouvre le choix de leçon depuis n'importe quelle page, et la leçon, les jeux
et « كلماتي » utilisent tous la même. Choisir une leçon par défaut ne modifie pas « كلماتي ».

## Compatibilité

Les clés `localStorage` / IndexedDB et le format de sauvegarde JSON (version 2) sont ceux de
l'ancienne application : les données existantes restent lisibles.

## Différences volontaires avec l'ancienne version

- Mots du Coran par défaut (5 thèmes coraniques, avec la sourate quand le mot est un nom de sourate).
- Les médailles se calculent sur le score final (la prime de vitesse n'est plus comptée deux fois).
- Mots croisés : plus de points gagnés en vérifiant plusieurs fois ; les indices réduisent le score final.
- Mots cachés : un mot sélectionné à rebours est reconnu comme début de mot possible.
- `alert` / `confirm` / `prompt` remplacés par des `<dialog>` natifs.

## Fonctionnalités de l'ancienne version pas encore reprises

Enregistrement au micro, impression / export PNG des fiches, clavier arabe à l'écran,
export « HTML autonome ». Les illustrations SVG ne sont portées que pour une vingtaine de mots
(les autres reçoivent une pastille colorée).
