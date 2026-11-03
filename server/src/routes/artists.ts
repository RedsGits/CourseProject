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
  res.json(artists);
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

// GET /artists/:id/tracks — через TrackArtist (включая featured)
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
    .filter((t) => trackIds.includes(t.id))
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

    // LABEL может редактировать, если у него есть хоть один трек этого артиста
    if (req.user!.role === 'LABEL') {
      const artistLinks = await db.orm.public.TrackArtist.where({ artistId: id }).all();
      if (artistLinks.length === 0) {
        return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
      }
      const trackIds = artistLinks.map((l) => l.trackId);
      const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
      const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
      if (!hasTrack) {
        return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
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

    await db.orm.public.Artist.where({ id }).delete();
    res.status(204).send();
  }
);

// POST /artists/:id/image — загрузка аватара
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
      const trackIds = artistLinks.map((l) => l.trackId);
      const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
      const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
      if (!hasTrack) {
        cleanupFile(req.file.filename);
        return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
      }
    }

    const oldImageUrl = artist.imageUrl;
    const newImageUrl = req.file.filename;

    await db.orm.public.Artist.where({ id }).update({ imageUrl: newImageUrl });
    cleanupFile(oldImageUrl);

    res.json({ imageUrl: newImageUrl });
  }
);

// POST /artists/:id/banner — загрузка баннера
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
      const trackIds = artistLinks.map((l) => l.trackId);
      const labelTracks = await db.orm.public.Track.where({ labelId: req.user!.id }).all();
      const hasTrack = labelTracks.some((t) => trackIds.includes(t.id));
      if (!hasTrack) {
        cleanupFile(req.file.filename);
        return res.status(403).json({ error: 'Нет прав: у вас нет треков этого артиста' });
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