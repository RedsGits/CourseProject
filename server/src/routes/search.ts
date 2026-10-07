import { Router } from 'express';
import { db } from '../prisma/db';
import Fuse from 'fuse.js';

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
    const fuse = new Fuse(allTracks, { ...FUSE_OPTIONS, keys: ['title', 'genre'], });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.tracks = matched;
  }

  if (type === 'all' || type === 'artists') {
    const allArtists = await db.orm.public.Artist.all();
    const fuse = new Fuse(allArtists, { ...FUSE_OPTIONS, keys: ['name', 'nameNormalized'], });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.artists = matched;
  }

  if (type === 'all' || type === 'playlists') {
    const publicPlaylists = await db.orm.public.Playlist.where({ isPublic: true }).all();
    const fuse = new Fuse(publicPlaylists, { ...FUSE_OPTIONS, keys: ['name'], });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.playlists = matched;
  }

  if (type === 'all' || type === 'albums') {
    const allAlbums = await db.orm.public.Album.all();
    const fuse = new Fuse(allAlbums, { ...FUSE_OPTIONS, keys: ['title'], });
    const matched = fuse.search(q).slice(0, limit).map((r) => r.item);
    result.albums = matched;
  }

  res.json(result);
});

export default router;