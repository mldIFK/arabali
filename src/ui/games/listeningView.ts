import { ListeningSession } from '../../domain/listening';
import { clear, h } from '../dom';
import { GameView } from './gameView';

export class ListeningView extends GameView {
  start(): void {
    const { sfx, speech, praise, images, toast, rng } = this.svc;
    let session: ListeningSession;
    try {
      session = new ListeningSession(this.words, rng);
    } catch {
      toast.show('4 كلمات مختلفة على الأقل', 'error');
      return this.host.exit();
    }
    this.host.setTitle('🎧 الاستماع واختيار الصورة');
    this.host.setScore(0);
    this.host.startTimer();

    const progress = h('div', { class: 'listen-progress' });
    const options = h('div', { class: 'listen-options' });
    const feedback = h('div', { class: 'feedback', role: 'status' });
    const playBtn = h('button', { type: 'button', class: 'listen-btn-big', 'aria-label': 'استمع', onclick: () => play() }, '🔊');
    const play = (): void => {
      playBtn.classList.add('playing');
      void speech.speakWord(session.question.word).finally(() => playBtn.classList.remove('playing'));
    };

    let locked = false;
    const showQuestion = async (): Promise<void> => {
      locked = false;
      const q = session.question;
      progress.textContent = `سؤال ${session.history.length} / ${session.totalQuestions}`;
      feedback.textContent = '';
      feedback.className = 'feedback';
      const rendered = await Promise.all(q.options.map(async w => [w, await images.render(w, 'listen-img')] as const));
      if (this.isClosed) return;
      options.replaceChildren(
        ...rendered.map(([w, img]) =>
          h('button', { type: 'button', class: 'listen-option', dataset: { word: w }, 'aria-label': 'صورة', onclick: (e: Event) => onAnswer(w, e.currentTarget as HTMLElement) }, img),
        ),
      );
      this.after(400, play);
    };

    const onAnswer = (word: string, button: HTMLElement): void => {
      if (locked) return;
      locked = true;
      const { correct, expected } = session.answer(word);
      if (correct) {
        button.classList.add('correct');
        sfx.correct();
        praise.correct();
        feedback.textContent = '✅ صحيح !';
        feedback.className = 'feedback correct';
      } else {
        button.classList.add('wrong');
        sfx.wrong();
        praise.wrong();
        feedback.textContent = `❌ كان الصحيح: ${expected}`;
        feedback.className = 'feedback wrong';
        options.querySelectorAll<HTMLElement>('.listen-option').forEach(o => o.dataset.word === expected && o.classList.add('correct'));
      }
      this.host.setScore(session.score);
      this.after(correct ? 2000 : 2800, () => {
        if (session.finished) return this.host.finish('🎧 انتهيت !', session.score, session.maxScore);
        session.next();
        void showQuestion();
      });
    };

    clear(this.host.area);
    this.host.area.append(
      h('div', { class: 'listening-area' },
        progress,
        h('p', { class: 'muted' }, 'استمع ثم اختر الصورة الصحيحة'),
        playBtn,
        h('button', { type: 'button', class: 'btn gray small', onclick: play }, '🔁 إعادة'),
        options,
        feedback,
      ),
    );
    void showQuestion();
  }
}
