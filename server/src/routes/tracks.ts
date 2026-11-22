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
import jwt from 'jsonwebtoken';

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

router.get('/', async (req, res) => {
  const { artistId, labelId, genre } = req.query;

  const filters: Record<string, unknown> = {};
  if (labelId) filters.labelId = Number(labelId);
  if (genre) filters.genre = String(genre).toUpperCase();
  if (!labelId) filters.isPublished = true;

  let tracks;
  if (artistId) {
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

  let userRole: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { role: string };
      userRole = payload.role;
    } catch (e) {}
  }

  if (!track.isPublished && userRole !== 'LABEL' && userRole !== 'ADMIN') {
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


router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) return res.status(404).json({ error: 'Трек не найден' });

  res.json(await withArtists(track));
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

    const { title, albumId, genre } = req.body as {
      title?: string;
      albumId?: string;
      genre?: string;
    };

    const rawExplicit = req.body.isExplicit;
    const isExplicit =
      rawExplicit === true || rawExplicit === 'true' || rawExplicit === '1' || rawExplicit === 'on';

    if (!title || !albumId || !genre) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'title, albumId, genre обязательны' });
    }

    const genreUpper = genre.toUpperCase();
    if (!VALID_GENRES.has(genreUpper)) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: `Неизвестный жанр: ${genre}` });
    }

    const album = await db.orm.public.Album.where({ id: Number(albumId) }).first();
    if (!album) {
      cleanupFile(req.file.path);
      return res.status(404).json({ error: 'Альбом не найден' });
    }

    if (req.user!.role === 'LABEL' && album.labelId !== req.user!.id) {
      cleanupFile(req.file.path);
      return res.status(403).json({ error: 'Это не ваш альбом' });
    }

    const albumArtists = await db.orm.public.AlbumArtist.where({ albumId: album.id }).all();
    const primaryLink = albumArtists.find((l) => l.role === 'PRIMARY');
    if (!primaryLink) {
      cleanupFile(req.file.path);
      return res.status(400).json({ error: 'У альбома нет основного артиста' });
    }
    let featuredIds: number[] = [];
    if (req.body.featuredArtistIds) {
      try {
        featuredIds = JSON.parse(req.body.featuredArtistIds);
      } catch (e) {}
    } else {
      featuredIds = albumArtists.filter((a) => a.role === 'FEATURED').map((a) => a.artistId);
    }

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

    const labelId = album.labelId;

    const albumTracks = await db.orm.public.Track.where({ albumId: album.id }).all();
    const nextOrder = albumTracks.length > 0
      ? Math.max(...albumTracks.map((t) => t.order)) + 1
      : 0;

    const track = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Track.create({
        title: title.trim(),
        duration: durationInSeconds,
        fileUrl: path.basename(req.file!.path),
        genre: genreUpper as any,
        albumId: album.id,
        labelId,
        order: nextOrder,
        isPublished: false,
        isExplicit,
      });

      await tx.orm.public.TrackArtist.create({
        trackId: created.id,
        artistId: primaryLink.artistId,
        role: 'PRIMARY',
        order: 0,
      });

      for (let i = 0; i < featuredIds.length; i++) {
        await tx.orm.public.TrackArtist.create({
          trackId: created.id,
          artistId: featuredIds[i],
          role: 'FEATURED',
          order: i + 1,
        });
      }

      return created;
    });

    res.status(201).json(await withArtists(track));
  }
);

