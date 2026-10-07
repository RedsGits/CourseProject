import { Router } from 'express';
import { db } from '../prisma/db';

const router = Router();

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

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
    const matched = allTracks.filter((t) => t.title.toLowerCase().includes(q)).sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0)).slice(0, limit);
    result.tracks = matched;
  }

  if (type === 'all' || type === 'artists') {
    const allArtists = await db.orm.public.Artist.all();
    const matched = allArtists.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        a.nameNormalized.includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name)).slice(0, limit);
    result.artists = matched;
  }

  if (type === 'all' || type === 'playlists') {
    const publicPlaylists = await db.orm.public.Playlist.where({ isPublic: true }).all();
    const matched = publicPlaylists
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
    result.playlists = matched;
  }

  if (type === 'all' || type === 'albums') {
    const allAlbums = await db.orm.public.Album.all();
    const matched = allAlbums
      .filter((a) => a.title.toLowerCase().includes(q))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, limit);
    result.albums = matched;
  }

  res.json(result);
});

export default router;