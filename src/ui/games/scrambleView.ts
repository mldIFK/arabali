import { ScrambleSession } from '../../domain/scramble';
import { clear, h } from '../dom';
import { GameView } from './gameView';

export class ScrambleView extends GameView {
  start(): void {
    const { sfx, speech, praise } = this.svc;
    this.host.setTitle('🔤 ترتيب الحروف');
    this.host.setScore(0);
    this.host.startTimer();
    const session = new ScrambleSession(this.words, this.svc.rng);

    const progress = h('h3');
    const letters = h('div', { class: 'scramble-letters', 'aria-live': 'polite' });
    const input = h('input', { type: 'text', class: 'scramble-input', placeholder: 'اكتب الكلمة...', autocomplete: 'off', dir: 'rtl' });
    const feedback = h('div', { class: 'feedback', role: 'status' });
    let busy = false;

    const load = (): void => {
      if (session.finished) return this.host.finish('🎉 انتهيت !', session.score, session.maxScore);
      progress.textContent = `سؤال ${session.index + 1} / ${session.total}`;
      letters.textContent = session.scrambled.join(' ');
      input.value = '';
      feedback.textContent = '';
      feedback.className = 'feedback';
      busy = false;
      input.focus();
    };

    const check = (): void => {
      if (busy) return;
      const { correct, word } = session.answer(input.value);
      if (correct) {
        busy = true;
        feedback.textContent = '✅ صحيح !';
        feedback.className = 'feedback correct';
        sfx.correct();
        praise.correct();
        this.host.setScore(session.score);
        this.after(1200, () => void speech.speakWord(word));
        this.after(1800, load);
      } else {
        feedback.textContent = '❌ حاول مرة أخرى';
        feedback.className = 'feedback wrong';
        sfx.wrong();
        praise.wrong();
      }
    };

    input.addEventListener('keydown', e => e.key === 'Enter' && check());
    clear(this.host.area);
    this.host.area.append(
      h('div', { class: 'scramble-area' },
        progress,
        letters,
        h('button', { type: 'button', class: 'btn warning', onclick: () => !session.finished && void speech.speakWord(session.current) }, '🔊 استمع'),
        input,
        feedback,
        h('button', { type: 'button', class: 'btn success', onclick: check }, 'تحقق ✔️'),
        h('button', { type: 'button', class: 'btn gray', onclick: () => { if (busy) return; sfx.move(); session.skip(); load(); } }, 'تخطي ➡️'),
      ),
    );
    load();
  }
}
