import type { PlayerRegistry } from '../domain/progress';
import { WordList } from '../domain/word';
import type { MediaStore } from '../infrastructure/mediaStore';
import type { LessonProgress } from './lessonProgress';
import type { PhraseBook } from './phraseBook';
import type { WordRepository } from './wordRepository';

/** Format identique à la sauvegarde « version 2 » de l'ancienne application. */
export interface BackupData {
  version: 2;
  exportedAt: string;
  words: string[];
  wordAudios: Record<string, string>;
  wordImages: Record<string, string>;
  phraseAudios: Record<string, string>;
  customPhraseText: Record<string, string>;
  students: unknown;
  lessonVisited: string[];
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type};base64,${btoa(binary)}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^,]*?);base64,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Média illisible dans la sauvegarde');
  const binary = atob(match[2] ?? '');
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] ?? '' });
}

export interface BackupDeps {
  words: WordRepository;
  phrases: PhraseBook;
  players: PlayerRegistry;
  lessons: LessonProgress;
  media: MediaStore;
}

export class BackupService {
  constructor(private readonly deps: BackupDeps) {}

  async collect(): Promise<BackupData> {
    const { words, phrases, players, lessons, media } = this.deps;
    const texts = words.load().texts;
    const encode = async (keys: string[]): Promise<Record<string, string>> => {
      const out: Record<string, string> = {};
      for (const key of keys) {
        const blob = await media.get(key);
        if (blob) out[key] = await blobToDataUrl(blob);
      }
      return out;
    };
    const strip = (prefix: string, map: Record<string, string>) =>
      Object.fromEntries(Object.entries(map).map(([k, v]) => [k.slice(prefix.length), v]));
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      words: texts,
      wordAudios: strip('word:', await encode(texts.map(t => `word:${t}`))),
      wordImages: strip('image:', await encode(texts.map(t => `image:${t}`))),
      phraseAudios: await encode(phrases.allKeys),
      customPhraseText: { ...phrases.customTexts },
      students: players.toJSON(),
      lessonVisited: lessons.all,
    };
  }

  async apply(raw: unknown): Promise<void> {
    const data = raw as Partial<BackupData> | null;
    if (!data || typeof data !== 'object' || !Array.isArray(data.words)) throw new Error('بيانات غير صالحة');
    const { words, phrases, players, lessons, media } = this.deps;

    words.save(WordList.parse(data.words.join('،')));
    for (const [word, url] of Object.entries(data.wordAudios ?? {})) await media.put(`word:${word}`, dataUrlToBlob(url));
    for (const [word, url] of Object.entries(data.wordImages ?? {})) await media.put(`image:${word}`, dataUrlToBlob(url));
    for (const [key, url] of Object.entries(data.phraseAudios ?? {})) await media.put(key, dataUrlToBlob(url));
    if (data.customPhraseText) phrases.mergeCustom(data.customPhraseText);
    if (data.students) players.merge(data.students);
    if (Array.isArray(data.lessonVisited)) lessons.addAll(data.lessonVisited);
  }
}
