import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { uploadImage } from '../config/multer';
import fs from 'fs';
import path from 'path';

const router = Router();

function cleanupFile(fileName: string | null | undefined) {
  if (!fileName) return;
  const filePath = path.resolve('uploads', fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Не удалось удалить файл:', filePath, err);
    }
  }
}

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const playlists = await db.orm.public.Playlist
    .where({ userId: req.user!.id })
    .all();

  res.json(playlists);
});

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
  if (!isOwner && !playlist.isPublic) {
    return res.status(404).json({ error: 'Плейлист не найден' });
  }

  const owner = await db.orm.public.User.where({ id: playlist.userId }).first();

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
    owner: owner ? { name: owner.name, email: owner.email } : null,
    tracks: playlistTracks
      .sort((a, b) => a.order - b.order)
      .map((pt) => ({
        order: pt.order,
        ...trackMap.get(pt.trackId),
      })),
  });
});

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

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
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

  await db.orm.public.Playlist.where({ id }).delete();

  cleanupFile(playlist.coverUrl);

  res.status(204).send();
});

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

  const existing = await db.orm.public.PlaylistTrack
    .where({ playlistId: id, trackId })
    .first();

  if (existing) {
    return res.status(409).json({ error: 'Трек уже в плейлисте' });
  }

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

router.post('/:id/cover', authenticate, uploadImage.single('cover'), async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || !req.file) return res.status(400).json({ error: 'Неверный id или файл' });

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) {
    cleanupFile(req.file.filename);
    return res.status(404).json({ error: 'Плейлист не найден' });
  }
  if (playlist.userId !== req.user!.id) {
    cleanupFile(req.file.filename);
    return res.status(403).json({ error: 'Нет прав' });
  }

  const oldCoverUrl = playlist.coverUrl;
  const newCoverUrl = req.file.filename;

  await db.orm.public.Playlist.where({ id }).update({ coverUrl: newCoverUrl });

  cleanupFile(oldCoverUrl);

  res.json({ coverUrl: newCoverUrl });
});

router.put('/:id/reorder', authenticate, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  const { trackIds } = req.body as { trackIds?: number[] };

  if (!Number.isInteger(id) || !Array.isArray(trackIds)) {
    return res.status(400).json({ error: 'Неверный id или список треков' });
  }

  const playlist = await db.orm.public.Playlist.where({ id }).first();
  if (!playlist) return res.status(404).json({ error: 'Плейлист не найден' });
  if (playlist.userId !== req.user!.id) return res.status(403).json({ error: 'Нет прав' });

  await db.transaction(async (tx) => {
    for (let i = 0; i < trackIds.length; i++) {
      await tx.orm.public.PlaylistTrack
        .where({ playlistId: id, trackId: trackIds[i] })
        .update({ order: i });
    }
  });

  res.json({ message: 'Порядок обновлен' });
});

export default router;