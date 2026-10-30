import { WordSearchSession, generateWordSearch, placementCells, suggestGridSize } from '../../domain/wordSearch';
import { clear, h } from '../dom';
import { GameView, WORD_COLORS } from './gameView';

const SIZES = [7, 8, 9, 10, 11, 12];

export class WordSearchView extends GameView {
  start(): void {
    this.host.setTitle('🔍 البحث عن الكلمات');
    this.showSetup();
  }

  private showSetup(): void {
    const longest = Math.max(...this.words.map(w => [...w].length));
    let chosen = suggestGridSize(longest);
    const buttons = SIZES.map(n =>
      h('button', {
        type: 'button',
        class: `size-btn ${n === chosen ? 'active' : ''}`,
        onclick: () => {
          chosen = n;
          buttons.forEach(b => b.classList.toggle('active', b === buttons[SIZES.indexOf(n)]));
        },
      }, `${n}×${n}`),
    );
    clear(this.host.area);
    this.host.area.append(
      h('div', { class: 'setup' },
        h('h3', null, '⚙️ اختر حجم الشبكة'),
        h('p', { class: 'muted' }, `أطول كلمة: ${longest} أحرف ← ${suggestGridSize(longest)}×${suggestGridSize(longest)}`),
        h('div', { class: 'size-selector' }, ...buttons),
        h('button', { class: 'btn success', type: 'button', onclick: () => this.play(chosen) }, '▶️ ابدأ اللعب'),
      ),
    );
  }

  private play(size: number): void {
    const { rng, sfx, speech, praise, toast } = this.svc;
    const grid = generateWordSearch(this.words, size, rng);
    if (grid.placements.length === 0) {
      toast.show('الكلمات طويلة جدًا لهذه الشبكة', 'error');
      return this.showSetup();
    }
    const session = new WordSearchSession(grid, rng);
    const colors = new Map(grid.placements.map((p, i) => [p.word, WORD_COLORS[i % WORD_COLORS.length]!]));
    const foundCells = new Map<string, string>();

    this.host.setTitle(`🔍 البحث عن الكلمات (${size}×${size})`);
    this.host.setScore(0);
    this.host.startTimer();

    const status = h('div', { class: 'ws-status', role: 'status' }, '🎯 اختر حروفًا متجاورة.');
    const counter = h('span', null, '0');
    const gridEl = h('div', { class: 'ws-grid', style: `grid-template-columns: repeat(${size}, 1fr)` });
    const cells = new Map<string, HTMLButtonElement>();
    const wordEls = new Map<string, HTMLElement>();

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = h('button', { type: 'button', class: 'ws-cell', onclick: () => onSelect(r, c) }, grid.cells[r]![c]!);
        cells.set(`${r},${c}`, cell);
        gridEl.append(cell);
      }
    }

    const list = h('div', { class: 'ws-word-list' });
    for (const p of grid.placements) {
      const color = colors.get(p.word)!;
      const el = h('div', { class: 'ws-word', style: `--word-color:${color}` },
        h('span', null, p.word),
        h('button', { type: 'button', class: 'mini-btn', 'aria-label': 'استمع', onclick: () => void speech.speakWord(p.word) }, '🔊'),
      );
      wordEls.set(p.word, el);
      list.append(el);
    }

    const hintBtn = h('button', {
      type: 'button',
      class: 'btn warning block',
      onclick: () => {
        const hint = session.hint();
        if (!hint) return;
        sfx.hint();
        const cell = cells.get(`${hint.row},${hint.col}`);
        cell?.classList.add('hint');
        this.after(2400, () => cell?.classList.remove('hint'));
        toast.show(`💡 كلمة تبدأ بالحرف «${[...hint.word][0]}» (${hint.length} أحرف)`, 'info');
        this.host.setScore(session.score);
      },
    }, '💡 تلميح (-5)');

    const refresh = (): void => {
      const selected = new Set(session.selection.map(([r, c]) => `${r},${c}`));
      for (const [key, cell] of cells) {
        const color = foundCells.get(key);
        cell.classList.toggle('found', !!color);
        cell.classList.toggle('selected', selected.has(key));
        if (color) cell.style.setProperty('--cell-color', color);
        else cell.style.removeProperty('--cell-color');
      }
    };

    const onSelect = (row: number, col: number): void => {
      const outcome = session.select(row, col);
      switch (outcome.kind) {
        case 'found': {
          const p = outcome.placement;
          placementCells(p).forEach(([r, c]) => foundCells.set(`${r},${c}`, colors.get(p.word)!));
          wordEls.get(p.word)?.classList.add('found');
          counter.textContent = String(session.foundWords.length);
          sfx.point();
          praise.correct();
          this.after(1400, () => void speech.speakWord(p.word));
          status.className = 'ws-status valid';
          status.textContent = `✅ وجدت «${p.word}» (+10)`;
          if (session.isComplete) this.after(2000, () => this.host.finish('🎉 أكملت البحث !', session.score, session.maxScore));
          break;
        }
        case 'extended':
          outcome.promising ? sfx.valid() : sfx.invalid();
          status.className = `ws-status ${outcome.promising ? 'valid' : 'invalid'}`;
          status.textContent = outcome.promising ? `✔️ «${outcome.letters}» — استمر...` : `❌ «${outcome.letters}»`;
          break;
        case 'rejected':
        case 'restarted':
          sfx.invalid();
          praise.wrong();
          status.className = 'ws-status invalid';
          status.textContent = '❌ حاول مرة أخرى';
          break;
        default:
          sfx.tick();
      }
      this.host.setScore(session.score);
      refresh();
    };

    clear(this.host.area);
    this.host.area.append(
      status,
      h('div', { class: 'ws-layout' },
        gridEl,
        h('aside', { class: 'ws-words' }, h('h3', null, 'الكلمات (', counter, `/${grid.placements.length})`), list, hintBtn),
      ),
    );
  }
}
