import type { AlbumType } from '../types';

export function formatAlbumType(type: AlbumType): string {
  switch (type) {
    case 'ALBUM':
      return 'Альбом';
    case 'SINGLE':
      return 'Сингл';
    case 'EP':
      return 'EP';
    default:
      return type;
  }
}