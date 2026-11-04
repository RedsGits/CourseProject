import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadImage } from '../config/multer';
import { withArtistsBatch } from '../utils/track';
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

interface AlbumArtistInfo {
  id: number;
  name: string;
  role: 'PRIMARY' | 'FEATURED';
  order: number;
}

async function withAlbumArtists<T extends { id: number }>(album: T) {
  const links = await db.orm.public.AlbumArtist.where({ albumId: album.id }).all();

  if (links.length === 0) {
    return { ...album, artists: [] as AlbumArtistInfo[] };
  }

  const allArtists = await db.orm.public.Artist.all();
  const artistMap = new Map(allArtists.map((a) => [a.id, a]));

  const artists: AlbumArtistInfo[] = links
    .map((link) => {
      const artist = artistMap.get(link.artistId);
      if (!artist) return null;
      return {
        id: artist.id,
        name: artist.name,
        role: link.role as 'PRIMARY' | 'FEATURED',
        order: link.order,
      };
    })
    .filter((a): a is AlbumArtistInfo => a !== null)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'PRIMARY' ? -1 : 1;
      return a.order - b.order;
    });

  return { ...album, artists };
}

router.get('/', async (req, res) => {
  const { artistId, labelId } = req.query;

  const filters: Record<string, unknown> = {};
  if (labelId) filters.labelId = Number(labelId);

  let albums;
  if (artistId) {
    const links = await db.orm.public.AlbumArtist
      .where({ artistId: Number(artistId) })
      .all();
    const albumIds = links.map((l) => l.albumId);
    if (albumIds.length === 0) return res.json([]);
    const all = await db.orm.public.Album.where(filters).all();
    albums = all.filter((a) => albumIds.includes(a.id));
  } else {
    albums = await db.orm.public.Album.where(filters).all();
  }

  res.json(await Promise.all(albums.map(withAlbumArtists)));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const album = await db.orm.public.Album.where({ id }).first();
  if (!album) return res.status(404).json({ error: 'Альбом не найден' });

  const enriched = await withAlbumArtists(album);

  const tracks = await db.orm.public.Track.where({ albumId: id }).all();
  const sortedTracks = tracks.sort((a, b) => a.order - b.order);
  const tracksWithArtists = await withArtistsBatch(sortedTracks);

  res.json({ ...enriched, tracks: tracksWithArtists });
});

