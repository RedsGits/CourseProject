import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

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

router.post(
  '/',
  authenticate,
  requireRole('LABEL', 'ADMIN'),
  async (req: AuthRequest, res) => {
    const { name, bio, imageUrl, country } = req.body as {
      name?: string;
      bio?: string;
      imageUrl?: string;
      country?: string;
    };

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Необходимо ввести имя' });
    }

    const trimmed = name.trim();
    const nameNormalized = trimmed.toLowerCase();

    // Проверка уникальности
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
      country: country?.trim() || null,
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
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Проверка прав для лейбла
    if (req.user!.role === 'LABEL') {
    const result = await db.orm.public.Track.where({ artistId: id, labelId: req.user!.id }).aggregate((a) => ({ total: a.count() }));

    if (result.total === 0) {
        return res.status(403).json({
        error: 'Нет прав: у вас нет треков этого артиста',
        });
    }
    }

    const { name, bio, imageUrl, country } = req.body as {
      name?: string;
      bio?: string;
      imageUrl?: string;
      country?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (name && name.trim()) {
      const trimmed = name.trim();
      const nameNormalized = trimmed.toLowerCase();

      // Если имя меняется, проверятеся уникальность
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
    if (country !== undefined) updateData.country = country?.trim() || null;

    const updated = await db.orm.public.Artist.where({ id }).update(updateData);

    res.json(updated);
  }
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const artist = await db.orm.public.Artist.where({ id }).first();
    if (!artist) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    await db.orm.public.Artist.where({ id }).delete();
    res.status(204).send();
  }
);

export default router;