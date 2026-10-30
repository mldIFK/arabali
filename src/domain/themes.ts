import { Word } from './word';

export interface Theme {
  readonly id: string;
  readonly name: string;
  readonly words: readonly Word[];
}

/** Un élément est soit un mot, soit [mot, sourate] quand le mot est aussi un nom de sourate. */
type Entry = string | readonly [string, string];

function theme(id: string, name: string, entries: readonly Entry[]): Theme {
  const words = entries.map(e => (typeof e === 'string' ? Word.of(e) : Word.of(e[0], e[1])));
  return { id, name, words };
}

/** Mots simples du Coran, sans signes diacritiques (ils casseraient les jeux de lettres). */
export const QURAN_THEMES: readonly Theme[] = [
  theme('quran-cosmos', '🌙 الكون في القرآن', [
    ['شمس', 'سورة الشمس'],
    ['قمر', 'سورة القمر'],
    ['نجم', 'سورة النجم'],
    'سماء',
    'أرض',
    'جبل',
    'بحر',
    'ماء',
    ['نور', 'سورة النور'],
    ['ليل', 'سورة الليل'],
    ['رعد', 'سورة الرعد'],
    'مطر',
    'ريح',
  ]),
  theme('quran-animals', '🐪 الحيوانات في القرآن', [
    ['نحل', 'سورة النحل'],
    ['نمل', 'سورة النمل'],
    ['فيل', 'سورة الفيل'],
    ['بقرة', 'سورة البقرة'],
    ['عنكبوت', 'سورة العنكبوت'],
    'جمل',
    'ناقة',
    'هدهد',
    'حوت',
    'كلب',
    'غراب',
    'ذئب',
  ]),
  theme('quran-prophets', '🕌 الأنبياء', [
    'آدم',
    ['نوح', 'سورة نوح'],
    ['هود', 'سورة هود'],
    'صالح',
    ['إبراهيم', 'سورة إبراهيم'],
    ['يوسف', 'سورة يوسف'],
    'موسى',
    'عيسى',
    'داود',
    'سليمان',
    ['يونس', 'سورة يونس'],
    ['محمد', 'سورة محمد'],
  ]),
  theme('quran-values', '🤲 معاني ومفاهيم', [
    'صبر',
    'شكر',
    'رحمة',
    'علم',
    'عدل',
    'سلام',
    'إيمان',
    'تقوى',
    'صدق',
    'حمد',
    'توبة',
    'هدى',
  ]),
  theme('quran-things', '📖 أشياء ومعالم', [
    ['قلم', 'سورة القلم'],
    'كتاب',
    'ميزان',
    'جنة',
    'نار',
    'عرش',
    'كرسي',
    'مسجد',
    'كعبة',
    'سفينة',
    ['حديد', 'سورة الحديد'],
  ]),
];

/** Thèmes de l'application d'origine. */
export const CLASSIC_THEMES: readonly Theme[] = [
  theme('animaux', '🐾 حيوانات', ['قطة', 'كلب', 'أسد', 'فيل', 'سمكة', 'طائر', 'سلحفاة', 'أرنب', 'دب', 'بقرة', 'حصان', 'نحلة', 'فراشة']),
  theme('nature', '🌿 طبيعة', ['شمس', 'قمر', 'نجمة', 'شجرة', 'زهرة', 'بحر', 'جبل', 'مطر', 'ثلج', 'نار', 'سحابة', 'قوس قزح']),
  theme('maison', '🏠 منزل', ['بيت', 'باب', 'نافذة', 'طاولة', 'كرسي', 'سرير', 'صحن', 'كوب', 'فنجان', 'سكين', 'ملعقة', 'شوكة']),
  theme('ecole', '🏫 مدرسة', ['كتاب', 'قلم', 'دفتر', 'محفظة', 'ممحاة', 'مسطرة', 'مقص', 'مدرسة', 'معلم', 'تلميذ', 'سبورة', 'ساعة', 'حقيبة']),
  theme('nourriture', '🍎 طعام', ['تفاحة', 'موز', 'عنب', 'برتقال', 'فراولة', 'خبز', 'جبن', 'كعكة', 'ماء', 'حليب']),
  theme('corps', '👤 جسم', ['قلب', 'يد', 'عين', 'قدم', 'فم', 'أذن']),
  theme('transports', '🚗 مواصلات', ['سيارة', 'باص', 'دراجة', 'طائرة', 'سفينة', 'قطار']),
  theme('metiers', '👨‍⚕️ مهن', ['طبيب', 'معلم', 'شرطي', 'إطفائي', 'طباخ']),
];

export const DEFAULT_THEMES: readonly Theme[] = [...QURAN_THEMES, ...CLASSIC_THEMES];

/** Mots chargés au premier lancement : un mélange du Coran qui convient à tous les jeux. */
export const DEFAULT_WORDS: readonly Word[] = [
  'شمس',
  'قمر',
  'نجم',
  'سماء',
  'ماء',
  'جبل',
  'بحر',
  'نحل',
  'نمل',
  'فيل',
  'بقرة',
  'قلم',
  'نور',
].map(text => {
  const found = QURAN_THEMES.flatMap(t => t.words).find(w => w.text === text);
  if (!found) throw new Error(`Mot par défaut introuvable : ${text}`);
  return found;
});
