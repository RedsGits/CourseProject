import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadAudio } from '../config/multer';
import { parseFile } from 'music-metadata';
import path from 'path';
import fs from 'fs';
import { getAudioMimeType } from '../utils/mime';
import { fetchLyricsFromLrclib } from '../services/lyrics';
import { withArtists, withArtistsBatch } from '../utils/track';

const router = Router();

function cleanupFile(filePath: string | undefined) {
  if (filePath && fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (err) { console.error('Не удалось удалить файл:', filePath, err); }
  }
}

const VALID_GENRES = new Set([
  'POP','ROCK','HIPHOP','RNB','ELECTRONIC','HOUSE','TECHNO','TRANCE','DUBSTEP','DRUM_AND_BASS',
  'RAP','JAZZ','BLUES','CLASSICAL','ORCHESTRAL','OPERA','COUNTRY','FOLK','FOLK_ROCK','INDIE',
  'ALTERNATIVE','METAL','HEAVY_METAL','PUNK','HARDCORE','REGGAE','SKA','SOUL','FUNK','DISCO',
  'LATIN','PHONK','SALSA','BOSSA_NOVA','SAMBA','AFROBEAT','K_POP','J_POP','ANIME','SOUNDTRACK',
  'AMBIENT','CHILLOUT','LO_FI','NEW_AGE','GOSPEL','SPIRITUAL','WORLD','CELTIC','GUITAR','PIANO',
  'EXPERIMENTAL','SPOKEN_WORD',
]);

// GET /tracks?artistId=&labelId=&genre=
router.get('/', async (req, res) => {
  const { artistId, labelId, genre } = req.query;

  // Базовый фильтр
  const filters: Record<string, unknown> = {};
  if (labelId) filters.labelId = Number(labelId);
  if (genre) filters.genre = String(genre).toUpperCase();

  let tracks;
  if (artistId) {
    // Через TrackArtist
    const links = await db.orm.public.TrackArtist
      .where({ artistId: Number(artistId) })
      .all();
    const trackIds = links.map((l) => l.trackId);
    if (trackIds.length === 0) return res.json([]);
    const all = await db.orm.public.Track.where(filters).all();
    tracks = all.filter((t) => trackIds.includes(t.id));
  } else {
    tracks = await db.orm.public.Track.where(filters).all();
  }

  res.json(await withArtistsBatch(tracks));
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

router.get('/:id/lyrics', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  res.json({
    lyrics: track.lyrics,
    syncedLyrics: track.syncedLyrics,
    hasLyrics: track.lyrics != null,
    hasSyncedLyrics: track.syncedLyrics != null,
    found: track.lyrics != null || track.syncedLyrics != null,
  });
});


// GET /tracks/:id — теперь с artists[]
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) return res.status(404).json({ error: 'Трек не найден' });

  res.json(await withArtists(track));
});

// POST /tracks — загрузка (primary + featured)
router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  uploadAudio.single('audio'),
  async (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Аудиофайл обязателен' });
    }

    const { title, primaryArtistId, albumId, genre } = req.body as {
      title?: string;
      primaryArtistId?: string;
      albumId?: string;
      genre?: string;
    };

    // featuredArtistIds приходит как JSON-строка в multipart
    let featuredArtistIds: number[] = [];
    if (req.body.featuredArtistIds) {
      try {
        const parsed = JSON.parse(req.body.featuredArtistIds);
        if (Array.isArray(parsed)) featuredArtistIds = parsed.map(Number).filter(Number.isInteger);
      } catch {
        cleanupFile(req.file.path);
        return res.status(400).json({ error: 'featuredArtistIds должен быть JSON-массивом' });
      }
    }

    if (!title || !primaryArtistId || !albumId || !genre) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'title, primaryArtistId, albumId, genre обязательны' });
    }

    const genreUpper = genre.toUpperCase();
    if (!VALID_GENRES.has(genreUpper)) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: `Неизвестный жанр: ${genre}` });
    }

    const primaryArtist = await db.orm.public.Artist.where({ id: Number(primaryArtistId) }).first();
    if (!primaryArtist) {
      cleanupFile(req.file.path);
      return res.status(404).json({ error: 'Основной артист не найден' });
    }

    const album = await db.orm.public.Album.where({ id: Number(albumId) }).first();
    if (!album) {
      cleanupFile(req.file.path);
      return res.status(404).json({ error: 'Альбом не найден' });
    }
    if (album.artistId !== Number(primaryArtistId)) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'Альбом принадлежит другому артисту' });
    }

    // Проверить всех featured
    if (featuredArtistIds.length > 0) {
      if (featuredArtistIds.includes(Number(primaryArtistId))) {
        cleanupFile(req.file.path);
        return res.status(400).json({ error: 'Primary не может быть в featured' });
      }
      const allArtists = await db.orm.public.Artist.all();
      const artistIds = new Set(allArtists.map((a) => a.id));
      for (const fid of featuredArtistIds) {
        if (!artistIds.has(fid)) {
          cleanupFile(req.file.path);
          return res.status(404).json({ error: `Featured артист ${fid} не найден` });
        }
      }
    }

    // Длительность
    let durationInSeconds: number;
    try {
      const metadata = await parseFile(req.file.path, { duration: true });
      if (!metadata.format.duration) throw new Error('no duration');
      durationInSeconds = Math.round(metadata.format.duration);
    } catch (error) {
      console.error('Ошибка парсинга аудио:', error);
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'Не удалось прочитать метаданные аудиофайла' });
    }

    // labelId
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

    // Транзакция: создать трек + TrackArtist
    const track = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Track.create({
        title: title.trim(),
        duration: durationInSeconds,
        fileUrl: path.basename(req.file!.path),
        genre: genreUpper as any,
        albumId: Number(albumId),
        labelId,
      });

      await tx.orm.public.TrackArtist.create({
        trackId: created.id,
        artistId: Number(primaryArtistId),
        role: 'PRIMARY',
        order: 0,
      });

      for (let i = 0; i < featuredArtistIds.length; i++) {
        await tx.orm.public.TrackArtist.create({
          trackId: created.id,
          artistId: featuredArtistIds[i],
          role: 'FEATURED',
          order: i + 1,
        });
      }

      return created;
    });

    res.status(201).json(await withArtists(track));
  }
);

