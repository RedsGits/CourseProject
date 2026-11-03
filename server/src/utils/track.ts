import { db } from '../prisma/db';

export interface TrackArtistInfo {
  id: number;
  name: string;
  role: 'PRIMARY' | 'FEATURED';
  order: number;
}

export async function withArtists<T extends { id: number }>(track: T) {
  const links = await db.orm.public.TrackArtist
    .where({ trackId: track.id })
    .all();

  if (links.length === 0) {
    return { ...track, artists: [] as TrackArtistInfo[] };
  }

  const allArtists = await db.orm.public.Artist.all();
  const artistMap = new Map(allArtists.map((a) => [a.id, a]));

  const artists: TrackArtistInfo[] = links
    .map((link) => {
      const artist = artistMap.get(link.artistId);
      if (!artist) return null;
      return {
        id: artist.id,
        name: artist.name,
        role: link.role as 'PRIMARY' | 'FEATURED',
        order: link.order,
      };
    })
    .filter((a): a is TrackArtistInfo => a !== null)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'PRIMARY' ? -1 : 1;
      return a.order - b.order;
    });

  return { ...track, artists };
}

export async function withArtistsBatch<T extends { id: number }>(tracks: T[]) {
  if (tracks.length === 0) return [];

  const trackIds = tracks.map((t) => t.id);
  const allLinks = await db.orm.public.TrackArtist.all();
  const allArtists = await db.orm.public.Artist.all();

  const artistMap = new Map(allArtists.map((a) => [a.id, a]));
  const linksByTrack = new Map<number, typeof allLinks>();
  for (const link of allLinks) {
    if (!trackIds.includes(link.trackId)) continue;
    const arr = linksByTrack.get(link.trackId) ?? [];
    arr.push(link);
    linksByTrack.set(link.trackId, arr);
  }

  return tracks.map((track) => {
    const links = linksByTrack.get(track.id) ?? [];
    const artists: TrackArtistInfo[] = links
      .map((link) => {
        const artist = artistMap.get(link.artistId);
        if (!artist) return null;
        return {
          id: artist.id,
          name: artist.name,
          role: link.role as 'PRIMARY' | 'FEATURED',
          order: link.order,
        };
      })
      .filter((a): a is TrackArtistInfo => a !== null)
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === 'PRIMARY' ? -1 : 1;
        return a.order - b.order;
      });

    return { ...track, artists };
  });
}

export function formatArtistLine(artists: TrackArtistInfo[]): string {
  const primary = artists.find((a) => a.role === 'PRIMARY');
  const featured = artists.filter((a) => a.role === 'FEATURED');

  if (!primary) return featured.map((a) => a.name).join(', ') || 'Unknown';
  if (featured.length === 0) return primary.name;
  return `${primary.name} feat. ${featured.map((a) => a.name).join(', ')}`;
}