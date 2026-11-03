import type { Track, TrackArtistInfo } from '../types';

export function getPrimaryArtist(track: Track): TrackArtistInfo | null {
  return track.artists?.find((a) => a.role === 'PRIMARY') ?? null;
}

export function getFeaturedArtists(track: Track): TrackArtistInfo[] {
  return track.artists?.filter((a) => a.role === 'FEATURED') ?? [];
}

export function getArtistLine(track: Track): string {
  const primary = getPrimaryArtist(track);
  const featured = getFeaturedArtists(track);

  if (!primary && featured.length === 0) return 'Unknown';
  if (!primary) return featured.map((a) => a.name).join(', ');
  if (featured.length === 0) return primary.name;
  return `${primary.name} feat. ${featured.map((a) => a.name).join(', ')}`;
}

export function getPrimaryArtistId(track: Track): number | null {
  return getPrimaryArtist(track)?.id ?? null;
}

export function getPrimaryArtistLink(track: Track): string {
  const primary = getPrimaryArtist(track);
  return primary ? `/artist/${primary.id}` : '#';
}