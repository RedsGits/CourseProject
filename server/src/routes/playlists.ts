import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, type AuthRequest } from '../middleware/auth';

const router = Router();

// Все роуты требуют авторизации
router.use(authenticate);

// ---------------------------------------------------------------
// GET /api/playlists — мои плейлисты
// ---------------------------------------------------------------
router.get('/', async (req: AuthRequest, res) => {
  const playlists = await db.orm.public.Playlist
    .where({ userId: req.user!.id })
    .all();

  res.json(playlists);
});

// ---------------------------------------------------------------
// GET /api/playlists/:id — плейлист с треками
// ---------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  const isOwner = playlist.userId === req.user!.id;

  // Если не владелец и плейлист приватный — скрываем существование
  if (!isOwner && !playlist.isPublic) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  // Загружаем треки
  const playlistTracks = await db.orm.public.PlaylistTrack
    .where({ playlistId: id })
    .all();

  const trackIds = playlistTracks.map((pt) => pt.trackId);
  const tracks = trackIds.length
    ? await db.orm.public.Track.all()
    : [];

  const trackMap = new Map(tracks.map((t) => [t.id, t]));

  res.json({
    ...playlist,
    tracks: playlistTracks
      .sort((a, b) => a.order - b.order)
      .map((pt) => ({
        order: pt.order,
        ...trackMap.get(pt.trackId),
      })),
  });
});

// ---------------------------------------------------------------
// POST /api/playlists — создать плейлист
// ---------------------------------------------------------------
router.post('/', async (req: AuthRequest, res) => {
  const { name, isPublic } = req.body as {
    name?: string;
    isPublic?: boolean;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Имя плейлиста обязательно' });
  }

  const playlist = await db.orm.public.Playlist.create({
    name: name.trim(),
    isPublic: Boolean(isPublic),
    userId: req.user!.id,
  });

  res.status(201).json(playlist);
});

// ---------------------------------------------------------------
// PATCH /api/playlists/:id — переименовать
// ---------------------------------------------------------------
router.patch('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  if (playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Это не ваш плейлист' });
  }

  const { name, isPublic } = req.body as {
    name?: string;
    isPublic?: boolean;
  };

  const updateData: { name?: string; isPublic?: boolean } = {};

  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: 'Имя не может быть пустым' });
    }
    updateData.name = name.trim();
  }

  if (isPublic !== undefined) {
    updateData.isPublic = Boolean(isPublic);
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  const updated = await db.orm.public.Playlist
    .where({ id })
    .update(updateData);

  res.json(updated);
});

// ---------------------------------------------------------------
// DELETE /api/playlists/:id — удалить
// ---------------------------------------------------------------
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  if (playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Это не ваш плейлист' });
  }

  // PlaylistTrack удалится каскадно (onDelete: Cascade в схеме)
  await db.orm.public.Playlist.where({ id }).delete();

  res.status(204).send();
});

// ---------------------------------------------------------------
// POST /api/playlists/:id/tracks — добавить трек
// ---------------------------------------------------------------
router.post('/:id/tracks', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { trackId } = req.body as { trackId?: number };

  if (!Number.isInteger(id) || !trackId || !Number.isInteger(trackId)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  if (playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Это не ваш плейлист' });
  }

  const track = await db.orm.public.Track.where({ id: trackId }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  // Проверка на дубликат
  const existing = await db.orm.public.PlaylistTrack
    .where({ playlistId: id, trackId })
    .first();

  if (existing) {
    return res.status(409).json({ error: 'Трек уже в плейлисте' });
  }

  // Определяем следующий order
  const allLinks = await db.orm.public.PlaylistTrack
    .where({ playlistId: id })
    .all();
  const nextOrder = allLinks.length
    ? Math.max(...allLinks.map((l) => l.order)) + 1
    : 0;

  const link = await db.orm.public.PlaylistTrack.create({
    playlistId: id,
    trackId,
    order: nextOrder,
  });

  res.status(201).json(link);
});

// ---------------------------------------------------------------
// DELETE /api/playlists/:id/tracks/:trackId — убрать трек
// ---------------------------------------------------------------
router.delete('/:id/tracks/:trackId', async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const trackId = Number(req.params.trackId);

  if (!Number.isInteger(id) || !Number.isInteger(trackId)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  if (playlist.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Это не ваш плейлист' });
  }

  const link = await db.orm.public.PlaylistTrack
    .where({ playlistId: id, trackId })
    .first();

  if (!link) {
    return res.status(404).json({ error: 'Трек не найден в плейлисте' });
  }

  await db.orm.public.PlaylistTrack.where({ id: link.id }).delete();

  res.status(204).send();
});

export default router;