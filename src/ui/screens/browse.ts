import { GAME_KEYS, GAME_NAMES, MEDAL_LABELS, type GameKey } from '../../domain/gameKey';
import { formatTime } from '../../domain/scoring';
import type { AppContext } from '../context';
import { h } from '../dom';

const GAME_CARDS: ReadonlyArray<readonly [GameKey, string, string]> = [
  ['ws', '🔍', 'البحث عن الكلمات'],
  ['pz', '🧩', 'تركيب الحروف'],
  ['sc', '🔤', 'ترتيب الحروف'],
  ['mt', '🖼️', 'ربط الكلمة بالصورة'],
  ['cw', '📝', 'الكلمات المتقاطعة'],
  ['ls', '🎧', 'الاستماع واختيار الصورة'],
];

const title = (text: string, ...extra: Array<Node | string>) =>
  h('div', { class: 'game-header' }, h('h2', { class: 'game-title' }, text), h('div', { class: 'header-extra' }, ...extra));

/** Rappel de la leçon active, avec accès direct au changement de leçon. */
function lessonBanner(ctx: AppContext): HTMLElement {
  const lesson = ctx.lessonCatalog.active;
  return h('div', { class: 'lesson-banner' },
    h('div', null,
      h('strong', null, lesson.name),
      h('span', { class: 'muted' }, ` · ${lesson.words.size} كلمة · ${lesson.description}`),
    ),
    h('button', { type: 'button', class: 'btn small', onclick: () => void ctx.openLessonPicker() }, '🔄 تغيير الدرس'),
  );
}

export function homeScreen(ctx: AppContext): HTMLElement {
  const lesson = ctx.lessonCatalog.active;
  const progress = ctx.players.current;
  const discovered = ctx.lessons.countVisited(lesson.words.texts);
  const stat = (icon: string, label: string, value: string | number) =>
    h('div', { class: 'stat' }, h('span', { class: 'icon', 'aria-hidden': 'true' }, icon), h('strong', null, value), h('span', { class: 'muted' }, label));

  return h('section', { class: 'screen' },
    title(`مرحبًا ${ctx.players.currentName} 👋`),
    h('div', { class: 'hero' },
      h('span', { class: 'muted' }, 'الدرس الحالي'),
      h('h3', null, lesson.name),
      h('p', { class: 'muted' }, `${lesson.words.size} كلمة · اكتشفت ${discovered} منها`),
      h('div', { class: 'progress-bar' }, h('div', { class: 'progress-fill', style: { inlineSize: `${lesson.words.size ? (discovered / lesson.words.size) * 100 : 0}%` } })),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn success', onclick: () => ctx.show('lesson') }, '📚 تعلّم الكلمات'),
        h('button', { type: 'button', class: 'btn', onclick: () => ctx.show('games') }, '🎮 العب'),
        h('button', { type: 'button', class: 'btn warning', onclick: () => void ctx.openLessonPicker() }, '🔄 غيّر الدرس'),
      ),
    ),
    h('h3', null, '⚡ العب الآن'),
    h('div', { class: 'quick-games' },
      ...GAME_CARDS.map(([key, icon, name]) =>
        h('button', { type: 'button', class: 'quick-game', onclick: () => ctx.startGame(key) }, h('span', { class: 'icon', 'aria-hidden': 'true' }, icon), name),
      ),
    ),
    h('h3', null, '📈 تقدّمك'),
    h('div', { class: 'stats' },
      stat('🌟', 'النقاط', progress.totalScore),
      stat('🏆', 'المستوى', progress.level),
      stat('🎯', 'ألعاب مكتملة', progress.gamesCompleted),
      stat('🏅', 'الميداليات', progress.medalCount),
    ),
  );
}

export function gamesScreen(ctx: AppContext): HTMLElement {
  const progress = ctx.players.current;
  return h('section', { class: 'screen' },
    title('🎮 اختر لعبة'),
    lessonBanner(ctx),
    h('div', { class: 'games-grid' },
      ...GAME_CARDS.map(([key, icon, name]) => {
        const medal = progress.bestMedal(key);
        return h('button', { type: 'button', class: `game-card game-${key}`, onclick: () => ctx.startGame(key) },
          medal && h('span', { class: 'medal', 'aria-label': MEDAL_LABELS[medal].name }, MEDAL_LABELS[medal].emoji),
          h('span', { class: 'icon', 'aria-hidden': 'true' }, icon),
          h('span', { class: 'name' }, name),
          h('span', { class: 'best' }, `أفضل: ${progress.bestScores[key]}`),
        );
      }),
    ),
  );
}

