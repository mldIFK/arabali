import type { KeyValueStore } from '../infrastructure/keyValueStore';
import { GAME_KEYS, type GameKey, type Medal } from './gameKey';
import { levelFor } from './scoring';

const MEDAL_ORDER: readonly Medal[] = ['gold', 'silver', 'bronze'];

type PerGame<T> = Record<GameKey, T>;

function perGame<T>(make: () => T): PerGame<T> {
  return Object.fromEntries(GAME_KEYS.map(k => [k, make()])) as PerGame<T>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Forme sérialisée, identique à celle de l'ancienne application. */
export interface ProgressJSON {
  totalScore: number;
  gamesCompleted: number;
  medals: number;
  bestScores: PerGame<number>;
  bestTimes: PerGame<number | null>;
  gameMedals: PerGame<Medal[]>;
}

export class PlayerProgress {
  totalScore = 0;
  gamesCompleted = 0;
  readonly bestScores: PerGame<number> = perGame(() => 0);
  readonly bestTimes: PerGame<number | null> = perGame(() => null);
  private readonly gameMedals: PerGame<Medal[]> = perGame(() => []);

  get level(): string {
    return levelFor(this.totalScore);
  }

  get medalCount(): number {
    return GAME_KEYS.reduce((sum, k) => sum + this.gameMedals[k].length, 0);
  }

  addPoints(points: number): void {
    this.totalScore += points;
  }

  recordGame(key: GameKey, score: number, time: number): void {
    this.gamesCompleted++;
    if (score > this.bestScores[key]) this.bestScores[key] = score;
    const best = this.bestTimes[key];
    if (best === null || time < best) this.bestTimes[key] = time;
  }

  awardMedal(key: GameKey, medal: Medal): void {
    if (!this.gameMedals[key].includes(medal)) this.gameMedals[key].push(medal);
  }

  medalsOf(key: GameKey): readonly Medal[] {
    return this.gameMedals[key];
  }

  bestMedal(key: GameKey): Medal | null {
    return MEDAL_ORDER.find(m => this.gameMedals[key].includes(m)) ?? null;
  }

  toJSON(): ProgressJSON {
    return {
      totalScore: this.totalScore,
      gamesCompleted: this.gamesCompleted,
      medals: this.medalCount,
      bestScores: { ...this.bestScores },
      bestTimes: { ...this.bestTimes },
      gameMedals: Object.fromEntries(GAME_KEYS.map(k => [k, [...this.gameMedals[k]]])) as PerGame<Medal[]>,
    };
  }

  /** Tolérant : accepte l'ancien format incomplet ou des données corrompues. */
  static fromJSON(raw: unknown): PlayerProgress {
    const p = new PlayerProgress();
    if (!isRecord(raw)) return p;
    p.totalScore = asNumber(raw.totalScore);
    p.gamesCompleted = asNumber(raw.gamesCompleted);
    const scores = isRecord(raw.bestScores) ? raw.bestScores : {};
    const times = isRecord(raw.bestTimes) ? raw.bestTimes : {};
    const medals = isRecord(raw.gameMedals) ? raw.gameMedals : {};
    for (const k of GAME_KEYS) {
      p.bestScores[k] = asNumber(scores[k]);
      const t = times[k];
      p.bestTimes[k] = typeof t === 'number' && Number.isFinite(t) ? t : null;
      const m = medals[k];
      if (Array.isArray(m)) {
        for (const medal of m) if (MEDAL_ORDER.includes(medal as Medal)) p.awardMedal(k, medal as Medal);
      }
    }
    return p;
  }
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  games: number;
  medals: number;
}

export interface TimeRankingEntry {
  name: string;
  totalTime: number;
  gamesCount: number;
  medals: number;
}

export const GUEST_NAME = 'ضيف';
const MAX_NAME_LENGTH = 30;
// Mêmes clés que l'ancienne application : les données existantes restent lisibles.
const PLAYERS_KEY = 'arabicGamesPremiumStudents_v1';
const CURRENT_KEY = 'arabicGamesPremiumCurrentUser_v1';

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) || GUEST_NAME;
}

export class PlayerRegistry {
  private readonly players = new Map<string, PlayerProgress>();
  private currentPlayer: string;

  constructor(private readonly store: KeyValueStore) {
    this.load();
    this.currentPlayer = normalizePlayerName(store.get(CURRENT_KEY) ?? GUEST_NAME);
    this.ensure(this.currentPlayer);
  }

  get currentName(): string {
    return this.currentPlayer;
  }

  get current(): PlayerProgress {
    return this.ensure(this.currentPlayer);
  }

  get names(): string[] {
    return [...this.players.keys()];
  }

  setCurrent(name: string): void {
    this.currentPlayer = normalizePlayerName(name);
    this.ensure(this.currentPlayer);
    this.store.set(CURRENT_KEY, this.currentPlayer);
    this.save();
  }

  resetCurrent(): void {
    this.players.set(this.currentPlayer, new PlayerProgress());
    this.save();
  }

  save(): void {
    const data = Object.fromEntries([...this.players].map(([n, p]) => [n, p.toJSON()]));
    this.store.set(PLAYERS_KEY, JSON.stringify(data));
  }

  /** Fusionne des joueurs importés (sauvegarde) sans effacer les existants. */
  merge(raw: unknown): void {
    if (!isRecord(raw)) return;
    for (const [name, data] of Object.entries(raw)) this.players.set(normalizePlayerName(name), PlayerProgress.fromJSON(data));
    this.save();
  }

  leaderboard(limit = 25): LeaderboardEntry[] {
    return [...this.players]
      .map(([name, p]) => ({ name, score: p.totalScore, games: p.gamesCompleted, medals: p.medalCount }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  timeRanking(): TimeRankingEntry[] {
    return [...this.players]
      .map(([name, p]) => {
        const times = Object.values(p.bestTimes).filter((t): t is number => t !== null);
        return { name, totalTime: times.reduce((a, b) => a + b, 0), gamesCount: times.length, medals: p.medalCount };
      })
      .filter(e => e.gamesCount > 0)
      .sort((a, b) => a.totalTime - b.totalTime);
  }

  toJSON(): Record<string, ProgressJSON> {
    return Object.fromEntries([...this.players].map(([n, p]) => [n, p.toJSON()]));
  }

  private ensure(name: string): PlayerProgress {
    let p = this.players.get(name);
    if (!p) {
      p = new PlayerProgress();
      this.players.set(name, p);
    }
    return p;
  }

  private load(): void {
    try {
      const raw: unknown = JSON.parse(this.store.get(PLAYERS_KEY) ?? '{}');
      if (isRecord(raw)) for (const [name, data] of Object.entries(raw)) this.players.set(name, PlayerProgress.fromJSON(data));
    } catch {
      // données illisibles : on repart de zéro
    }
  }
}
