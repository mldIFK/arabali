import type { BackupService } from '../app/backup';
import type { LessonCatalog } from '../app/lessonCatalog';
import type { LessonProgress } from '../app/lessonProgress';
import type { PhraseBook } from '../app/phraseBook';
import type { GameKey } from '../domain/gameKey';
import type { PlayerRegistry } from '../domain/progress';
import type { GameResult } from '../domain/scoring';
import type { WordList } from '../domain/word';
import type { MediaStore } from '../infrastructure/mediaStore';
import type { GameServices } from './games/gameView';
import type { ScreenId } from './routes';
import type { Dialogs } from './services';

export type { ScreenId } from './routes';

export interface FinishedGame {
  key: GameKey;
  title: string;
  result: GameResult;
  elapsed: number;
  bestScore: number;
  bestTime: number;
}

/** Tout ce dont les écrans ont besoin, sans connaître l'application elle-même. */
export interface AppContext {
  readonly lessonCatalog: LessonCatalog;
  readonly players: PlayerRegistry;
  readonly phrases: PhraseBook;
  /** Mots déjà découverts dans le mode leçon. */
  readonly lessons: LessonProgress;
  readonly media: MediaStore;
  readonly backup: BackupService;
  readonly svc: GameServices;
  readonly dialogs: Dialogs;
  /** Mots de la leçon active : utilisés par la leçon, les jeux et « كلماتي ». */
  readonly wordList: WordList;
  saveCustomWords(list: WordList): void;
  openLessonPicker(): Promise<void>;
  show(screen: ScreenId): void;
  startGame(key: GameKey): void;
  refreshHeader(): void;
}
