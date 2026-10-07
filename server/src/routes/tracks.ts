import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadAudio } from '../config/multer';
import { parseFile } from 'music-metadata';
import path from 'path';
import fs from 'fs'
import { getAudioMimeType } from '../utils/mime';

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

router.get('/:id/stream', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  const filePath = path.resolve('uploads', track.fileUrl);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Файл трека не найден на диске' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = getAudioMimeType(track.fileUrl);

  const rangeHeader = req.headers.range;

  if (!rangeHeader) {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': mimeType, 'Accept-Ranges': 'bytes', });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ error: 'Invalid Range header' });
  }

  const startStr = match[1] ?? '';
  const endStr = match[2] ?? '';

  let start: number;
  let end: number;

  if (startStr === '' && endStr === '') {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ error: 'Invalid Range header' });
  }

  if (startStr === '') {
    const suffixLength = parseInt(endStr, 10);
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = endStr === '' ? fileSize - 1 : parseInt(endStr, 10);
  }

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start > end ||
    start >= fileSize
  ) {
    res.setHeader('Content-Range', `bytes */${fileSize}`);
    return res.status(416).json({ error: 'Requested Range Not Satisfiable' });
  }

  if (end >= fileSize) {
    end = fileSize - 1;
  }

  const chunkSize = end - start + 1;

  res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': chunkSize, 'Content-Type': mimeType, });

  const stream = fs.createReadStream(filePath, { start, end });
  stream.pipe(res);

  stream.on('error', (err) => {
    console.error('Ошибка стриминга:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка чтения файла' });
    } else {
      res.end();
    }
  });
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

router.delete(
  '/:id',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Неверный id' });
    }

    const track = await db.orm.public.Track.where({ id }).first();
    if (!track) {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    if (req.user!.role === 'LABEL' && track.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш трек' });
    }

    const filePath = path.resolve('uploads', track.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Не удалось удалить файл:', filePath, err);
      }
    }

    await db.orm.public.Track.where({ id }).delete();

    res.status(204).send();
  },
);

export default router;