import type { Genre } from '../types';

export const GENRE_ORDER: Genre[] = [
  'POP', 'ROCK', 'HIPHOP', 'RNB', 'RAP', 'ELECTRONIC', 'HOUSE', 'TECHNO', 'TRANCE',
  'DUBSTEP', 'DRUM_AND_BASS', 'PHONK', 'INDIE', 'ALTERNATIVE', 'METAL', 'HEAVY_METAL',
  'PUNK', 'HARDCORE', 'JAZZ', 'BLUES', 'SOUL', 'FUNK', 'DISCO', 'REGGAE', 'SKA',
  'CLASSICAL', 'ORCHESTRAL', 'OPERA', 'COUNTRY', 'FOLK', 'FOLK_ROCK', 'LATIN', 'SALSA',
  'BOSSA_NOVA', 'SAMBA', 'AFROBEAT', 'WORLD', 'CELTIC', 'K_POP', 'J_POP', 'ANIME',
  'SOUNDTRACK', 'AMBIENT', 'CHILLOUT', 'LO_FI', 'NEW_AGE', 'GOSPEL', 'SPIRITUAL',
  'GUITAR', 'PIANO', 'EXPERIMENTAL', 'SPOKEN_WORD',
];

export const GENRE_LABELS: Record<Genre, string> = {
  POP: 'Поп',
  ROCK: 'Рок',
  HIPHOP: 'Хип-хоп',
  RNB: 'R&B',
  RAP: 'Рэп',
  ELECTRONIC: 'Электроника',
  HOUSE: 'Хаус',
  TECHNO: 'Техно',
  TRANCE: 'Транс',
  DUBSTEP: 'Дабстеп',
  DRUM_AND_BASS: 'Драм-н-бейс',
  PHONK: 'Фонк',
  INDIE: 'Инди',
  ALTERNATIVE: 'Альтернатива',
  METAL: 'Метал',
  HEAVY_METAL: 'Хэви-метал',
  PUNK: 'Панк',
  HARDCORE: 'Хардкор',
  JAZZ: 'Джаз',
  BLUES: 'Блюз',
  SOUL: 'Соул',
  FUNK: 'Фанк',
  DISCO: 'Диско',
  REGGAE: 'Регги',
  SKA: 'Ска',
  CLASSICAL: 'Классика',
  ORCHESTRAL: 'Оркестровая музыка',
  OPERA: 'Опера',
  COUNTRY: 'Кантри',
  FOLK: 'Фолк',
  FOLK_ROCK: 'Фолк-рок',
  LATIN: 'Латино',
  SALSA: 'Сальса',
  BOSSA_NOVA: 'Босса-нова',
  SAMBA: 'Самба',
  AFROBEAT: 'Афробит',
  WORLD: 'Этническая музыка',
  CELTIC: 'Кельтская',
  K_POP: 'K-pop',
  J_POP: 'J-pop',
  ANIME: 'Аниме',
  SOUNDTRACK: 'Саундтрек',
  AMBIENT: 'Эмбиент',
  CHILLOUT: 'Чиллаут',
  LO_FI: 'Lo-Fi',
  NEW_AGE: 'Нью-эйдж',
  GOSPEL: 'Госпел',
  SPIRITUAL: 'Духовная музыка',
  GUITAR: 'Гитара',
  PIANO: 'Фортепиано',
  EXPERIMENTAL: 'Экспериментальная',
  SPOKEN_WORD: 'Разговорный жанр',
};

const GRADIENTS = [
  'linear-gradient(135deg, #21402f 0%, #0d1c14 100%)',
  'linear-gradient(135deg, #1c2f45 0%, #0c1622 100%)',
  'linear-gradient(135deg, #2f2145 0%, #150f24 100%)',
  'linear-gradient(135deg, #44301d 0%, #22170c 100%)',
  'linear-gradient(135deg, #43202b 0%, #200f15 100%)',
  'linear-gradient(135deg, #1f3d3d 0%, #0d1d1d 100%)',
  'linear-gradient(135deg, #3b3a1d 0%, #1c1b0c 100%)',
  'linear-gradient(135deg, #26263f 0%, #121220 100%)',
];

export function genreLabel(genre: string | null | undefined): string {
  if (!genre) return 'Музыка';
  return GENRE_LABELS[genre as Genre] ?? genre;
}

export function genreGradient(genre: string | null | undefined): string {
  const index = GENRE_ORDER.indexOf((genre ?? '') as Genre);
  return GRADIENTS[(index >= 0 ? index : 0) % GRADIENTS.length];
}
