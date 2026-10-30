import { MatchSession } from '../../domain/match';
import { clear, h } from '../dom';
import { GameView } from './gameView';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class MatchView extends GameView {
  private onResize: (() => void) | null = null;

  override dispose(): void {
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    super.dispose();
  }

  async start(): Promise<void> {
    const { sfx, speech, praise, images, toast, rng } = this.svc;
    let session: MatchSession;
    try {
      session = new MatchSession(this.words, rng);
    } catch {
      toast.show('3 كلمات مختلفة على الأقل', 'error');
      return this.host.exit();
    }
    this.host.setTitle('🖼️ ربط الكلمة بالصورة');
    this.host.setScore(0);
    this.host.startTimer();

    const imageEls = new Map(await Promise.all(session.words.map(async w => [w, await images.render(w, 'match-img')] as const)));
    if (this.isClosed) return;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'match-svg');
    const wrapper = h('div', { class: 'match-wrapper' }, svg);
    const wordItems = new Map<string, HTMLElement>();
    const imageItems = new Map<string, HTMLElement>();
    const pairs: Array<[HTMLElement, HTMLElement]> = [];
    let selected: HTMLElement | null = null;

    const addLine = (a: HTMLElement, b: HTMLElement, kind: 'correct' | 'wrong'): SVGLineElement => {
      const box = wrapper.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const aOnRight = ra.left + ra.width / 2 >= rb.left + rb.width / 2;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String((aOnRight ? ra.left : ra.right) - box.left));
      line.setAttribute('y1', String(ra.top + ra.height / 2 - box.top));
      line.setAttribute('x2', String((aOnRight ? rb.right : rb.left) - box.left));
      line.setAttribute('y2', String(rb.top + rb.height / 2 - box.top));
      line.setAttribute('class', `match-line-${kind}`);
      svg.append(line);
      return line;
    };
    this.onResize = () => {
      svg.replaceChildren();
      pairs.forEach(([a, b]) => addLine(a, b, 'correct'));
    };
    window.addEventListener('resize', this.onResize);

    for (const w of session.words) {
      const item = h('div', {
        class: 'match-item',
        role: 'button',
        tabindex: 0,
        onclick: () => {
          if (!session.selectWord(w)) return;
          selected?.classList.remove('selected');
          selected = item;
          item.classList.add('selected');
          sfx.tick();
        },
      }, h('span', null, w), h('button', {
        type: 'button',
        class: 'mini-btn audio',
        'aria-label': 'استمع',
        onclick: (e: Event) => { e.stopPropagation(); void speech.speakWord(w); },
      }, '🔊'));
      wordItems.set(w, item);
    }

    for (const w of session.imageOrder) {
      const item = h('div', {
        class: 'match-item',
        role: 'button',
        tabindex: 0,
        onclick: () => {
          const from = selected;
          const outcome = session.selectImage(w);
          if (outcome === 'ignored' || !from) return;
          if (outcome === 'correct') {
            from.classList.remove('selected');
            from.classList.add('matched');
            item.classList.add('matched');
            pairs.push([from, item]);
            addLine(from, item, 'correct');
            selected = null;
            sfx.correct();
            praise.correct();
            this.host.setScore(session.score);
            this.after(1400, () => void speech.speakWord(w));
            if (session.isComplete) this.after(2200, () => this.host.finish('🎉 أتممت الربط !', session.score, session.maxScore));
          } else {
            const line = addLine(from, item, 'wrong');
            this.after(950, () => line.remove());
            sfx.wrong();
            praise.wrong();
          }
        },
      }, imageEls.get(w));
      imageItems.set(w, item);
    }

    wrapper.append(
      h('div', { class: 'match-layout' },
        h('div', { class: 'match-col' }, h('h3', null, 'الكلمات'), ...wordItems.values()),
        h('div', { class: 'match-col' }, h('h3', null, 'الصور'), ...imageItems.values()),
      ),
    );
    clear(this.host.area);
    this.host.area.append(h('p', { class: 'muted center' }, 'اضغط على الكلمة ثم على صورتها.'), wrapper);
  }
}
