import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadImage } from '../config/multer';
import fs from 'fs';
import path from 'path';

const router = Router();

const VALID_TYPES = new Set(['SINGLE', 'EP', 'ALBUM']);

function cleanupFile(fileName: string | null | undefined) {
  if (!fileName) return;
  const filePath = path.resolve('uploads', fileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (err) { console.error('Не удалось удалить файл:', filePath, err); }
  }
}

// GET /albums?artistId=X
router.get('/', async (req, res) => {
  const { artistId } = req.query;

  const filters: Record<string, unknown> = {};
  if (artistId) filters.artistId = Number(artistId);

  const albums = await db.orm.public.Album.where(filters).all();
  res.json(albums);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const album = await db.orm.public.Album.where({ id }).first();
  if (!album) return res.status(404).json({ error: 'Альбом не найден' });

  res.json(album);
});

// POST /albums — создание
router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const { title, artistId, year, type } = req.body as {
      title?: string;
      artistId?: number;
      year?: number;
      type?: string;
    };

    if (!title || !title.trim() || !artistId) {
      return res.status(400).json({ error: 'title и artistId обязательны' });
    }

    const albumType = (type ?? 'ALBUM').toUpperCase();
    if (!VALID_TYPES.has(albumType)) {
      return res.status(400).json({ error: 'type должен быть SINGLE, EP или ALBUM' });
    }

    const artist = await db.orm.public.Artist.where({ id: artistId }).first();
    if (!artist) return res.status(404).json({ error: 'Артист не найден' });

    let labelId: number;
    if (req.user!.role === 'ADMIN' && req.body.labelId) {
      labelId = Number(req.body.labelId);
    } else {
      labelId = req.user!.id;
    }

    const album = await db.orm.public.Album.create({
      title: title.trim(),
      artistId,
      year: year ?? null,
      type: albumType as 'SINGLE' | 'EP' | 'ALBUM',
      labelId,
    });

    res.status(201).json(album);
  }
);

// PATCH /albums/:id — title, year, type; ADMIN — labelId
router.patch(
  '/:id',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

    const album = await db.orm.public.Album.where({ id }).first();
    if (!album) return res.status(404).json({ error: 'Альбом не найден' });

    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAdmin && album.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш альбом' });
    }

    const { title, year, type, labelId } = req.body as {
      title?: string;
      year?: number | null;
      type?: string;
      labelId?: number;
    };

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'title не может быть пустым' });
      updateData.title = title.trim();
    }

    if (year !== undefined) updateData.year = year;

    if (type !== undefined) {
      const t = type.toUpperCase();
      if (!VALID_TYPES.has(t)) return res.status(400).json({ error: 'type должен быть SINGLE, EP или ALBUM' });
      updateData.type = t;
    }

    if (labelId !== undefined && isAdmin) {
      const label = await db.orm.public.User.where({ id: labelId }).first();
      if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
        return res.status(400).json({ error: 'Указанный лейбл не существует' });
      }
      updateData.labelId = labelId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    const updated = await db.orm.public.Album.where({ id }).update(updateData);
    if (!updated) return res.status(500).json({ error: 'Не удалось обновить альбом' });

    res.json(updated);
  }
);

// DELETE /albums/:id — только пустой альбом
router.delete(
  '/:id',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

    const album = await db.orm.public.Album.where({ id }).first();
    if (!album) return res.status(404).json({ error: 'Альбом не найден' });

    if (req.user!.role === 'LABEL' && album.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш альбом' });
    }

    // Проверка: нет треков
    const tracks = await db.orm.public.Track.where({ albumId: id }).all();
    if (tracks.length > 0) {
      return res.status(400).json({
        error: `Нельзя удалить альбом: в нём ${tracks.length} трек(ов). Сначала удалите их.`,
        trackCount: tracks.length,
      });
    }

    cleanupFile(album.coverUrl);
    await db.orm.public.Album.where({ id }).delete();

    res.status(204).send();
  }
);

// POST /albums/:id/cover — загрузка обложки
router.post(
  '/:id/cover',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  uploadImage.single('cover'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !req.file) {
      return res.status(400).json({ error: 'Неверный id или файл' });
    }

    const album = await db.orm.public.Album.where({ id }).first();
    if (!album) {
      cleanupFile(req.file.filename);
      return res.status(404).json({ error: 'Альбом не найден' });
    }

    if (req.user!.role === 'LABEL' && album.labelId !== req.user!.id) {
      cleanupFile(req.file.filename);
      return res.status(403).json({ error: 'Это не ваш альбом' });
    }

    const oldCoverUrl = album.coverUrl;
    const newCoverUrl = req.file.filename;

    await db.orm.public.Album.where({ id }).update({ coverUrl: newCoverUrl });
    cleanupFile(oldCoverUrl);

    res.json({ coverUrl: newCoverUrl });
  }
);

export default router;