import { Router } from 'express';
import { db } from '../prisma/db';
import Fuse from 'fuse.js';
import { withArtistsBatch } from '../utils/track';

const router = Router();

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const FUSE_OPTIONS = {
  includeScore: true,
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

router.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const type = String(req.query.type ?? 'all');
  const limit = Math.min(
    Number(req.query.limit) || DEFAULT_LIMIT,
    MAX_LIMIT,
  );

  if (!q) {
    return res.status(400).json({ error: 'Параметр q обязателен' });
  }

  const result: {
    query: string;
    tracks?: unknown[];
    artists?: unknown[];
    playlists?: unknown[];
    albums?: unknown[];
  } = { query: q };

  if (type === 'all' || type === 'tracks') {
    const allTracks = await db.orm.public.Track.all();
    const publishedTracks = allTracks.filter(t => t.isPublished);
    const fuse = new Fuse(publishedTracks, { ...FUSE_OPTIONS, keys: ['title', 'genre'] });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.tracks = await withArtistsBatch(matched);
  }

  if (type === 'all' || type === 'artists') {
    const allArtists = await db.orm.public.Artist.all();
    const fuse = new Fuse(allArtists, { ...FUSE_OPTIONS, keys: ['name', 'nameNormalized'] });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.artists = matched;
  }

  if (type === 'all' || type === 'playlists') {
    const publicPlaylists = await db.orm.public.Playlist.where({ isPublic: true }).all();
    const fuse = new Fuse(publicPlaylists, { ...FUSE_OPTIONS, keys: ['name'] });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);

    const [playlistLinks, users] = await Promise.all([
      db.orm.public.PlaylistTrack.all(),
      db.orm.public.User.all(),
    ]);
    const counts = new Map<number, number>();
    for (const link of playlistLinks) {
      counts.set(link.playlistId, (counts.get(link.playlistId) ?? 0) + 1);
    }
    const userMap = new Map(users.map((user) => [user.id, user]));

    result.playlists = matched.map((playlist) => {
      const owner = userMap.get(playlist.userId);
      return {
        ...playlist,
        trackCount: counts.get(playlist.id) ?? 0,
        ownerName: owner?.name ?? owner?.email ?? null,
      };
    });
  }

  if (type === 'all' || type === 'albums') {
    const allAlbums = await db.orm.public.Album.all();
    const publishedAlbums = allAlbums.filter(a => a.isPublished);
    const fuse = new Fuse(publishedAlbums, { ...FUSE_OPTIONS, keys: ['title'] });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);

    const [albumLinks, artists] = await Promise.all([
      db.orm.public.AlbumArtist.all(),
      db.orm.public.Artist.all(),
    ]);
    const artistMap = new Map(artists.map((artist) => [artist.id, artist]));
    const linksByAlbum = new Map<number, typeof albumLinks>();
    for (const link of albumLinks) {
      const list = linksByAlbum.get(link.albumId) ?? [];
      list.push(link);
      linksByAlbum.set(link.albumId, list);
    }

    result.albums = matched.map((album) => {
      const albumArtists = (linksByAlbum.get(album.id) ?? [])
        .map((link) => {
          const artist = artistMap.get(link.artistId);
          if (!artist) return null;
          return {
            id: artist.id,
            name: artist.name,
            role: link.role,
            order: link.order,
          };
        })
        .filter((artist): artist is NonNullable<typeof artist> => artist !== null)
        .sort((a, b) => {
          if (a.role !== b.role) return a.role === 'PRIMARY' ? -1 : 1;
          return a.order - b.order;
        });

      return { ...album, artists: albumArtists };
    });
  }

  res.json(result);
});

export default router;