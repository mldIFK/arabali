import { PuzzleSession } from '../../domain/puzzle';
import { clear, h } from '../dom';
import { GameView } from './gameView';

export class PuzzleView extends GameView {
  private session!: PuzzleSession;
  private feedback = '';
  private feedbackKind = '';

  start(): void {
    this.host.setTitle('🧩 تركيب الحروف');
    this.host.setScore(0);
    this.host.startTimer();
    this.session = new PuzzleSession(this.words, this.svc.rng);
    this.render();
  }

  private render(): void {
    const s = this.session;
    const { speech } = this.svc;
    const slots = [...s.current].map((_, i) => {
      const letter = s.placed[i];
      const hintFirst = i === 0 && s.hintActive && !letter;
      return h('div', { class: `puzzle-slot ${letter ? 'filled' : ''} ${hintFirst ? 'hint-first' : ''}` }, letter ?? '?');
    });
    const pieces = s.pieces.map(p => {
      const hint = s.hintActive && p.letter === s.current[0] && !p.used;
      return h('button', {
        type: 'button',
        class: `puzzle-piece ${p.used ? 'used' : ''} ${hint ? 'hint-letter' : ''}`,
        dataset: { color: String(p.id % 5) },
        disabled: p.used,
        onclick: () => this.onPick(p.id),
      }, p.letter);
    });
    clear(this.host.area);
    this.host.area.append(
      h('div', { class: 'puzzle-area' },
        h('h3', null, '🧩 رتّب الحروف بالترتيب'),
        h('p', { class: 'muted' }, `(${s.index + 1} / ${s.total})`),
        h('div', { class: 'puzzle-board' }, ...slots),
        h('button', { type: 'button', class: 'btn warning', onclick: () => void speech.speakWord(s.current) }, '🔊 استمع'),
        h('div', { class: 'puzzle-pool' }, ...pieces),
        h('div', { class: `feedback ${this.feedbackKind}`, role: 'status' }, this.feedback),
      ),
    );
  }

  private onPick(id: number): void {
    const { sfx, speech, praise } = this.svc;
    const s = this.session;
    const outcome = s.pick(id);
    if (outcome === 'ignored') return;
    sfx.tick();
    if (outcome === 'correct') {
      const word = s.current;
      sfx.correct();
      praise.correct();
      this.feedback = '✅ أحسنت !';
      this.feedbackKind = 'correct';
      this.host.setScore(s.score);
      this.after(1200, () => void speech.speakWord(word));
      this.after(2600, () => {
        s.advance();
        this.feedback = '';
        this.feedbackKind = '';
        if (s.finished) this.host.finish('🧩 انتهيت !', s.score, s.maxScore);
        else this.render();
      });
    } else if (outcome === 'wrong') {
      sfx.wrong();
      praise.wrong();
      this.feedback = s.attempts >= 2 ? '❌ انظر إلى الحرف المميز' : '❌ حاول مرة أخرى';
      this.feedbackKind = 'wrong';
      this.after(1500, () => {
        s.retry();
        this.render();
      });
    }
    this.render();
  }
}
