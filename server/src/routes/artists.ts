import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';
import { uploadImage } from '../config/multer';
import fs from 'fs';
import path from 'path';
import { withArtistsBatch } from '../utils/track';

const router = Router();

function cleanupFile(fileName: string | null | undefined) {
  if (!fileName) return;
  const filePath = path.resolve('uploads', fileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (err) { console.error('Не удалось удалить файл:', filePath, err); }
  }
}

router.get('/', async (_req, res) => {
  const artists = await db.orm.public.Artist.all();
  const allLinks = await db.orm.public.TrackArtist.all();
  
  const counts = new Map<number, number>();
  for (const link of allLinks) {
    counts.set(link.artistId, (counts.get(link.artistId) ?? 0) + 1);
  }

  res.json(artists.map(a => ({
    ...a,
    trackCount: counts.get(a.id) ?? 0
  })));
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const artist = await db.orm.public.Artist.where({ id }).first();
  if (!artist) {
    return res.status(404).json({ error: 'Артист не найден' });
  }

  res.json(artist);
});

router.get('/:id/tracks', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const links = await db.orm.public.TrackArtist
    .where({ artistId: id })
    .all();

  if (links.length === 0) return res.json([]);

  const trackIds = links.map((l) => l.trackId);
  const allTracks = await db.orm.public.Track.all();
  const artistTracks = allTracks
    .filter((t) => trackIds.includes(t.id) && t.isPublished)
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));

  res.json(await withArtistsBatch(artistTracks));
});

router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const { name, bio, imageUrl, bannerUrl, countryCode } = req.body as {
      name?: string;
      bio?: string;
      imageUrl?: string;
      bannerUrl?: string;
      countryCode?: string;
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Необходимо ввести имя' });
    }

    const trimmed = name.trim();
    const nameNormalized = trimmed.toLowerCase();

    const existing = await db.orm.public.Artist.where({ nameNormalized }).first();
    if (existing) {
      return res.status(409).json({
        error: 'Артист с таким именем уже существует',
        existingArtistId: existing.id,
        existingArtistName: existing.name,
      });
    }

    const artist = await db.orm.public.Artist.create({
      name: trimmed,
      nameNormalized,
      bio: bio?.trim() || null,
      imageUrl: imageUrl?.trim() || null,
      bannerUrl: bannerUrl?.trim() || null,
      countryCode: countryCode?.trim().toUpperCase() || null,
      createdById: req.user!.id,
    });

    res.status(201).json(artist);
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) return res.status(404).json({ error: 'Артист не найден' });

    if (req.user!.role === 'LABEL') {
      const artistLinks = await db.orm.public.TrackArtist.where({ artistId: id }).all();
      
      if (artistLinks.length === 0) {
        if (artist.createdById !== req.user!.id) {
          return res.status(403).json({ error: 'Нет прав: вы не создатель этого артиста' });
        }
      } else {
        const trackIds = artistLinks.map((l) => l.trackId);
        const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
        const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
        if (!hasTrack) {
          return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
        }
      }
    }

    const { name, bio, imageUrl, bannerUrl, countryCode } = req.body as {
      name?: string;
      bio?: string;
      imageUrl?: string;
      bannerUrl?: string;
      countryCode?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (name && name.trim()) {
      const trimmed = name.trim();
      const nameNormalized = trimmed.toLowerCase();

      if (nameNormalized !== artist.nameNormalized) {
        const clash = await db.orm.public.Artist.where({ nameNormalized }).first();
        if (clash) {
          return res.status(409).json({
            error: 'Артист с таким именем уже существует',
            existingArtistId: clash.id,
          });
        }
      }

      updateData.name = trimmed;
      updateData.nameNormalized = nameNormalized;
    }

    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl?.trim() || null;
    if (countryCode !== undefined) updateData.countryCode = countryCode?.trim().toUpperCase() || null;

    const updated = await db.orm.public.Artist.where({ id }).update(updateData);
    if (!updated) return res.status(500).json({ error: 'Не удалось обновить артиста' });

    res.json(updated);
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) return res.status(404).json({ error: 'Артист не найден' });

    const filesToDelete: (string | null)[] = [artist.imageUrl, artist.bannerUrl];

    const albumLinks = await db.orm.public.AlbumArtist.where({ artistId: id }).all();
    const albumIds = albumLinks.map((l) => l.albumId);

    if (albumIds.length > 0) {
      const allAlbums = await db.orm.public.Album.all();
      const artistAlbums = allAlbums.filter((a) => albumIds.includes(a.id));

      for (const album of artistAlbums) {
        if (album.coverUrl) filesToDelete.push(album.coverUrl);

        const tracks = await db.orm.public.Track.where({ albumId: album.id }).all();
        for (const track of tracks) {
          if (track.fileUrl) filesToDelete.push(track.fileUrl);
          
          await db.orm.public.Track.where({ id: track.id }).delete();
        }

        await db.orm.public.Album.where({ id: album.id }).delete();
      }
    }

    for (const file of filesToDelete) {
      cleanupFile(file);
    }

    await db.orm.public.Artist.where({ id }).delete();

    res.status(204).send();
  }
);

router.post(
  '/:id/image',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  uploadImage.single('image'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !req.file) {
      return res.status(400).json({ error: 'Неверный id или файл' });
    }

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) {
      cleanupFile(req.file.filename);
      return res.status(404).json({ error: 'Артист не найден' });
    }

    if (req.user!.role === 'LABEL') {
      const artistLinks = await db.orm.public.TrackArtist.where({ artistId: id }).all();
      
      if (artistLinks.length === 0) {
        if (artist.createdById !== req.user!.id) {
          cleanupFile(req.file.filename);
          return res.status(403).json({ error: 'Нет прав: вы не создатель этого артиста' });
        }
      } else {
        const trackIds = artistLinks.map((l) => l.trackId);
        const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
        const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
        if (!hasTrack) {
          cleanupFile(req.file.filename);
          return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
        }
      }
    }

    const oldImageUrl = artist.imageUrl;
    const newImageUrl = req.file.filename;

    await db.orm.public.Artist.where({ id }).update({ imageUrl: newImageUrl });
    cleanupFile(oldImageUrl);

    res.json({ imageUrl: newImageUrl });
  }
);

router.post(
  '/:id/banner',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  uploadImage.single('banner'),
  async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !req.file) {
      return res.status(400).json({ error: 'Неверный id или файл' });
    }

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) {
      cleanupFile(req.file.filename);
      return res.status(404).json({ error: 'Артист не найден' });
    }

    if (req.user!.role === 'LABEL') {
      const artistLinks = await db.orm.public.TrackArtist.where({ artistId: id }).all();
      
      if (artistLinks.length === 0) {
        if (artist.createdById !== req.user!.id) {
          cleanupFile(req.file.filename);
          return res.status(403).json({ error: 'Нет прав: вы не создатель этого артиста' });
        }
      } else {
        const trackIds = artistLinks.map((l) => l.trackId);
        const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
        const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
        if (!hasTrack) {
          cleanupFile(req.file.filename);
          return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
        }
      }
    }

    const oldBannerUrl = artist.bannerUrl;
    const newBannerUrl = req.file.filename;

    await db.orm.public.Artist.where({ id }).update({ bannerUrl: newBannerUrl });
    cleanupFile(oldBannerUrl);

    res.json({ bannerUrl: newBannerUrl });
  }
);

export default router;