router.patch(
  '/:id/synced-lyrics',
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

    if (track.lyrics == null || !track.lyrics.trim()) {
      return res.status(400).json({
        error: 'Сначала подтяните plain-текст из lrclib — без него караоке невозможно',
      });
    }

    const { timings } = req.body as {
      timings?: Array<{ lineIndex: number; time: number }>;
    };

    if (!Array.isArray(timings)) {
      return res.status(400).json({ error: 'Поле timings обязательно (массив или [])' });
    }

    if (timings.length === 0) {
      const cleared = await db.orm.public.Track.where({ id }).update({ syncedLyrics: null });
      return res.json({
        lyrics: cleared?.lyrics ?? track.lyrics,
        syncedLyrics: null,
        hasLyrics: true,
        hasSyncedLyrics: false,
        found: true,
      });
    }

    const lyricLines = track.lyrics.split('\n');

    const seenIndices = new Set<number>();
    for (const t of timings) {
      if (
        typeof t.lineIndex !== 'number' ||
        typeof t.time !== 'number' ||
        !Number.isInteger(t.lineIndex) ||
        !Number.isFinite(t.time) ||
        t.time < 0
      ) {
        return res.status(400).json({ error: 'Неверный формат timings: нужны { lineIndex: int, time: number >= 0 }' });
      }
      if (t.lineIndex < 0 || t.lineIndex >= lyricLines.length) {
        return res.status(400).json({
          error: `lineIndex ${t.lineIndex} вне диапазона (в тексте ${lyricLines.length} строк)`,
        });
      }
      if (seenIndices.has(t.lineIndex)) {
        return res.status(400).json({ error: `lineIndex ${t.lineIndex} указан дважды` });
      }
      seenIndices.add(t.lineIndex);
    }

    const formatTime = (sec: number): string => {
      const totalMs = Math.round(sec * 1000);
      const m = Math.floor(totalMs / 60000);
      const s = Math.floor((totalMs % 60000) / 1000);
      const ms = totalMs % 1000;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };

    const lrcLines = timings
      .sort((a, b) => a.time - b.time)
      .map((t) => `[${formatTime(t.time)}]${lyricLines[t.lineIndex]}`);

    const syncedLyrics = lrcLines.join('\n');

    const updated = await db.orm.public.Track.where({ id }).update({ syncedLyrics });
    if (!updated) {
      return res.status(500).json({ error: 'Не удалось сохранить караоке' });
    }

    res.json({
      lyrics: updated.lyrics,
      syncedLyrics: updated.syncedLyrics,
      hasLyrics: updated.lyrics != null,
      hasSyncedLyrics: updated.syncedLyrics != null,
      found: true,
    });
  }
);

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

    const { title, genre, labelId, featuredArtistIds, isExplicit } = req.body as {
      title?: string;
      genre?: string;
      labelId?: number;
      featuredArtistIds?: number[];
      isExplicit?: boolean;
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

    if (isExplicit !== undefined) {
      updateData.isExplicit = Boolean(isExplicit);
    }

    if (labelId !== undefined && isAdmin) {
      const label = await db.orm.public.User.where({ id: labelId }).first();
      if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
        return res.status(400).json({ error: 'Указанный лейбл не существует' });
      }
      updateData.labelId = labelId;
    }

    if (featuredArtistIds !== undefined) {
      await db.transaction(async (tx) => {
        const existing = await tx.orm.public.TrackArtist.where({ trackId: id }).all();
        for (const link of existing) {
          if (link.role === 'FEATURED') {
            await tx.orm.public.TrackArtist.where({ id: link.id }).delete();
          }
        }
        for (let i = 0; i < featuredArtistIds.length; i++) {
          await tx.orm.public.TrackArtist.create({
            trackId: id,
            artistId: featuredArtistIds[i],
            role: 'FEATURED',
            order: i + 1,
          });
        }
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    await db.orm.public.Track.where({ id }).update(updateData);

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

router.post(
  '/:id/lyrics/import',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const { url } = req.body as { url?: string };

    if (!Number.isInteger(id) || !url) {
      return res.status(400).json({ error: 'Неверный id или отсутствует ссылка' });
    }

    const track = await db.orm.public.Track.where({ id }).first();
    if (!track) return res.status(404).json({ error: 'Трек не найден' });

    if (req.user!.role === 'LABEL' && track.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш трек' });
    }

    const match = url.match(/lrclib\.net\/tracks\/(\d+)/);
    if (!match) {
      return res.status(400).json({ error: 'Неверный формат ссылки. Нужна ссылка вида https://lrclib.net/tracks/12345' });
    }
    const lrclibId = match[1];

    try {
      const response = await fetch(`https://lrclib.net/api/get/${lrclibId}`, {
        headers: { 'User-Agent': 'DoeReMi/1.0.0 (https://github.com/RedsGits/CourseProject)' },
      });

      if (!response.ok) {
        return res.status(404).json({ error: 'Трек не найден в базе lrclib по этой ссылке' });
      }

      const data = await response.json();

      const lrclibTitle = (data.trackName || '').toLowerCase().trim();
      const dbTitle = track.title.toLowerCase().trim();
      
      const durationDiff = Math.abs((data.duration || 0) - track.duration);

      if (lrclibTitle !== dbTitle || durationDiff > 2) {
        return res.status(400).json({ 
          error: 'Данные не совпадают. Проверьте название и длительность.',
          lrclibData: { title: data.trackName, duration: data.duration },
          dbData: { title: track.title, duration: track.duration }
        });
      }

      const updated = await db.orm.public.Track.where({ id }).update({
        lyrics: data.plainLyrics || null,
        syncedLyrics: data.syncedLyrics || null,
      });

      if (!updated) return res.status(500).json({ error: 'Не удалось сохранить текст' });

      res.json({
        success: true,
        lyrics: updated.lyrics,
        syncedLyrics: updated.syncedLyrics,
        hasLyrics: updated.lyrics != null,
        hasSyncedLyrics: updated.syncedLyrics != null,
      });

    } catch (err: any) {
      console.error('Ошибка импорта из lrclib:', err);
      res.status(500).json({ error: 'Ошибка при обращении к lrclib' });
    }
  }
);

router.delete(
  '/:id/lyrics',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Неверный id' });
    }

    const track = await db.orm.public.Track.where({ id }).first();
    if (!track) return res.status(404).json({ error: 'Трек не найден' });

    if (req.user!.role === 'LABEL' && track.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш трек' });
    }

    const updated = await db.orm.public.Track.where({ id }).update({
      lyrics: null,
      syncedLyrics: null,
    });

    if (!updated) {
      return res.status(500).json({ error: 'Не удалось удалить текст' });
    }

    res.json({
      lyrics: null,
      syncedLyrics: null,
      hasLyrics: false,
      hasSyncedLyrics: false,
      found: false,
    });
  }
);

export default router;