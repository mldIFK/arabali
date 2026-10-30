import type { BackupService } from '../app/backup';
import { CUSTOM_LESSON_ID, type Lesson, type LessonCatalog } from '../app/lessonCatalog';
import type { LessonProgress } from '../app/lessonProgress';
import type { PhraseBook } from '../app/phraseBook';
import { GameClock } from '../domain/clock';
import { completeGame } from '../domain/completion';
import { GAME_NAMES, MEDAL_LABELS, type GameKey } from '../domain/gameKey';
import type { PlayerRegistry } from '../domain/progress';
import { formatTime } from '../domain/scoring';
import type { WordList } from '../domain/word';
import type { MediaStore } from '../infrastructure/mediaStore';
import type { AppContext, FinishedGame } from './context';
import { clear, download, h, pickFile } from './dom';
import { CrosswordView } from './games/crosswordView';
import type { GameHost, GameServices, GameView } from './games/gameView';
import { ListeningView } from './games/listeningView';
import { MatchView } from './games/matchView';
import { PuzzleView } from './games/puzzleView';
import { ScrambleView } from './games/scrambleView';
import { WordSearchView } from './games/wordSearchView';
import { SCREENS, hashFor, routeFromHash, type ScreenId } from './routes';
import { gamesScreen, homeScreen, lessonScreen, progressScreen } from './screens/browse';
import { wordsScreen } from './screens/wordsScreen';
import type { Dialogs } from './services';

export interface AppParts {
  lessonCatalog: LessonCatalog;
  players: PlayerRegistry;
  phrases: PhraseBook;
  lessons: LessonProgress;
  media: MediaStore;
  backup: BackupService;
  svc: GameServices;
  dialogs: Dialogs;
}

type ViewFactory = new (host: GameHost, svc: GameServices, words: readonly string[]) => GameView;
const GAME_VIEWS: Record<GameKey, ViewFactory> = {
  ws: WordSearchView,
  pz: PuzzleView,
  sc: ScrambleView,
  mt: MatchView,
  cw: CrosswordView,
  ls: ListeningView,
};

const BUILDERS: Record<ScreenId, (ctx: AppContext) => HTMLElement> = {
  home: homeScreen,
  lesson: lessonScreen,
  games: gamesScreen,
  words: wordsScreen,
  progress: progressScreen,
};

const NAV_LABELS: Record<ScreenId, string> = {
  home: '🏠 الرئيسية',
  lesson: '📚 الدرس',
  games: '🎮 الألعاب',
  words: '✏️ كلماتي',
  progress: '🏅 تقدّمي',
};

export class App implements AppContext {
  readonly lessonCatalog: LessonCatalog;
  readonly players: PlayerRegistry;
  readonly phrases: PhraseBook;
  readonly lessons: LessonProgress;
  readonly media: MediaStore;
  readonly backup: BackupService;
  readonly svc: GameServices;
  readonly dialogs: Dialogs;

  private readonly main = h('main', { id: 'main', tabindex: -1 });
  private readonly navLinks = new Map<ScreenId, HTMLAnchorElement>();
  private readonly header = {
    lesson: h('span', { class: 'chip-text' }),
    player: h('span', { class: 'chip-text' }),
    sound: h('button', { type: 'button', class: 'tool', 'aria-label': 'تشغيل/إيقاف الصوت' }, '🔊'),
  };
  private readonly clock = new GameClock();
  private timerId = 0;
  private view: GameView | null = null;

  constructor(root: HTMLElement, parts: AppParts) {
    this.lessonCatalog = parts.lessonCatalog;
    this.players = parts.players;
    this.phrases = parts.phrases;
    this.lessons = parts.lessons;
    this.media = parts.media;
    this.backup = parts.backup;
    this.svc = parts.svc;
    this.dialogs = parts.dialogs;

    root.append(this.buildHeader(), this.buildNav(), this.main);
    document.body.addEventListener('pointerdown', () => this.svc.sfx.unlock(), { once: true });
    window.addEventListener('hashchange', () => this.renderRoute());
    this.refreshHeader();
    this.renderRoute();
  }

