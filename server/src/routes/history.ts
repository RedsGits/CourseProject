import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, type AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const HISTORY_LIMIT = 1000;
const DEDUP_WINDOW_SECONDS = 30;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'epochMilliseconds' in value) {
    return (value as { epochMilliseconds: number }).epochMilliseconds;
  }
  return new Date(value as string).getTime();
}

router.get('/', async (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const entries = await db.orm.public.ListeningHistory
    .where({ userId: req.user!.id })
    .all();

  entries.sort((a, b) => toMillis(b.listenedAt) - toMillis(a.listenedAt));

  const seen = new Set<number>();
  const uniqueEntries: typeof entries = [];
  for (const e of entries) {
    if (!seen.has(e.trackId)) {
      seen.add(e.trackId);
      uniqueEntries.push(e);
    }
  }

  const total = uniqueEntries.length;
  const page = uniqueEntries.slice(offset, offset + limit);

  const trackIds = page.map((e) => e.trackId);
  const allTracks = trackIds.length ? await db.orm.public.Track.all() : [];
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));

  const items = page
    .map((e) => {
      const track = trackMap.get(e.trackId);
      if (!track) return null;
      return {
        historyId: e.id,
        listenedAt: e.listenedAt,
        track,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  res.json({ total, limit, offset, items });
});

// Задел под систему рекомендаций
router.get('/stats', async (req: AuthRequest, res) => {
  const entries = await db.orm.public.ListeningHistory
    .where({ userId: req.user!.id })
    .all();

  if (entries.length === 0) {
    return res.json({
      totalPlays: 0,
      uniqueTracks: 0,
      topArtists: [],
      topGenres: [],
    });
  }

  const trackIds = [...new Set(entries.map((e) => e.trackId))];
  const allTracks = await db.orm.public.Track.all();
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));

  const artistWeight = new Map<number, number>();
  const genreWeight = new Map<string, number>();

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    const track = trackMap.get(entry.trackId);
    if (!track) continue;

    const ageDays = (now - toMillis(entry.listenedAt)) / dayMs;
    let weight = 1;
    if (ageDays <= 7) weight = 3;
    else if (ageDays <= 30) weight = 2;

    artistWeight.set(track.artistId, (artistWeight.get(track.artistId) ?? 0) + weight);
    if (track.genre) {
      genreWeight.set(track.genre, (genreWeight.get(track.genre) ?? 0) + weight);
    }
  }

  const topArtists = [...artistWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artistId, weight]) => ({ artistId, weight }));

  const topGenres = [...genreWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, weight]) => ({ genre, weight }));

  res.json({
    totalPlays: entries.length,
    uniqueTracks: trackIds.length,
    topArtists,
    topGenres,
  });
});

router.post('/:trackId', async (req: AuthRequest, res) => {
  const trackId = Number(req.params.trackId);
  if (!Number.isInteger(trackId)) {
    return res.status(400).json({ error: 'Неверный trackId' });
  }

  const track = await db.orm.public.Track.where({ id: trackId }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  const userHistory = await db.orm.public.ListeningHistory
    .where({ userId: req.user!.id })
    .all();

  userHistory.sort((a, b) => toMillis(b.listenedAt) - toMillis(a.listenedAt));

  const last = userHistory[0];
  if (last && last.trackId === trackId) {
    const diffSec = (Date.now() - toMillis(last.listenedAt)) / 1000;
    if (diffSec < DEDUP_WINDOW_SECONDS) {
      return res.status(200).json({ skipped: true });
    }
  }

    const entry = await db.transaction(async (tx) => {
    const created = await tx.orm.public.ListeningHistory.create({
        userId: req.user!.id,
        trackId,
    });

    await tx.orm.public.Track
        .where({ id: trackId })
        .update({ playCount: (track.playCount ?? 0) + 1 });

    return created;
    });

  const newCount = userHistory.length + 1;
  if (newCount > HISTORY_LIMIT) {
    const excess = newCount - HISTORY_LIMIT;
    const toDelete = userHistory.slice(-excess);
    for (const old of toDelete) {
      await db.orm.public.ListeningHistory.where({ id: old.id }).delete();
    }
  }

  res.status(201).json({
    id: entry.id,
    trackId: entry.trackId,
    listenedAt: entry.listenedAt,
  });
});

router.delete('/', async (req: AuthRequest, res) => {
  const entries = await db.orm.public.ListeningHistory
    .where({ userId: req.user!.id })
    .all();

  for (const entry of entries) {
    await db.orm.public.ListeningHistory.where({ id: entry.id }).delete();
  }

  res.status(204).send();
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const entry = await db.orm.public.ListeningHistory.where({ id }).first();
  if (!entry) {
    return res.status(404).json({ error: 'Запись не найдена' });
  }
  if (entry.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Не ваша запись' });
  }

  await db.orm.public.ListeningHistory.where({ id }).delete();
  res.status(204).send();
});

export default router;