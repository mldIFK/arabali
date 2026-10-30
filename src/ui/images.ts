import type { MediaStore } from '../infrastructure/mediaStore';
import { ICONS, ICON_ALIASES } from './icons';
import { h } from './dom';

const BADGE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

export function hashWord(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgFrom(markup: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}" viewBox="0 0 100 100" aria-hidden="true">${markup}</svg>`,
    'image/svg+xml',
  );
  return document.importNode(doc.documentElement as unknown as SVGSVGElement, true);
}

/** Image d'un mot : photo choisie par l'utilisateur, sinon illustration, sinon pastille colorée. */
export class WordImages {
  private readonly urls = new Map<string, string>();

  constructor(private readonly media: MediaStore) {}

  invalidate(word: string): void {
    const url = this.urls.get(word);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(word);
  }

  invalidateAll(): void {
    [...this.urls.keys()].forEach(w => this.invalidate(w));
  }

  async render(word: string, className = ''): Promise<HTMLElement> {
    const wrapper = h('span', { class: `word-image ${className}`.trim() });
    const custom = await this.media.get(`image:${word}`);
    if (custom) {
      this.invalidate(word);
      const url = URL.createObjectURL(custom);
      this.urls.set(word, url);
      wrapper.append(h('img', { src: url, alt: '' }));
      return wrapper;
    }
    const spec = ICONS[word] ?? ICONS[ICON_ALIASES[word] ?? ''];
    if (spec) {
      wrapper.append(svgFrom(`<rect x="2" y="2" width="96" height="96" rx="16" fill="${spec.bg}"/>${spec.icon}`));
      return wrapper;
    }
    const color = BADGE_COLORS[hashWord(word) % BADGE_COLORS.length];
    const svg = svgFrom(
      `<rect x="2" y="2" width="96" height="96" rx="16" fill="${color}"/><circle cx="50" cy="40" r="22" fill="rgba(255,255,255,0.22)"/><rect x="18" y="68" width="64" height="9" rx="4.5" fill="rgba(255,255,255,0.45)"/><rect x="28" y="68" width="20" height="9" rx="4.5" fill="rgba(255,255,255,0.75)"/>`,
    );
    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('x', '50');
    label.setAttribute('y', '49');
    label.setAttribute('font-size', '28');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-weight', 'bold');
    label.textContent = [...word].slice(0, 2).join('');
    svg.append(label);
    wrapper.append(svg);
    return wrapper;
  }
}
