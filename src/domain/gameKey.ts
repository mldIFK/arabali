export const GAME_KEYS = ['ws', 'pz', 'sc', 'mt', 'cw', 'ls'] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export type Medal = 'gold' | 'silver' | 'bronze';

export const GAME_NAMES: Record<GameKey, string> = {
  ws: '🔍 البحث عن الكلمات',
  pz: '🧩 تركيب الحروف',
  sc: '🔤 ترتيب الحروف',
  mt: '🖼️ الربط بالصورة',
  cw: '📝 الكلمات المتقاطعة',
  ls: '🎧 الاستماع',
};

export const MEDAL_LABELS: Record<Medal, { emoji: string; name: string }> = {
  gold: { emoji: '🥇', name: 'ذهبية' },
  silver: { emoji: '🥈', name: 'فضية' },
  bronze: { emoji: '🥉', name: 'برونزية' },
};
