import { withKnownSources } from '../../app/wordRepository';
import { DEFAULT_PHRASES, type PhraseKind } from '../../app/phraseBook';
import { WordList } from '../../domain/word';
import type { AppContext } from '../context';
import { clear, download, h, pickFile } from '../dom';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const PHRASE_GROUPS: Array<{ kind: PhraseKind; title: string }> = [
  { kind: 'correct', title: '✅ الإجابة الصحيحة' },
  { kind: 'wrong', title: '❌ الإجابة الخاطئة' },
  { kind: 'win', title: '🏆 الفوز' },
];

export function wordsScreen(ctx: AppContext): HTMLElement {
  const { toast, speech, images } = ctx.svc;
  const textarea = h('textarea', { id: 'wordsInput', rows: 4, dir: 'rtl', 'aria-label': 'الكلمات' });
  textarea.value = (ctx.lessonCatalog.custom?.words ?? ctx.wordList).toInputString();
  const manager = h('div', { class: 'card' });
  const phrasesBox = h('div', { class: 'phrase-grid' });

  const parsed = () => withKnownSources(WordList.parse(textarea.value));

  const requireFile = async (accept: string): Promise<File | null> => {
    const file = await pickFile(accept);
    if (file && file.size > MAX_UPLOAD_BYTES) {
      toast.show('الملف كبير (الحد 15 ميجا)', 'error');
      return null;
    }
    return file;
  };

  async function renderManager(): Promise<void> {
    const list = parsed();
    const rows: HTMLElement[] = [];
    for (const [i, word] of list.words.entries()) {
      const hasAudio = !!(await ctx.media.get(`word:${word.text}`));
      const hasImage = !!(await ctx.media.get(`image:${word.text}`));
      const upload = (key: string, accept: string, message: string, after?: () => void) => async () => {
        const file = await requireFile(accept);
        if (!file) return;
        await ctx.media.put(key, file);
        after?.();
        toast.show(message, 'success');
        void renderManager();
      };
      const remove = (key: string, message: string, after?: () => void) => async () => {
        await ctx.media.delete(key);
        after?.();
        toast.show(message, 'success');
        void renderManager();
      };
      rows.push(
        h('div', { class: `word-row ${hasAudio ? 'has-audio' : ''}` },
          h('span', { class: 'num' }, i + 1),
          h('span', { class: 'word-text' }, word.text, word.source && h('small', null, word.source)),
          h('span', { class: `audio-status ${hasAudio ? 'has' : 'none'}` }, hasAudio ? '🎵 صوت مرفوع' : '⏳ صوت تلقائي'),
          h('div', { class: 'row-actions' },
            await images.render(word.text, 'preview'),
            h('button', { type: 'button', class: 'mini-btn green', 'aria-label': 'استمع', onclick: () => void speech.speakWord(word.text) }, '▶️'),
            h('button', { type: 'button', class: 'mini-btn', 'aria-label': 'رفع صوت', onclick: upload(`word:${word.text}`, 'audio/*', `✅ تم حفظ صوت «${word.text}»`) }, '📁'),
            h('button', { type: 'button', class: 'mini-btn violet', 'aria-label': 'رفع صورة', onclick: upload(`image:${word.text}`, 'image/*', `✅ تم حفظ صورة «${word.text}»`, () => images.invalidate(word.text)) }, '📷'),
            hasAudio && h('button', { type: 'button', class: 'mini-btn red', onclick: remove(`word:${word.text}`, 'تم حذف الصوت') }, '🗑️ صوت'),
            hasImage && h('button', { type: 'button', class: 'mini-btn red', onclick: remove(`image:${word.text}`, 'تم حذف الصورة', () => images.invalidate(word.text)) }, '🗑️ صورة'),
          ),
        ),
      );
    }
    clear(manager);
    manager.append(
      h('h3', null, '🎧🖼️ إدارة النطق والصور'),
      h('p', { class: 'muted' }, 'لكل كلمة: 📁 صوت أو 📷 صورة (الحد الأقصى 15 ميجا). بدونهما يُستخدم النطق التلقائي والرسم الافتراضي.'),
      ...rows,
      h('div', { class: 'center' },
        h('button', { type: 'button', class: 'btn gray small', onclick: async () => {
          if (!(await ctx.dialogs.confirm('حذف كل أصوات الكلمات ؟'))) return;
          await ctx.media.clearPrefix('word:');
          void renderManager();
        } }, '🗑️ حذف كل الأصوات'),
        h('button', { type: 'button', class: 'btn gray small', onclick: async () => {
          if (!(await ctx.dialogs.confirm('حذف كل الصور ؟'))) return;
          await ctx.media.clearPrefix('image:');
          images.invalidateAll();
          void renderManager();
        } }, '🗑️ حذف كل الصور'),
      ),
    );
  }

  async function renderPhrases(): Promise<void> {
    const groups: HTMLElement[] = [];
    for (const { kind, title } of PHRASE_GROUPS) {
      const rows: HTMLElement[] = [];
      for (const phrase of DEFAULT_PHRASES[kind]) {
        const hasAudio = !!(await ctx.media.get(phrase.key));
        const input = h('input', { type: 'text', class: 'text-input', value: ctx.phrases.textOf(phrase.key), dir: 'rtl', 'aria-label': title });
        input.addEventListener('change', () => {
          const text = input.value.trim();
          if (!text) {
            toast.show('العبارة فارغة', 'error');
            input.value = ctx.phrases.textOf(phrase.key);
            return;
          }
          ctx.phrases.setText(phrase.key, text);
          toast.show('✅ تم الحفظ', 'success');
        });
        rows.push(
          h('div', { class: `phrase-row ${hasAudio ? 'has-audio' : ''}` },
            input,
            h('button', { type: 'button', class: 'mini-btn green', 'aria-label': 'استمع', onclick: async () => {
              if (!(await speech.playKey(phrase.key))) void speech.speakText(ctx.phrases.textOf(phrase.key), 0.95, 1.1);
            } }, '▶️'),
            h('button', { type: 'button', class: 'mini-btn', 'aria-label': 'رفع صوت', onclick: async () => {
              const file = await requireFile('audio/*');
              if (!file) return;
              await ctx.media.put(phrase.key, file);
              toast.show('✅ تم حفظ الصوت', 'success');
              void renderPhrases();
            } }, '📁'),
            hasAudio && h('button', { type: 'button', class: 'mini-btn red', onclick: async () => { await ctx.media.delete(phrase.key); void renderPhrases(); } }, '🗑️'),
            h('button', { type: 'button', class: 'mini-btn gray', 'aria-label': 'استرجاع', onclick: () => {
              ctx.phrases.reset(phrase.key);
              input.value = ctx.phrases.textOf(phrase.key);
              toast.show('تم استرجاع النص الافتراضي', 'info');
            } }, '↩️'),
          ),
        );
      }
      groups.push(h('div', { class: `phrase-group ${kind}` }, h('h4', null, title), ...rows));
    }
    phrasesBox.replaceChildren(...groups);
  }

  const readTextFile = async (accept: string): Promise<string | null> => (await pickFile(accept))?.text() ?? null;

  const save = (): void => {
    const list = parsed();
    if (list.size < 2) return void toast.show('أدخل كلمتين على الأقل', 'error');
    ctx.saveCustomWords(list);
    toast.show(`تم حفظ ${list.size} كلمة في «كلماتي» ✅`, 'success');
    ctx.show('games');
  };

  const exportWords = (): void => {
    const list = parsed();
    if (!list.size) return void toast.show('لا توجد كلمات', 'error');
    const payload = { type: 'arabic-games-words-backup', savedAt: new Date().toISOString(), words: list.texts, phrases: ctx.phrases.customTexts };
    download(`كلمات-${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  };

  const importJson = async (): Promise<void> => {
    const text = await readTextFile('application/json,.json');
    if (text === null) return;
    try {
      const data = JSON.parse(text) as { words?: unknown; phrases?: Record<string, string> };
      const words = Array.isArray(data.words) ? data.words.filter((w): w is string => typeof w === 'string') : [];
      if (!words.length) return void toast.show('ملف غير صالح', 'error');
      textarea.value = words.join('، ');
      if (data.phrases) ctx.phrases.mergeCustom(data.phrases);
      toast.show('✅ تم الاستيراد، اضغط «حفظ»', 'success');
      void renderPhrases();
    } catch {
      toast.show('خطأ في القراءة', 'error');
    }
  };

  const importTxt = async (): Promise<void> => {
    const text = await readTextFile('text/plain,.txt');
    if (text === null) return;
    const list = WordList.parse(text);
    if (!list.size) return void toast.show('لم أجد كلمات', 'error');
    textarea.value = list.toInputString();
    toast.show(`✅ تم تحميل ${list.size} كلمة`, 'success');
  };

  void renderPhrases();
  return h('section', { class: 'screen' },
    h('div', { class: 'game-header' }, h('h2', { class: 'game-title' }, '✏️ كلماتي')),
    h('div', { class: 'card' },
      h('h3', null, '✏️ أدخل الكلمات مفصولة بفواصل:'),
      h('p', { class: 'muted' }, 'عند الحفظ تصبح هذه القائمة درس «كلماتي» وتُستخدم في الدرس والألعاب. الدروس الجاهزة لا تتغير.'),
      textarea,
      h('div', { class: 'center' },
        h('button', { type: 'button', class: 'btn', onclick: () => void renderManager() }, '📋 عرض القائمة'),
        h('button', { type: 'button', class: 'btn success', onclick: save }, '✅ حفظ والانتقال للألعاب'),
        h('button', { type: 'button', class: 'btn gray small', onclick: exportWords }, '💾 تنزيل الكلمات'),
        h('button', { type: 'button', class: 'btn gray small', onclick: () => void importJson() }, '📂 استيراد (JSON)'),
        h('button', { type: 'button', class: 'btn warning small', onclick: () => void importTxt() }, '📄 استيراد (TXT)'),
      ),
    ),
    manager,
    h('div', { class: 'card' },
      h('h3', null, '🎉 عبارات التشجيع (اختياري)'),
      phrasesBox,
      h('div', { class: 'center' },
        h('button', { type: 'button', class: 'btn gray small', onclick: async () => {
          if (!(await ctx.dialogs.confirm('حذف كل أصوات التشجيع ؟'))) return;
          for (const key of ctx.phrases.allKeys) await ctx.media.delete(key);
          void renderPhrases();
        } }, '🗑️ حذف كل الأصوات'),
      ),
    ),
  );
}