/** Mode leçon : découverte des mots de la leçon active. */
export function lessonScreen(ctx: AppContext): HTMLElement {
  const words = ctx.wordList.words;
  const grid = h('div', { class: 'lesson-grid' });
  const fill = h('div', { class: 'progress-fill' });
  const text = h('span');
  const root = h('section', { class: 'screen' }, title('📚 اكتشف الكلمات'), lessonBanner(ctx));

  const updateProgress = (): void => {
    const done = ctx.lessons.countVisited(ctx.wordList.texts);
    text.textContent = `${done} / ${words.length} كلمة مكتشفة`;
    fill.style.width = `${words.length ? (done / words.length) * 100 : 0}%`;
  };

  if (words.length === 0) {
    root.append(h('p', { class: 'muted center' }, 'لا توجد كلمات. اذهب إلى «كلماتي» لإضافتها!'));
    return root;
  }
  root.append(h('div', { class: 'progress' }, text, h('div', { class: 'progress-bar' }, fill)), grid);

  const openDetail = async (word: string, source: string | undefined, card: HTMLElement): Promise<void> => {
    const letters = [...word].filter(c => c !== ' ');
    const body = h('div', { class: 'lesson-detail' },
      h('div', { class: 'big-img' }, await ctx.svc.images.render(word)),
      h('div', { class: 'big-word' }, word),
      source && h('div', { class: 'lesson-source' }, `📖 ${source}`),
      h('div', { class: 'letter-spelling' }, ...letters.map((l, i) => h('span', { style: `animation-delay:${i * 0.1}s` }, l))),
      h('div', { class: 'row' },
        h('button', { type: 'button', class: 'btn success', onclick: () => void ctx.svc.speech.speakWord(word) }, '🔊 استمع'),
        h('button', { type: 'button', class: 'btn warning', onclick: () => void ctx.svc.speech.spell(word) }, '🔤 تهجئة'),
      ),
    );
    ctx.lessons.visit(word);
    card.classList.add('visited');
    updateProgress();
    await ctx.dialogs.info(word, body);
    ctx.svc.speech.stop();
  };

  void (async () => {
    for (const word of words) {
      const img = await ctx.svc.images.render(word.text);
      const card: HTMLElement = h('button', { type: 'button', class: `lesson-card ${ctx.lessons.has(word.text) ? 'visited' : ''}`, onclick: () => void openDetail(word.text, word.source, card) },
        h('span', { class: 'lesson-img' }, img),
        h('span', { class: 'lesson-word' }, word.text),
        word.source ? h('span', { class: 'lesson-source' }, word.source) : h('span', { class: 'lesson-hint' }, 'اضغط للاكتشاف'),
      );
      grid.append(card);
    }
    updateProgress();
  })();
  return root;
}

const table = (head: string[], rows: Array<Array<string | number>>, topClasses = false) =>
  h('table', { class: 'stats-table' },
    h('thead', null, h('tr', null, ...head.map(t => h('th', null, t)))),
    h('tbody', null, ...rows.map((r, i) => h('tr', { class: topClasses && i < 3 ? `top-${i + 1}` : '' }, ...r.map(c => h('td', null, c))))),
  );
const rank = (i: number) => (['🥇', '🥈', '🥉'][i] ?? String(i + 1));

/** « تقدّمي » : médailles, meilleurs temps et classements réunis. */
export function progressScreen(ctx: AppContext): HTMLElement {
  const progress = ctx.players.current;
  const hasTimes = GAME_KEYS.some(k => progress.bestTimes[k] !== null);
  const overall = ctx.players.timeRanking();
  const board = ctx.players.leaderboard();

  const medalCards = GAME_KEYS.map(k => {
    const medals = progress.medalsOf(k);
    const best = progress.bestMedal(k);
    return h('div', { class: `medal-card ${medals.length ? 'has' : ''}` },
      h('div', { class: 'big-emoji' }, best ? MEDAL_LABELS[best].emoji : '⬜'),
      h('strong', null, GAME_NAMES[k]),
      h('p', { class: 'muted' }, medals.length ? medals.map(m => `${MEDAL_LABELS[m].emoji} ${MEDAL_LABELS[m].name}`).join(' · ') : 'لا توجد ميدالية بعد'),
    );
  });

  const mine = GAME_KEYS.map(k => {
    const time = progress.bestTimes[k];
    return [GAME_NAMES[k], progress.bestScores[k], time === null ? '—' : formatTime(time)];
  });

  return h('section', { class: 'screen' },
    title('🏅 تقدّمي', h('span', { class: 'game-score' }, `${ctx.players.currentName} · ${progress.totalScore} نقطة`)),
    h('h3', null, `🏅 الميداليات (${progress.medalCount})`),
    h('div', { class: 'medal-grid' }, ...medalCards),
    h('h3', null, '⏱️ أفضل نتائجي'),
    hasTimes ? table(['اللعبة', 'أفضل نتيجة', 'أفضل وقت'], mine) : h('p', { class: 'muted center' }, 'لا توجد نتائج بعد. العب أولًا! 🎮'),
    h('h3', null, '⚡ ترتيب السرعة'),
    overall.length
      ? table(['#', 'اللاعب', 'مجموع الأوقات', 'الألعاب', 'الميداليات'], overall.map((e, i) => [rank(i), e.name, formatTime(e.totalTime), e.gamesCount, `${e.medals} 🏅`]), true)
      : h('p', { class: 'muted center' }, 'لا توجد بيانات.'),
    h('h3', null, '🏆 لوحة الصدارة'),
    board.length
      ? table(['#', 'اللاعب', 'النقاط', 'الميداليات', 'الألعاب'], board.map((e, i) => [rank(i), e.name, e.score, `${e.medals} 🏅`, e.games]), true)
      : h('p', { class: 'muted center' }, 'لا توجد بيانات.'),
  );
}
