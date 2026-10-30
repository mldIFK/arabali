import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../../src/infrastructure/keyValueStore';
import { PlayerProgress, PlayerRegistry } from '../../src/domain/progress';

describe('PlayerProgress', () => {
  it('démarre à zéro', () => {
    const p = new PlayerProgress();
    expect(p.totalScore).toBe(0);
    expect(p.gamesCompleted).toBe(0);
    expect(p.medalCount).toBe(0);
    expect(p.bestTimes.ws).toBeNull();
    expect(p.level).toBe('مبتدئ');
  });

  it('cumule les points', () => {
    const p = new PlayerProgress();
    p.addPoints(60);
    p.addPoints(50);
    expect(p.totalScore).toBe(110);
    expect(p.level).toBe('متعلّم');
  });

  it('recordGame compte les parties et garde les meilleurs scores/temps', () => {
    const p = new PlayerProgress();
    p.recordGame('ws', 80, 50);
    p.recordGame('ws', 60, 70);
    p.recordGame('ws', 90, 40);
    expect(p.gamesCompleted).toBe(3);
    expect(p.bestScores.ws).toBe(90);
    expect(p.bestTimes.ws).toBe(40);
  });

  it('awardMedal ne compte qu’une fois chaque médaille par jeu', () => {
    const p = new PlayerProgress();
    p.awardMedal('pz', 'gold');
    p.awardMedal('pz', 'gold');
    p.awardMedal('pz', 'silver');
    p.awardMedal('sc', 'gold');
    expect(p.medalCount).toBe(3);
  });

  it('bestMedal renvoie la meilleure médaille du jeu', () => {
    const p = new PlayerProgress();
    expect(p.bestMedal('mt')).toBeNull();
    p.awardMedal('mt', 'bronze');
    expect(p.bestMedal('mt')).toBe('bronze');
    p.awardMedal('mt', 'gold');
    p.awardMedal('mt', 'silver');
    expect(p.bestMedal('mt')).toBe('gold');
  });

  it('se sérialise et se relit à l’identique', () => {
    const p = new PlayerProgress();
    p.addPoints(120);
    p.recordGame('cw', 70, 33);
    p.awardMedal('cw', 'silver');
    const copy = PlayerProgress.fromJSON(JSON.parse(JSON.stringify(p.toJSON())));
    expect(copy.toJSON()).toEqual(p.toJSON());
  });

  it('relit l’ancien format incomplet (sans bestTimes ni gameMedals)', () => {
    const p = PlayerProgress.fromJSON({ totalScore: 250, gamesCompleted: 4 });
    expect(p.totalScore).toBe(250);
    expect(p.bestTimes.ls).toBeNull();
    expect(p.medalCount).toBe(0);
  });

  it('relit des données corrompues sans planter', () => {
    expect(PlayerProgress.fromJSON('n’importe quoi').totalScore).toBe(0);
  });
});

describe('PlayerRegistry', () => {
  const make = (store = new MemoryStore()) => ({ store, registry: new PlayerRegistry(store) });

  it('commence avec le joueur « ضيف »', () => {
    expect(make().registry.currentName).toBe('ضيف');
  });

  it('setCurrent crée le joueur et le mémorise', () => {
    const { registry } = make();
    registry.setCurrent('ليلى');
    expect(registry.currentName).toBe('ليلى');
    expect(registry.names).toContain('ليلى');
  });

  it('normalise le nom (espaces, 30 caractères max, vide → ضيف)', () => {
    const { registry } = make();
    registry.setCurrent('  أحمد    علي ');
    expect(registry.currentName).toBe('أحمد علي');
    registry.setCurrent('ا'.repeat(50));
    expect(registry.currentName).toHaveLength(30);
    registry.setCurrent('   ');
    expect(registry.currentName).toBe('ضيف');
  });

  it('persiste entre deux instances', () => {
    const { store, registry } = make();
    registry.setCurrent('يوسف');
    registry.current.addPoints(75);
    registry.save();
    const again = new PlayerRegistry(store);
    expect(again.currentName).toBe('يوسف');
    expect(again.current.totalScore).toBe(75);
  });

  it('relit les clés de l’ancienne application', () => {
    const store = new MemoryStore();
    store.set('arabicGamesPremiumStudents_v1', JSON.stringify({ سارة: { totalScore: 400 } }));
    store.set('arabicGamesPremiumCurrentUser_v1', 'سارة');
    expect(new PlayerRegistry(store).current.totalScore).toBe(400);
  });

  it('classe les joueurs par score décroissant (25 max)', () => {
    const { registry } = make();
    for (let i = 0; i < 30; i++) {
      registry.setCurrent(`لاعب${i}`);
      registry.current.addPoints(i);
    }
    const board = registry.leaderboard();
    expect(board).toHaveLength(25);
    expect(board[0]?.name).toBe('لاعب29');
    expect(board[0]?.score).toBe(29);
  });

  it('classe la vitesse par somme des meilleurs temps croissante, sans les joueurs sans temps', () => {
    const { registry } = make();
    registry.setCurrent('أ');
    registry.current.recordGame('ws', 10, 50);
    registry.current.recordGame('pz', 10, 50);
    registry.setCurrent('ب');
    registry.current.recordGame('ws', 10, 30);
    registry.setCurrent('ج');
    const ranking = registry.timeRanking();
    expect(ranking.map(r => r.name)).toEqual(['ب', 'أ']);
    expect(ranking[0]?.totalTime).toBe(30);
    expect(ranking[1]?.gamesCount).toBe(2);
  });

  it('resetCurrent remet le joueur courant à zéro', () => {
    const { registry } = make();
    registry.current.addPoints(500);
    registry.resetCurrent();
    expect(registry.current.totalScore).toBe(0);
  });
});
