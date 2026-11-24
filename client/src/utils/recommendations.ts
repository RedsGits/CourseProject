import type { MixPayload } from '../types';
import { genreGradient, genreLabel } from './genres';

export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = Math.abs(count) % 10;
  const mod100 = Math.abs(count) % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatDailyDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  const formatted = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function dailyHue(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 360;
}

export function dailyGradient(dateKey: string): string {
  const hue = dailyHue(dateKey);
  const hue2 = (hue + 42) % 360;
  return `linear-gradient(135deg, hsl(${hue} 40% 19%) 0%, hsl(${hue2} 34% 8%) 100%)`;
}

export function dailyPageGradient(dateKey: string): string {
  const hue = dailyHue(dateKey);
  return `linear-gradient(to bottom, hsl(${hue} 38% 18%) 0%, var(--bg) 80%)`;
}

export interface MixMeta {
  title: string;
  subtitle: string;
  gradient: string;
}

export function mixMeta(mix: MixPayload): MixMeta {
  if (mix.kind === 'daily') {
    return {
      title: 'Плейлист дня',
      subtitle: mix.date
        ? `${formatDailyDate(mix.date)} · обновляется каждый день`
        : 'Обновляется каждый день',
      gradient: dailyGradient(mix.date ?? ''),
    };
  }

  if (mix.kind === 'genre') {
    return {
      title: `${genreLabel(mix.genre)}-микс`,
      subtitle: 'Персональная подборка по жанру',
      gradient: genreGradient(mix.genre),
    };
  }

  switch (mix.id) {
    case 'for-you':
      return {
        title: 'Возможно, вам понравится',
        subtitle: 'На основе ваших любимых жанров и артистов',
        gradient: 'linear-gradient(135deg, #1c2f45 0%, #0a1219 100%)',
      };
    case 'favorite-artists':
      return {
        title: 'От ваших любимых исполнителей',
        subtitle: 'Треки от ваших любимых артистов',
        gradient: 'linear-gradient(135deg, #2f2145 0%, #120d1c 100%)',
      };
    case 'discover':
      return {
        title: 'Откройте для себя новое',
        subtitle: 'Смежные жанры',
        gradient: 'linear-gradient(135deg, #43202b 0%, #1b0d12 100%)',
      };
    default:
      return {
        title: 'Персональная подборка',
        subtitle: 'Собрано на основе ваших вкусов',
        gradient: 'linear-gradient(135deg, #26263f 0%, #101018 100%)',
      };
  }
}
