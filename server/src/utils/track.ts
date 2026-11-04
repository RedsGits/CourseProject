import { db } from '../prisma/db';

export interface TrackArtistInfo {
  id: number;
  name: string;
  role: 'PRIMARY' | 'FEATURED';
  order: number;
}

export interface TrackAlbumInfo {
  id: number;
  title: string;
  coverUrl: string | null;
  type: 'SINGLE' | 'EP' | 'ALBUM';
}

function sortArtists(links: Array<{ artistId: number; role: string; order: number }>, artistMap: Map<number, { id: number; name: string }>): TrackArtistInfo[] {
  return links
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
}

function buildAlbumInfo(album: { id: number; title: string; coverUrl: string | null; type: string } | undefined): TrackAlbumInfo | null {
  if (!album) return null;
  return {
    id: album.id,
    title: album.title,
    coverUrl: album.coverUrl,
    type: album.type as 'SINGLE' | 'EP' | 'ALBUM',
  };
}

export async function withArtists<T extends { id: number; albumId: number }>(track: T) {
  const [links, album, allArtists] = await Promise.all([
    db.orm.public.TrackArtist.where({ trackId: track.id }).all(),
    db.orm.public.Album.where({ id: track.albumId }).first(),
    db.orm.public.Artist.all(),
  ]);

  const artistMap = new Map(allArtists.map((a) => [a.id, { id: a.id, name: a.name }]));
  const artists = sortArtists(links, artistMap);

  return { ...track, artists, album: buildAlbumInfo(album ?? undefined) };
}

export async function withArtistsBatch<T extends { id: number; albumId: number }>(tracks: T[]) {
  if (tracks.length === 0) return [];

  const [allLinks, allArtists, allAlbums] = await Promise.all([
    db.orm.public.TrackArtist.all(),
    db.orm.public.Artist.all(),
    db.orm.public.Album.all(),
  ]);

  const artistMap = new Map(allArtists.map((a) => [a.id, { id: a.id, name: a.name }]));
  const albumMap = new Map(allAlbums.map((a) => [a.id, a]));
  const trackIds = new Set(tracks.map((t) => t.id));

  const linksByTrack = new Map<number, typeof allLinks>();
  for (const link of allLinks) {
    if (!trackIds.has(link.trackId)) continue;
    const arr = linksByTrack.get(link.trackId) ?? [];
    arr.push(link);
    linksByTrack.set(link.trackId, arr);
  }

  return tracks.map((track) => {
    const links = linksByTrack.get(track.id) ?? [];
    const artists = sortArtists(links, artistMap);
    return { ...track, artists, album: buildAlbumInfo(albumMap.get(track.albumId)) };
  });
}

export function formatArtistLine(artists: TrackArtistInfo[]): string {
  const primary = artists.find((a) => a.role === 'PRIMARY');
  const featured = artists.filter((a) => a.role === 'FEATURED');
  if (!primary) return featured.map((a) => a.name).join(', ') || 'Unknown';
  if (featured.length === 0) return primary.name;
  return `${primary.name} feat. ${featured.map((a) => a.name).join(', ')}`;
}