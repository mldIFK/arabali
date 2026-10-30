import type { PhraseBook, PhraseKind } from '../app/phraseBook';
import type { RandomSource } from '../domain/random';
import type { MediaStore } from '../infrastructure/mediaStore';
import { h } from './dom';

type Wave = OscillatorType;

/** Effets sonores synthétisés (Web Audio). */
export class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  /** À appeler après un geste utilisateur (politique de lecture automatique des navigateurs). */
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, duration = 0.1, type: Wave = 'sine', volume = 0.15, delay = 0): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    void ctx.resume();
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  tick() { this.tone(880, 0.05, 'triangle', 0.12); }
  valid() { this.tone(1046, 0.06, 'sine', 0.1); }
  invalid() { this.tone(220, 0.12, 'sawtooth', 0.1); this.tone(180, 0.12, 'sawtooth', 0.1, 0.1); }
  point() { this.tone(1200, 0.06, 'sine', 0.14); this.tone(1600, 0.1, 'sine', 0.14, 0.06); }
  move() { this.tone(700, 0.03, 'sine', 0.08); }
  hint() { this.tone(1800, 0.08, 'sine', 0.12); this.tone(1400, 0.12, 'sine', 0.12, 0.08); }
  buzz() { this.tone(120, 0.2, 'sawtooth', 0.15); }
  correct() { this.tone(1046, 0.09, 'sine', 0.14); this.tone(1568, 0.14, 'sine', 0.14, 0.09); }
  wrong() { this.tone(200, 0.15, 'sawtooth', 0.12); this.tone(150, 0.2, 'sawtooth', 0.12, 0.12); }
  medal() {
    this.tone(1046, 0.1, 'sine', 0.15);
    this.tone(1318, 0.1, 'sine', 0.15, 0.1);
    this.tone(1568, 0.15, 'sine', 0.15, 0.2);
    this.tone(2093, 0.3, 'sine', 0.18, 0.35);
  }

  /** Applaudissements : petites rafales de bruit filtré. */
  applause(): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    void ctx.resume();
    for (let i = 0; i < 22; i++) {
      const when = ctx.currentTime + Math.random() * 1.5;
      const buffer = ctx.createBuffer(1, 1024, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000 + Math.random() * 1500;
      filter.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(0.05 + Math.random() * 0.1, when + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(when);
      src.stop(when + 0.08);
    }
  }
}

const ARABIC_VOICE_PREFERENCE = ['ar-sa', 'ar-eg', 'ar-ae', 'ar-xa', 'ar'];

/** Prononciation : audio enregistré par l'utilisateur, sinon synthèse vocale arabe du navigateur. */
export class Speech {
  private audio: HTMLAudioElement | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor(
    private readonly media: MediaStore,
    private readonly sfx: Sfx,
  ) {
    if ('speechSynthesis' in window) {
      this.refreshVoices();
      window.speechSynthesis.onvoiceschanged = () => this.refreshVoices();
    }
  }

  private refreshVoices(): void {
    const all = window.speechSynthesis.getVoices();
    if (all.length) this.voices = all.filter(v => v.lang.toLowerCase().startsWith('ar'));
  }

  private bestVoice(): SpeechSynthesisVoice | null {
    for (const code of ARABIC_VOICE_PREFERENCE) {
      const v = this.voices.find(x => x.lang.toLowerCase() === code);
      if (v) return v;
    }
    return this.voices.find(v => /google|microsoft|natural/i.test(v.name)) ?? this.voices[0] ?? null;
  }