  get wordList(): WordList {
    return this.lessonCatalog.activeWords;
  }

  saveCustomWords(list: WordList): void {
    this.lessonCatalog.saveCustom(list);
    this.refreshHeader();
  }

  // ---- Navigation -----------------------------------------------------

  show(screen: ScreenId): void {
    if (location.hash === hashFor(screen)) this.renderRoute();
    else location.hash = hashFor(screen);
  }

  private renderRoute(): void {
    const screen = routeFromHash(location.hash);
    this.leaveGame();
    this.markNav(screen);
    this.render(BUILDERS[screen](this));
  }

  private markNav(screen: ScreenId): void {
    for (const [id, link] of this.navLinks) {
      if (id === screen) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }

  private render(content: HTMLElement): void {
    const swap = () => {
      clear(this.main);
      this.main.append(content);
      window.scrollTo({ top: 0 });
    };
    // Transition fluide quand le navigateur sait la faire.
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if ('startViewTransition' in document && !reduced) {
      (document as Document & { startViewTransition(cb: () => void): unknown }).startViewTransition(swap);
    } else swap();
  }

  private buildNav(): HTMLElement {
    const nav = h('nav', { class: 'main-nav', 'aria-label': 'التنقل الرئيسي' });
    for (const id of SCREENS) {
      const link = h('a', { href: hashFor(id), onclick: (e: Event) => { e.preventDefault(); this.show(id); } }, NAV_LABELS[id]);
      this.navLinks.set(id, link);
      nav.append(link);
    }
    return nav;
  }

  // ---- En-tête --------------------------------------------------------

  private buildHeader(): HTMLElement {
    this.header.sound.addEventListener('click', () => {
      this.svc.sfx.enabled = !this.svc.sfx.enabled;
      this.header.sound.textContent = this.svc.sfx.enabled ? '🔊' : '🔇';
      if (this.svc.sfx.enabled) this.svc.sfx.tick();
      else this.svc.speech.stop();
    });
    return h('header', { class: 'site-header' },
      h('h1', null, '🎮 ألعاب المفردات العربية'),
      h('div', { class: 'header-tools' },
        h('button', { type: 'button', class: 'chip lesson-chip', title: 'تغيير الدرس', onclick: () => void this.openLessonPicker() }, '📖', this.header.lesson, '▾'),
        h('button', { type: 'button', class: 'chip', title: 'تغيير اللاعب', onclick: () => void this.switchPlayer() }, '👤', this.header.player),
        this.header.sound,
        h('button', { type: 'button', class: 'tool', 'aria-label': 'الإعدادات', title: 'الإعدادات', onclick: () => void this.openSettings() }, '⚙️'),
      ),
    );
  }

  refreshHeader(): void {
    const lesson = this.lessonCatalog.active;
    const p = this.players.current;
    this.header.lesson.textContent = `${lesson.name} · ${lesson.words.size}`;
    this.header.player.textContent = `${this.players.currentName} · ${p.totalScore}⭐ · ${p.level}`;
  }

  async openLessonPicker(): Promise<void> {
    const catalog = this.lessonCatalog;
    const activeId = catalog.active.id;
    const card = (l: Lesson) =>
      h('button', { value: l.id, class: `lesson-theme ${l.id === activeId ? 'active' : ''}` },
        h('span', { class: 'name' }, l.name),
        h('span', { class: 'desc' }, l.description),
        h('span', { class: 'count' }, `${l.words.size} كلمة`),
      );
    const group = (label: string, lessons: Lesson[]) =>
      lessons.length > 0 && h('section', null, h('h4', { class: 'picker-group' }, label), h('div', { class: 'lesson-themes' }, ...lessons.map(card)));
    const all = catalog.lessons;
    const body = h('div', { class: 'picker' },
      group('قائمتي', all.filter(l => l.kind === 'custom')),
      group('من القرآن الكريم', all.filter(l => l.kind === 'starter' || l.kind === 'quran')),
      group('دروس عامة', all.filter(l => l.kind === 'classic')),
    );
    const chosen = await this.dialogs.open('📚 اختر الدرس', body, [], true);
    if (chosen === 'cancel' || chosen === activeId || !catalog.activate(chosen)) return;
    this.refreshHeader();
    this.svc.toast.show(`✅ الدرس: ${catalog.active.name}`, 'success');
    this.renderRoute();
  }

  private async openSettings(): Promise<void> {
    const choice = await this.dialogs.open('⚙️ الإعدادات', h('p', { class: 'muted' }, `اللاعب الحالي: ${this.players.currentName}`), [
      { label: '👤 تغيير اللاعب', value: 'player' },
      { label: '💾 نسخة كاملة', kind: 'success', value: 'backup' },
      { label: '🔄 تصفير النقاط', kind: 'danger', value: 'reset' },
    ]);
    if (choice === 'player') await this.switchPlayer();
    else if (choice === 'backup') await this.openBackup();
    else if (choice === 'reset') await this.resetScores();
  }

  private async switchPlayer(): Promise<void> {
    const current = this.players.currentName;
    const name = await this.dialogs.prompt('👤 أدخل اسمك', current === 'ضيف' ? '' : current);
    if (name === null) return;
    if (!name.trim()) return void this.svc.toast.show('الاسم فارغ', 'error');
    this.players.setCurrent(name);
    this.refreshHeader();
    this.svc.toast.show(`مرحبًا ${this.players.currentName} 👋 النقاط: ${this.players.current.totalScore}`, 'success');
    this.renderRoute();
  }

  private async resetScores(): Promise<void> {
    if (!(await this.dialogs.confirm(`تصفير نقاط «${this.players.currentName}» ؟`, 'تصفير'))) return;
    this.players.resetCurrent();
    this.refreshHeader();
    this.svc.toast.show('تم تصفير النقاط', 'info');
    this.renderRoute();
  }

  private async openBackup(): Promise<void> {
    const toast = this.svc.toast;
    const body = h('div', { class: 'column' },
      h('p', { class: 'muted' }, 'صدّر كلماتك وأصواتك وصورك وتقدّم اللاعبين في ملف واحد، أو استورد نسخة سابقة.'),
      h('button', { type: 'button', class: 'btn success', onclick: async () => {
        try {
          const data = await this.backup.collect();
          download(`نسخة-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
          toast.show('✅ تم التصدير', 'success');
        } catch (e) {
          toast.show(`خطأ: ${(e as Error).message}`, 'error');
        }
      } }, '📤 تصدير نسخة كاملة (JSON)'),
      h('button', { type: 'button', class: 'btn', onclick: async () => {
        const file = await pickFile('application/json,.json');
        if (!file) return;
        try {
          await this.backup.apply(JSON.parse(await file.text()));
          this.lessonCatalog.activate(CUSTOM_LESSON_ID);
          this.svc.images.invalidateAll();
          this.refreshHeader();
          toast.show('✅ تم الاستيراد', 'success');
          this.show('home');
        } catch (e) {
          toast.show(`خطأ: ${(e as Error).message}`, 'error');
        }
      } }, '📥 استيراد نسخة (JSON)'),
    );
    await this.dialogs.info('💾 نسخة كاملة', body);
  }

  // ---- Parties --------------------------------------------------------

  startGame(key: GameKey): void {
    if (this.wordList.size === 0) return void this.svc.toast.show('أدخل كلمات أولًا', 'error');
    this.leaveGame();
    // La partie vit sous « الألعاب » : même adresse, sans relancer le rendu.
    history.replaceState(null, '', hashFor('games'));
    this.markNav('games');

    const timer = h('span', { class: 'timer', role: 'timer' }, '00:00');
    const score = h('span', { class: 'game-score' }, 'النقاط: 0');
    const title = h('h2', { class: 'game-title' }, GAME_NAMES[key]);
    const area = h('div', { class: 'game-area' });
    const host: GameHost = {
      area,
      setScore: n => (score.textContent = `النقاط: ${n}`),
      setTitle: t => (title.textContent = t),
      startTimer: () => this.startClock(timer),
      finish: (t, s, max) => this.finishGame(key, t, s, max),
      exit: () => this.show('games'),
    };
    this.render(
      h('section', { class: 'screen' },
        h('div', { class: 'game-header' },
          h('button', { type: 'button', class: 'btn gray', onclick: async () => {
            if (await this.dialogs.confirm('الخروج ؟ ستفقد نقاط هذه الجولة.', 'خروج')) this.show('games');
          } }, '← رجوع'),
          title,
          h('div', { class: 'header-extra' }, timer, score),
        ),
        area,
      ),
    );
    this.view = new GAME_VIEWS[key](host, this.svc, this.wordList.texts);
    void this.view.start();
  }

  private startClock(el: HTMLElement): void {
    window.clearInterval(this.timerId);
    this.clock.start();
    const tick = () => {
      const s = this.clock.elapsedSeconds;
      el.textContent = formatTime(s);
      el.classList.toggle('danger', s >= 120);
      el.classList.toggle('warning', s >= 60 && s < 120);
    };
    tick();
    this.timerId = window.setInterval(tick, 200);
  }

  private leaveGame(): void {
    this.view?.dispose();
    this.view = null;
    window.clearInterval(this.timerId);
    this.clock.reset();
    this.svc.speech.stop();
  }

  private finishGame(key: GameKey, title: string, score: number, maxScore: number): void {
    this.clock.stop();
    window.clearInterval(this.timerId);
    const progress = this.players.current;
    const previousBest = progress.bestTimes[key];
    const elapsed = this.clock.elapsedSeconds;
    const result = completeGame(progress, key, score, maxScore, elapsed);
    this.players.save();
    this.svc.praise.win();
    if (result.medal) this.svc.sfx.medal();
    this.refreshHeader();
    this.view?.dispose();
    this.view = null;
    this.showResult({
      key,
      title,
      result,
      elapsed,
      bestScore: progress.bestScores[key],
      bestTime: previousBest === null ? elapsed : Math.min(previousBest, elapsed),
    });
  }

  private showResult({ key, title, result, elapsed, bestScore, bestTime }: FinishedGame): void {
    const line = (label: string, value: string, cls = '') => h('li', null, label, ' ', h('strong', { class: cls }, value));
    const bonus = result.bonusPoints;
    this.render(
      h('section', { class: 'screen result-screen' },
        h('h2', null, title),
        h('div', { class: 'medal-display' }, result.medal ? MEDAL_LABELS[result.medal].emoji : ''),
        h('div', { class: 'stars', 'aria-label': `${result.stars} نجوم` }, '⭐'.repeat(result.stars)),
        h('ul', { class: 'result-stats' },
          line('⏱️ الوقت:', formatTime(elapsed)),
          line('🎯 نقاط الجولة:', String(result.score)),
          line('⚡ مكافأة السرعة:', `${bonus >= 0 ? '+' : ''}${bonus}`, bonus >= 0 ? 'good' : 'bad'),
          line('🏆 النتيجة النهائية:', String(result.finalScore), 'big'),
          line('📊 الأفضل:', String(bestScore)),
          line('⏱️ أفضل وقت:', formatTime(bestTime)),
        ),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn success', onclick: () => this.startGame(key) }, '🔁 العب مرة أخرى'),
          h('button', { type: 'button', class: 'btn', onclick: () => this.show('games') }, '🎮 ألعاب أخرى'),
          h('button', { type: 'button', class: 'btn gray', onclick: () => this.show('home') }, '🏠 الرئيسية'),
        ),
      ),
    );
  }
}