router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const { title, primaryArtistId, featuredArtistIds, year, type, labelId } = req.body as {
      title?: string;
      primaryArtistId?: number;
      featuredArtistIds?: number[];
      year?: number;
      type?: string;
      labelId?: number;
    };

    if (!title || !title.trim() || !primaryArtistId) {
      return res.status(400).json({ error: 'title и primaryArtistId обязательны' });
    }

    const albumType = (type ?? 'ALBUM').toUpperCase();
    if (!VALID_TYPES.has(albumType)) {
      return res.status(400).json({ error: 'type должен быть SINGLE, EP или ALBUM' });
    }

    const primaryArtist = await db.orm.public.Artist.where({ id: primaryArtistId }).first();
    if (!primaryArtist) return res.status(404).json({ error: 'Основной артист не найден' });

    let ownerLabelId: number;
    if (req.user!.role === 'ADMIN' && labelId) {
      ownerLabelId = Number(labelId);
      const label = await db.orm.public.User.where({ id: ownerLabelId }).first();
      if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
        return res.status(400).json({ error: 'Указанный лейбл не существует' });
      }
    } else {
      ownerLabelId = req.user!.id;
    }

    const featIds = Array.isArray(featuredArtistIds) ? featuredArtistIds : [];
    if (featIds.includes(primaryArtistId)) {
      return res.status(400).json({ error: 'Primary не может быть в featured' });
    }
    if (featIds.length > 0) {
      const allArtists = await db.orm.public.Artist.all();
      const knownIds = new Set(allArtists.map((a) => a.id));
      for (const fid of featIds) {
        if (!knownIds.has(fid)) {
          return res.status(404).json({ error: `Featured артист ${fid} не найден` });
        }
      }
    }

    const album = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Album.create({
        title: title.trim(),
        year: year ?? null,
        type: albumType as 'SINGLE' | 'EP' | 'ALBUM',
        labelId: ownerLabelId,
      });

      await tx.orm.public.AlbumArtist.create({
        albumId: created.id,
        artistId: primaryArtistId,
        role: 'PRIMARY',
        order: 0,
      });

      for (let i = 0; i < featIds.length; i++) {
        await tx.orm.public.AlbumArtist.create({
          albumId: created.id,
          artistId: featIds[i],
          role: 'FEATURED',
          order: i + 1,
        });
      }

      return created;
    });

    res.status(201).json(await withAlbumArtists(album));
  }
);

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

    const { title, year, type, featuredArtistIds, labelId } = req.body as {
      title?: string;
      year?: number | null;
      type?: string;
      featuredArtistIds?: number[];
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

    if (Object.keys(updateData).length > 0) {
      await db.orm.public.Album.where({ id }).update(updateData);
    }

    if (featuredArtistIds !== undefined) {
      if (!Array.isArray(featuredArtistIds)) {
        return res.status(400).json({ error: 'featuredArtistIds должен быть массивом' });
      }

      const albumArtists = await db.orm.public.AlbumArtist.where({ albumId: id }).all();
      const primaryLink = albumArtists.find((l) => l.role === 'PRIMARY');
      if (!primaryLink) {
        return res.status(500).json({ error: 'У альбома нет primary — база в неконсистентном состоянии' });
      }
      if (featuredArtistIds.includes(primaryLink.artistId)) {
        return res.status(400).json({ error: 'Primary не может быть в featured' });
      }

      const allArtists = await db.orm.public.Artist.all();
      const knownIds = new Set(allArtists.map((a) => a.id));
      for (const fid of featuredArtistIds) {
        if (!knownIds.has(fid)) {
          return res.status(404).json({ error: `Featured артист ${fid} не найден` });
        }
      }

      const albumTracks = await db.orm.public.Track.where({ albumId: id }).all();

      await db.transaction(async (tx) => {
        for (const link of albumArtists) {
          if (link.role === 'FEATURED') {
            await tx.orm.public.AlbumArtist.where({ id: link.id }).delete();
          }
        }

        for (let i = 0; i < featuredArtistIds.length; i++) {
          await tx.orm.public.AlbumArtist.create({
            albumId: id,
            artistId: featuredArtistIds[i],
            role: 'FEATURED',
            order: i + 1,
          });
        }

        for (const track of albumTracks) {
          const trackLinks = await tx.orm.public.TrackArtist.where({ trackId: track.id }).all();
          for (const tl of trackLinks) {
            if (tl.role === 'FEATURED') {
              await tx.orm.public.TrackArtist.where({ id: tl.id }).delete();
            }
          }
          for (let i = 0; i < featuredArtistIds.length; i++) {
            await tx.orm.public.TrackArtist.create({
              trackId: track.id,
              artistId: featuredArtistIds[i],
              role: 'FEATURED',
              order: i + 1,
            });
          }
        }
      });
    }

    const updated = await db.orm.public.Album.where({ id }).first();
    if (!updated) return res.status(500).json({ error: 'Не удалось обновить альбом' });

    res.json(await withAlbumArtists(updated));
  }
);

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

router.put(
  '/:id/reorder',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const { trackIds } = req.body as { trackIds?: number[] };

    if (!Number.isInteger(id) || !Array.isArray(trackIds)) {
      return res.status(400).json({ error: 'Неверный id или список треков' });
    }

    const album = await db.orm.public.Album.where({ id }).first();
    if (!album) return res.status(404).json({ error: 'Альбом не найден' });

    if (req.user!.role === 'LABEL' && album.labelId !== req.user!.id) {
      return res.status(403).json({ error: 'Это не ваш альбом' });
    }

    const albumTracks = await db.orm.public.Track.where({ albumId: id }).all();
    const albumTrackIds = new Set(albumTracks.map((t) => t.id));

    if (trackIds.length !== albumTrackIds.size) {
      return res.status(400).json({ error: 'Список должен содержать все треки альбома' });
    }
    for (const tid of trackIds) {
      if (!albumTrackIds.has(tid)) {
        return res.status(400).json({ error: `Трек ${tid} не принадлежит этому альбому` });
      }
    }

    await db.transaction(async (tx) => {
      for (let i = 0; i < trackIds.length; i++) {
        await tx.orm.public.Track
          .where({ id: trackIds[i] })
          .update({ order: i });
      }
    });

    res.json({ message: 'Порядок обновлён' });
  }
);

export default router;