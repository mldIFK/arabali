import './styles/main.css';
import { BackupService } from './app/backup';
import { LessonCatalog } from './app/lessonCatalog';
import { LessonProgress } from './app/lessonProgress';
import { PhraseBook } from './app/phraseBook';
import { WordRepository } from './app/wordRepository';
import { PlayerRegistry } from './domain/progress';
import { MathRandomSource } from './domain/random';
import { BrowserStore } from './infrastructure/keyValueStore';
import { IndexedDbMediaStore } from './infrastructure/mediaStore';
import { App } from './ui/app';
import { WordImages } from './ui/images';
import { Dialogs, Praise, Sfx, Speech, Toast } from './ui/services';

// Racine de composition : c'est ici, et seulement ici, que l'on choisit les implémentations concrètes.
const store = new BrowserStore();
const media = new IndexedDbMediaStore();
const rng = new MathRandomSource();

const wordRepository = new WordRepository(store);
const phrases = new PhraseBook(store);
const players = new PlayerRegistry(store);
const lessons = new LessonProgress(store);
const lessonCatalog = new LessonCatalog(store, wordRepository);
const backup = new BackupService({ words: wordRepository, phrases, players, lessons, media });

const sfx = new Sfx();
const speech = new Speech(media, sfx);
const svc = {
  sfx,
  speech,
  praise: new Praise(phrases, speech, sfx, rng),
  images: new WordImages(media),
  toast: new Toast(),
  rng,
};

const root = document.getElementById('app');
if (!root) throw new Error('#app introuvable');
new App(root, { lessonCatalog, players, phrases, lessons, media, backup, svc, dialogs: new Dialogs() });