// PATCH /tracks/:id — редактирование (title, genre, albumId, featured; ADMIN — labelId)
router.patch(
  '/:id',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

    const track = await db.orm.public.Track.where({ id }).first();
    if (!track) return res.status(404).json({ error: 'Трек не найден' });

    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAdmin && track.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш трек' });
    }

    const { title, genre, albumId, featuredArtistIds, labelId } = req.body as {
      title?: string;
      genre?: string;
      albumId?: number;
      featuredArtistIds?: number[];
      labelId?: number;
    };

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ error: 'Title не может быть пустым' });
      updateData.title = title.trim();
    }

    if (genre !== undefined) {
      const g = genre.toUpperCase();
      if (!VALID_GENRES.has(g)) return res.status(400).json({ error: `Неизвестный жанр: ${genre}` });
      updateData.genre = g;
    }

    if (albumId !== undefined) {
      const album = await db.orm.public.Album.where({ id: albumId }).first();
      if (!album) return res.status(404).json({ error: 'Альбом не найден' });
      updateData.albumId = albumId;
    }

    if (labelId !== undefined && isAdmin) {
      const label = await db.orm.public.User.where({ id: labelId }).first();
      if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
        return res.status(400).json({ error: 'Указанный лейбл не существует' });
      }
      updateData.labelId = labelId;
    }

    // Обновление самого трека
    if (Object.keys(updateData).length > 0) {
      await db.orm.public.Track.where({ id }).update(updateData);
    }

    // Обновление featured artists (если передано)
    if (featuredArtistIds !== undefined) {
      if (!Array.isArray(featuredArtistIds)) {
        return res.status(400).json({ error: 'featuredArtistIds должен быть массивом' });
      }

      // Удалить старые FEATURED, оставить PRIMARY
      const existing = await db.orm.public.TrackArtist.where({ trackId: id }).all();
      for (const link of existing) {
        if (link.role === 'FEATURED') {
          await db.orm.public.TrackArtist.where({ id: link.id }).delete();
        }
      }

      const primaryLink = existing.find((l) => l.role === 'PRIMARY');
      if (featuredArtistIds.includes(primaryLink?.artistId ?? -1)) {
        return res.status(400).json({ error: 'Primary не может быть в featured' });
      }

      for (let i = 0; i < featuredArtistIds.length; i++) {
        await db.orm.public.TrackArtist.create({
          trackId: id,
          artistId: featuredArtistIds[i],
          role: 'FEATURED',
          order: i + 1,
        });
      }
    }

    const updated = await db.orm.public.Track.where({ id }).first();
    res.json(await withArtists(updated!));
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

router.get('/:id/playlists', authenticate, async (req: AuthRequest, res) => {
  const trackId = Number(req.params.id);
  if (!Number.isInteger(trackId)) return res.status(400).json({ error: 'Неверный id' });

  const userPlaylists = await db.orm.public.Playlist
    .where({ userId: req.user!.id })
    .all();

  const links = await db.orm.public.PlaylistTrack
    .where({ trackId })
    .all();

  const linksMap = new Set(links.map((l) => l.playlistId));

  const result = userPlaylists.map((p) => ({
    id: p.id,
    name: p.name,
    hasTrack: linksMap.has(p.id),
  }));

  res.json(result);
});

router.post(
  '/:id/lyrics/fetch',
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

    // Берём primary artist для запроса
    const primaryLink = await db.orm.public.TrackArtist
      .where({ trackId: id, role: 'PRIMARY' })
      .first();
    if (!primaryLink) {
      return res.status(404).json({ error: 'Primary артист не найден' });
    }
    const artist = await db.orm.public.Artist.where({ id: primaryLink.artistId }).first();
    if (!artist) {
      return res.status(404).json({ error: 'Артист не найден' });
    }

    let albumName: string | null = null;
    if (track.albumId) {
      const album = await db.orm.public.Album.where({ id: track.albumId }).first();
      if (album) albumName = album.title;
    }

    try {
      const result = await fetchLyricsFromLrclib(
        track.title,
        artist.name,
        albumName,
        track.duration,
      );

      if (!result) {
        return res.json({
          lyrics: track.lyrics,
          syncedLyrics: track.syncedLyrics,
          hasLyrics: track.lyrics != null,
          hasSyncedLyrics: track.syncedLyrics != null,
          found: false,
        });
      }

      const updated = await db.orm.public.Track.where({ id }).update({
        lyrics: result.plainLyrics,
        syncedLyrics: result.syncedLyrics,
      });

      if (!updated) {
        return res.status(500).json({ error: 'Не удалось сохранить текст' });
      }

      res.json({
        lyrics: updated.lyrics,
        syncedLyrics: updated.syncedLyrics,
        hasLyrics: updated.lyrics != null,
        hasSyncedLyrics: updated.syncedLyrics != null,
        instrumental: result.instrumental,
        found: true,
      });
    } catch (err) {
      console.error('Ошибка получения текста из lrclib:', err);
      res.status(502).json({ error: 'Не удалось получить текст песни' });
    }
  }
);

export default router;