  stop(): void {
    this.audio?.pause();
    this.audio = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /** Joue l'audio enregistré pour une clé ; false s'il n'existe pas ou ne peut pas être lu. */
  async playKey(key: string): Promise<boolean> {
    const blob = await this.media.get(key);
    if (!blob || blob.size === 0) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.audio = audio;
    try {
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('lecture impossible'));
        audio.play().catch(reject);
      });
      return true;
    } catch {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  speakText(text: string, rate = 0.85, pitch = 1): Promise<void> {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || !text) return resolve();
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = this.bestVoice();
      u.lang = voice?.lang ?? 'ar-SA';
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = pitch;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, Math.max(1500, Math.min(8000, text.length * 250)));
      try {
        window.speechSynthesis.speak(u);
      } catch {
        finish();
      }
    });
  }

  async speakWord(word: string): Promise<void> {
    if (!this.sfx.enabled) return;
    this.stop();
    if (await this.playKey(`word:${word}`)) return;
    await this.speakText(word, 0.8);
  }

  /** Épelle le mot lettre par lettre puis le prononce. */
  async spell(word: string): Promise<void> {
    for (const letter of [...word].filter(c => c !== ' ')) {
      await this.speakText(letter, 0.7);
      await new Promise(r => setTimeout(r, 300));
    }
    await this.speakWord(word);
  }
}

/** Encouragements : fenêtre flottante + audio personnalisé ou voix de synthèse. */
export class Praise {
  constructor(
    private readonly phrases: PhraseBook,
    private readonly speech: Speech,
    private readonly sfx: Sfx,
    private readonly rng: RandomSource,
  ) {}

  correct(): void { this.say('correct'); }
  wrong(): void { this.say('wrong'); }
  win(): void { this.say('win'); }

  private say(kind: PhraseKind): void {
    const phrase = this.phrases.random(kind, this.rng);
    const text = this.phrases.textOf(phrase.key);
    const popup = h('div', { class: `praise-popup ${kind}`, role: 'status' }, text);
    document.body.append(popup);
    setTimeout(() => popup.remove(), 1600);
    if (!this.sfx.enabled) return;
    void this.speech.playKey(phrase.key).then(played => {
      if (played) return;
      if (kind !== 'wrong') this.sfx.applause();
      setTimeout(() => void this.speech.speakText(text, 0.95, 1.1), kind === 'wrong' ? 0 : 200);
    });
  }
}

export type ToastKind = 'info' | 'success' | 'error';

export class Toast {
  private readonly el = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private timer = 0;

  constructor() {
    document.body.append(this.el);
  }

  show(message: string, kind: ToastKind = 'info'): void {
    this.el.textContent = message;
    this.el.className = `toast show ${kind}`;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.el.classList.remove('show'), 2400);
  }
}

/** Boîtes de dialogue natives <dialog> (remplacent alert/confirm/prompt). */
export class Dialogs {
  open(title: string, body: Node, actions: Array<{ label: string; kind?: string; value: string }>, wide = false): Promise<string> {
    return new Promise(resolve => {
      const dialog = h('dialog', { class: wide ? 'modal wide' : 'modal' });
      const form = h(
        'form',
        { method: 'dialog' },
        h('h3', null, title),
        body,
        h('div', { class: 'modal-actions' }, ...actions.map(a => h('button', { class: `btn ${a.kind ?? ''}`, value: a.value }, a.label))),
        // Après les actions : le premier bouton du formulaire reste celui d'Entrée.
        h('button', { class: 'modal-close', value: 'cancel', 'aria-label': 'إغلاق', title: 'إغلاق' }, '✕'),
      );
      dialog.append(form);
      dialog.addEventListener('close', () => {
        resolve(dialog.returnValue || 'cancel');
        dialog.remove();
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  async confirm(message: string, confirmLabel = 'نعم'): Promise<boolean> {
    const result = await this.open('تأكيد', h('p', null, message), [
      { label: confirmLabel, kind: 'danger', value: 'yes' },
      { label: 'إلغاء', kind: 'gray', value: 'cancel' },
    ]);
    return result === 'yes';
  }

  async prompt(label: string, initial = ''): Promise<string | null> {
    const input = h('input', { type: 'text', class: 'text-input', value: initial, maxlength: 30, autofocus: true, 'aria-label': label });
    const result = await this.open(label, input, [
      { label: 'موافق', kind: 'success', value: 'ok' },
      { label: 'إلغاء', kind: 'gray', value: 'cancel' },
    ]);
    return result === 'ok' ? input.value : null;
  }

  async info(title: string, body: Node): Promise<void> {
    await this.open(title, body, [{ label: 'إغلاق', kind: 'gray', value: 'close' }]);
  }
}
