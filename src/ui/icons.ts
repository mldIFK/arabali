export interface IconSpec {
  bg: string;
  /** Contenu SVG (viewBox 0 0 100 100). Données statiques de confiance. */
  icon: string;
}

/** Illustrations vectorielles portées de l'application d'origine. */
export const ICONS: Readonly<Record<string, IconSpec>> = {
  كلب: { bg: '#f1e3d3', icon: `<ellipse cx="27" cy="38" rx="12" ry="20" fill="#8b5a2b" transform="rotate(-15 27 38)"/><ellipse cx="73" cy="38" rx="12" ry="20" fill="#8b5a2b" transform="rotate(15 73 38)"/><ellipse cx="50" cy="55" rx="28" ry="24" fill="#c98a4b"/><ellipse cx="50" cy="65" rx="14" ry="10" fill="#f2dcc0"/><circle cx="41" cy="50" r="4" fill="#2c3e50"/><circle cx="59" cy="50" r="4" fill="#2c3e50"/><ellipse cx="50" cy="63" rx="5" ry="4" fill="#2c3e50"/>` },
  فيل: { bg: '#e8eef2', icon: `<circle cx="26" cy="52" r="20" fill="#a9b7c0"/><circle cx="74" cy="52" r="20" fill="#a9b7c0"/><ellipse cx="50" cy="55" rx="26" ry="22" fill="#8fa0ab"/><circle cx="43" cy="48" r="3" fill="#2c3e50"/><circle cx="57" cy="48" r="3" fill="#2c3e50"/><path d="M46 60 Q40 78 48 84" stroke="#8fa0ab" stroke-width="8" fill="none" stroke-linecap="round"/>` },
  بقرة: { bg: '#fff8e6', icon: `<ellipse cx="50" cy="55" rx="30" ry="22" fill="#ffffff" stroke="#2c3e50" stroke-width="1.5"/><ellipse cx="38" cy="48" rx="8" ry="6" fill="#2c3e50"/><ellipse cx="62" cy="58" rx="9" ry="7" fill="#2c3e50"/><ellipse cx="50" cy="72" rx="12" ry="8" fill="#ffc0c0"/><ellipse cx="50" cy="74" rx="4" ry="3" fill="#e8a0a0"/><circle cx="40" cy="52" r="3" fill="#2c3e50"/><circle cx="60" cy="52" r="3" fill="#2c3e50"/>` },
  نحلة: { bg: '#fff9db', icon: `<ellipse cx="50" cy="55" rx="22" ry="18" fill="#f6c358"/><ellipse cx="50" cy="55" rx="22" ry="18" fill="none" stroke="#2c3e50" stroke-width="2"/><rect x="32" y="48" width="36" height="4" fill="#2c3e50"/><rect x="34" y="58" width="32" height="4" fill="#2c3e50"/><ellipse cx="30" cy="40" rx="12" ry="8" fill="#e8f4f8" opacity="0.8"/><ellipse cx="70" cy="40" rx="12" ry="8" fill="#e8f4f8" opacity="0.8"/><circle cx="42" cy="52" r="2.5" fill="#2c3e50"/><circle cx="58" cy="52" r="2.5" fill="#2c3e50"/>` },
  شمس: { bg: '#eaf6ff', icon: `<circle cx="50" cy="50" r="18" fill="#f6b93b"/><g stroke="#f6b93b" stroke-width="5" stroke-linecap="round"><line x1="50" y1="14" x2="50" y2="24"/><line x1="50" y1="76" x2="50" y2="86"/><line x1="14" y1="50" x2="24" y2="50"/><line x1="76" y1="50" x2="86" y2="50"/><line x1="25" y1="25" x2="32" y2="32"/><line x1="75" y1="25" x2="68" y2="32"/><line x1="25" y1="75" x2="32" y2="68"/><line x1="75" y1="75" x2="68" y2="68"/></g>` },
  قمر: { bg: '#1e2a4a', icon: `<path d="M62 18 A32 32 0 0 0 62 82 A40 40 0 0 1 62 18 Z" fill="#f4e9c9"/><circle cx="22" cy="28" r="2" fill="#fff"/><circle cx="18" cy="55" r="1.5" fill="#fff"/>` },
  نجمة: { bg: '#1e2a4a', icon: `<polygon points="50,15 61,38 87,41 67,58 73,84 50,70 27,84 33,58 13,41 39,38" fill="#f9d648"/>` },
  شجرة: { bg: '#eafaf1', icon: `<rect x="45" y="60" width="10" height="24" fill="#8b5a2b"/><circle cx="50" cy="45" r="26" fill="#4caf7d"/><circle cx="34" cy="55" r="16" fill="#3f9e6d"/><circle cx="66" cy="55" r="16" fill="#3f9e6d"/>` },
  بحر: { bg: '#e3f4fb', icon: `<path d="M10 50 Q22 40 34 50 Q46 60 58 50 Q70 40 82 50 Q92 56 90 50" stroke="#3fa9dc" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M10 66 Q22 56 34 66 Q46 76 58 66 Q70 56 82 66 Q92 72 90 66" stroke="#5dade2" stroke-width="5" fill="none" stroke-linecap="round"/>` },
  جبل: { bg: '#eef3f5', icon: `<polygon points="20,80 42,36 58,60 70,42 88,80" fill="#7f8c8d"/><polygon points="42,36 50,48 34,48" fill="#ffffff"/><polygon points="70,42 76,52 64,52" fill="#ffffff"/>` },
  مطر: { bg: '#e8eef5', icon: `<path d="M26 46 a16 16 0 0 1 4 -31.7 A22 22 0 0 1 72 30 a15 15 0 0 1 2 29.9 Z" fill="#b0c4d4"/><g stroke="#3fa9dc" stroke-width="4" stroke-linecap="round"><line x1="34" y1="62" x2="30" y2="76"/><line x1="50" y1="62" x2="46" y2="80"/><line x1="66" y1="62" x2="62" y2="76"/></g>` },
  نار: { bg: '#fdece1', icon: `<path d="M50 14 C60 34 74 40 70 58 C68 70 58 82 46 82 C30 82 20 68 24 52 C26 60 32 62 34 56 C30 44 36 30 46 24 C44 32 48 36 52 32 C56 26 54 20 50 14 Z" fill="#e67e22"/><path d="M48 50 C54 58 54 66 46 70 C40 72 36 66 38 60 C42 62 44 58 42 54 C44 52 46 50 48 50 Z" fill="#f1c40f"/>` },
  سحابة: { bg: '#e8eef5', icon: `<path d="M20 62 a14 14 0 0 1 4 -27 A20 20 0 0 1 60 34 a14 14 0 0 1 4 28 Z" fill="#b0c4d4"/><ellipse cx="50" cy="66" rx="32" ry="10" fill="#cfd8dc"/>` },
  ماء: { bg: '#e3f4fb', icon: `<path d="M50 16 C64 40 76 54 76 68 A26 26 0 0 1 24 68 C24 54 36 40 50 16 Z" fill="#3fa9dc"/>` },
  كتاب: { bg: '#e8f0fe', icon: `<path d="M50 24 C40 18 22 18 16 22 V78 C22 74 40 74 50 80 Z" fill="#3f6fd1"/><path d="M50 24 C60 18 78 18 84 22 V78 C78 74 60 74 50 80 Z" fill="#5b8def"/><line x1="50" y1="24" x2="50" y2="80" stroke="#274a92" stroke-width="2"/>` },
  قلم: { bg: '#fdf6e3', icon: `<g transform="rotate(20 50 50)"><rect x="44" y="16" width="12" height="55" rx="3" fill="#3f6fd1"/><polygon points="40,68 60,68 50,90" fill="#2c3e50"/></g>` },
  سفينة: { bg: '#e0f4f7', icon: `<polygon points="18,64 82,64 70,80 30,80" fill="#8b5a2b"/><rect x="47" y="20" width="4" height="44" fill="#5a3a1a"/><polygon points="51,22 51,50 78,50" fill="#3fa9dc"/>` },
  مصباح: { bg: '#fff9db', icon: `<circle cx="50" cy="40" r="22" fill="#f9d648"/><rect x="40" y="60" width="20" height="14" fill="#b0bec5"/><rect x="42" y="74" width="16" height="4" fill="#7f8c8d"/><rect x="42" y="80" width="16" height="4" fill="#7f8c8d"/>` },
  تاج: { bg: '#fff9db', icon: `<polygon points="14,74 86,74 82,34 64,50 50,26 36,50 18,34" fill="#f1c40f" stroke="#d4ac0d" stroke-width="2"/><circle cx="50" cy="40" r="3" fill="#e74c3c"/><circle cx="30" cy="48" r="2.5" fill="#3498db"/><circle cx="70" cy="48" r="2.5" fill="#2ecc71"/><rect x="14" y="74" width="72" height="10" fill="#d4ac0d"/>` },
  بيت: { bg: '#fff3e0', icon: `<polygon points="50,18 88,50 12,50" fill="#c0392b"/><rect x="22" y="50" width="56" height="34" fill="#e8d3ae"/><rect x="45" y="62" width="14" height="22" fill="#8b5a2b"/>` },
  باب: { bg: '#f4ece1', icon: `<rect x="30" y="14" width="40" height="72" rx="4" fill="#8b5a2b"/><circle cx="60" cy="52" r="3" fill="#f4d03f"/>` },
  كرسي: { bg: '#fdf6e3', icon: `<rect x="34" y="14" width="34" height="40" rx="4" fill="#a9702f"/><rect x="30" y="52" width="42" height="8" fill="#8b5a2b"/><rect x="34" y="60" width="6" height="26" fill="#8b5a2b"/><rect x="62" y="60" width="6" height="26" fill="#8b5a2b"/>` },
  قلب: { bg: '#fdecea', icon: `<path d="M50 82 C20 60 10 40 24 26 C34 16 48 20 50 32 C52 20 66 16 76 26 C90 40 80 60 50 82 Z" fill="#e74c3c"/>` },
  عين: { bg: '#eaf6ff', icon: `<path d="M12 50 Q50 14 88 50 Q50 86 12 50 Z" fill="#ffffff" stroke="#2c3e50" stroke-width="3"/><circle cx="50" cy="50" r="16" fill="#3fa9dc"/><circle cx="50" cy="50" r="7" fill="#1c2833"/>` },
  يد: { bg: '#fdf1ea', icon: `<path d="M35 90 V50 a6 6 0 0 1 12 0 V40 a6 6 0 0 1 12 0 V38 a6 6 0 0 1 12 0 V44 a6 6 0 0 1 12 0 V64 a26 26 0 0 1 -26 26 Z" fill="#f0b27a"/>` },
};

/** Mots coraniques (ou variantes) qui réutilisent une illustration existante. */
export const ICON_ALIASES: Readonly<Record<string, string>> = {
  نجم: 'نجمة',
  نحل: 'نحلة',
  سماء: 'سحابة',
  نور: 'مصباح',
  ليل: 'قمر',
  عرش: 'تاج',
  شجر: 'شجرة',
  رعد: 'سحابة',
  ريح: 'سحابة',
  جنة: 'شجرة',
};
