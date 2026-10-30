import { CrosswordSession, cellKey, generateCrossword } from '../../domain/crossword';
import { placementCells } from '../../domain/wordSearch';
import { clear, h } from '../dom';
import { GameView, WORD_COLORS } from './gameView';

const ARABIC_ONLY = /[^؀-ۿ]/g;

export class CrosswordView extends GameView {
  start(): void {
    const { sfx, speech, praise, toast, rng } = this.svc;
    let session: CrosswordSession;
    try {
      session = new CrosswordSession(generateCrossword(this.words, rng), rng);
    } catch {
      praise.wrong();
      toast.show('تعذّر بناء الشبكة — جرّب كلمات تتشارك حروفًا', 'error');
      return this.host.exit();
    }
    const { crossword } = session;
    const { bounds } = crossword;
    this.host.setTitle('📝 الكلمات المتقاطعة');
    this.host.setScore(0);
    this.host.startTimer();

    const inputs = new Map<string, HTMLInputElement>();
    const wordCells = new Set(crossword.placements.flatMap(p => placementCells(p).map(([r, c]) => cellKey(r, c))));
    const gridEl = h('div', {
      class: 'crossword-grid',
      style: `grid-template-columns: repeat(${bounds.maxCol - bounds.minCol + 1}, 1fr)`,
    });

    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const key = cellKey(r, c);
        if (!wordCells.has(key)) gridEl.append(h('div', { class: 'cw-empty' }));
        else if (crossword.givenCells.has(key)) gridEl.append(h('div', { class: 'cw-cell given' }, crossword.grid[r]![c]!));
        else {
          const input = h('input', { type: 'text', class: 'cw-cell', maxlength: 1, 'aria-label': 'حرف', autocomplete: 'off' });
          input.addEventListener('input', () => {
            input.value = input.value.replace(ARABIC_ONLY, '');
            input.classList.remove('correct', 'incorrect');
            if (!input.value) return;
            const all = [...inputs.values()];
            const next = all.slice(all.indexOf(input) + 1).find(x => !x.value);
            next?.focus();
          });
          inputs.set(key, input);
          gridEl.append(input);
        }
      }
    }

    const entries = (): Map<string, string> => new Map([...inputs].map(([k, el]) => [k, el.value]));

    const legend = h('div', { class: 'crossword-hints' },
      ...crossword.placements.map((p, i) =>
        h('div', { class: 'cw-hint-word', style: `--word-color:${WORD_COLORS[i % WORD_COLORS.length]}` },
          h('span', null, p.word),
          h('button', { type: 'button', class: 'mini-btn', 'aria-label': 'استمع', onclick: () => void speech.speakWord(p.word) }, '🔊'),
        ),
      ),
    );

    const onCheck = (): void => {
      const result = session.check(entries());
      for (const [key, input] of inputs) {
        const ok = input.value === session.expected(key);
        input.classList.toggle('correct', ok);
        input.classList.toggle('incorrect', !ok);
      }
      if (result.solved) {
        sfx.correct();
        this.host.setScore(session.score);
        this.after(500, () => this.host.finish('🎉 أكملت الشبكة !', session.score, session.maxScore));
      } else {
        sfx.buzz();
        praise.wrong();
        toast.show(`✔️ ${result.correct} / ${result.total}`, 'info');
      }
    };

    const onHint = (): void => {
      const hint = session.hint(entries());
      if (!hint) return void toast.show('لا توجد خانات خاطئة أو فارغة', 'info');
      const input = inputs.get(hint.key)!;
      input.value = hint.letter;
      input.classList.remove('incorrect');
      input.classList.add('correct');
      sfx.hint();
      toast.show('💡 تم كشف حرف (-3)', 'info');
    };

    clear(this.host.area);
    this.host.area.append(
      h('p', { class: 'muted center' }, 'أكمل الحروف الناقصة. استخدم 🔊 للاستماع إلى الكلمات.'),
      h('div', { class: 'center' }, gridEl),
      legend,
      h('div', { class: 'center' },
        h('button', { type: 'button', class: 'btn success', onclick: onCheck }, 'تحقق ✔️'),
        h('button', { type: 'button', class: 'btn warning', onclick: onHint }, '💡 تلميح (-3)'),
      ),
    );
  }
}
