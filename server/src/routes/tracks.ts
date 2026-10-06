import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadAudio } from '../config/multer';
import { parseFile } from 'music-metadata';
import path from 'path';
import fs from 'fs'

const router = Router();

function cleanupFile(filePath: string | undefined) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Не удалось удалить файл:', filePath, err);
    }
  }
}

router.get('/', async (req, res) => {
  const { artistId, labelId, genre } = req.query;

  const filters: Record<string, unknown> = {};
  if (artistId) filters.artistId = Number(artistId);
  if (labelId) filters.labelId = Number(labelId);
  if (genre) filters.genre = String(genre);

  const tracks = await db.orm.public.Track
    .where(filters)
    .all();

  res.json(tracks);
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  res.json(track);
});

router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  uploadAudio.single('audio'),
  async (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Аудиофайл обязателен' });
    }

    const { title, artistId, albumId, genre } = req.body as {
        title?: string;
        artistId?: string;
        albumId?: string;
        genre?: string;
    };

    if (!title || !artistId) {
        cleanupFile(req.file.path);
        return res.status(400).json({ error: 'title и artistId обязательны', });
    }

    const artist = await db.orm.public.Artist.where({ id: Number(artistId) }).first();
    if (!artist) {
      cleanupFile(req.file.path);
      return res.status(404).json({ error: 'Артист не найден' });
    }

    let albumIdNum: number | null = null;
    if (albumId) {
      const album = await db.orm.public.Album.where({ id: Number(albumId) }).first();
      if (!album) {
        cleanupFile(req.file.path);
        return res.status(404).json({ error: 'Альбом не найден' });
      }
      if (album.artistId !== Number(artistId)) {
        cleanupFile(req.file.path);
        return res.status(400).json({ error: 'Альбом принадлежит другому артисту', });
      }
      albumIdNum = Number(albumId);
    }

    let durationInSeconds: number;

    try {
      const metadata = await parseFile(req.file.path, { duration: true });
      if (!metadata.format.duration) {
        throw new Error('Не удалось определить длительность');
      }

      durationInSeconds = Math.round(metadata.format.duration);
    } catch (error) {
      console.error('Ошибка парсинга аудио:', error);
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'Не удалось прочитать метаданные аудиофайла. Убедитесь, что файл не повреждён.', });
    }

    let labelId: number;
    if (req.user!.role === 'ADMIN' && req.body.labelId) {
      labelId = Number(req.body.labelId);
    } else {
      labelId = req.user!.id;
    }

    const label = await db.orm.public.User.where({ id: labelId }).first();
    if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'Указанный лейбл не существует' });
    }

    const track = await db.orm.public.Track.create({
      title: title.trim(),
      duration: durationInSeconds,
      fileUrl: path.basename(req.file.path),
      genre: genre?.trim() || null,
      artistId: Number(artistId),
      albumId: albumIdNum,
      labelId,
    });

    res.status(201).json(track);
  }
);

export default router;