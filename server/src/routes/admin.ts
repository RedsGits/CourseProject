import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../prisma/db';
import { authenticate, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.post('/labels', async (req: AuthRequest, res) => {
  const { email, password, labelName, description, website } = req.body as {
    email?: string;
    password?: string;
    labelName?: string;
    description?: string;
    website?: string;
  };

  if (!email || !password || !labelName) {
    return res.status(400).json({
      error: 'введите почту, пароль и название дистрибьютора',
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (existing) {
    return res.status(409).json({ error: 'Почта уже используется' });
  }

  const hash = await bcrypt.hash(password, 10);

  const label = await db.orm.public.User.create({
    email: normalizedEmail,
    password: hash,
    role: 'LABEL',
    labelName: labelName.trim(),
    description: description?.trim() || null,
    website: website?.trim() || null,
    verified: true,
    createdById: req.user!.id,
  });

  res.status(201).json({
    id: label.id,
    email: label.email,
    labelName: label.labelName,
    role: label.role,
    verified: label.verified,
    createdById: label.createdById,
  });
});

router.get('/labels', async (_req, res) => {
  const labels = await db.orm.public.User
    .where({ role: 'LABEL' })
    .all();

  res.json(labels.map((l) => ({
    id: l.id,
    email: l.email,
    labelName: l.labelName,
    description: l.description,
    website: l.website,
    verified: l.verified,
    createdById: l.createdById,
    createdAt: l.createdAt,
  })));
});

router.delete('/labels/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Неверный id' });
  }

  const label = await db.orm.public.User.where({ id }).first();
  if (!label || label.role !== 'LABEL') {
    return res.status(404).json({ error: 'Лейбл не найден' });
  }

  const tracks = await db.orm.public.Track.where({ labelId: id }).all();
  const albums = await db.orm.public.Album.where({ labelId: id }).all();

  if (tracks.length > 0 || albums.length > 0) {
    return res.status(400).json({
      error: `Нельзя удалить лейбл: у него ${tracks.length} трек(ов) и ${albums.length} альбом(ов). Сначала передайте или удалите их.`,
      trackCount: tracks.length,
      albumCount: albums.length,
    });
  }

  await db.orm.public.User.where({ id }).delete();
  res.status(204).send();
});

router.patch('/tracks/:id/transfer', async (req, res) => {
  const id = Number(req.params.id);
  const { labelId } = req.body as { labelId?: number };

  if (!Number.isInteger(id) || !labelId) {
    return res.status(400).json({ error: 'Неверный id или labelId' });
  }

  const track = await db.orm.public.Track.where({ id }).first();
  if (!track) return res.status(404).json({ error: 'Трек не найден' });

  const label = await db.orm.public.User.where({ id: labelId }).first();
  if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
    return res.status(400).json({ error: 'Указанный лейбл не существует' });
  }

  await db.orm.public.Track.where({ id }).update({ labelId });

  res.json({ message: 'Трек передан', trackId: id, newLabelId: labelId });
});

router.patch('/albums/:id/transfer', async (req, res) => {
  const id = Number(req.params.id);
  const { labelId } = req.body as { labelId?: number };

  if (!Number.isInteger(id) || !labelId) {
    return res.status(400).json({ error: 'Неверный id или labelId' });
  }

  const album = await db.orm.public.Album.where({ id }).first();
  if (!album) return res.status(404).json({ error: 'Альбом не найден' });

  const label = await db.orm.public.User.where({ id: labelId }).first();
  if (!label || (label.role !== 'LABEL' && label.role !== 'ADMIN')) {
    return res.status(400).json({ error: 'Указанный лейбл не существует' });
  }

  await db.transaction(async (tx) => {
    await tx.orm.public.Album.where({ id }).update({ labelId });
    const tracks = await tx.orm.public.Track.where({ albumId: id }).all();
    for (const t of tracks) {
      await tx.orm.public.Track.where({ id: t.id }).update({ labelId });
    }
  });

  res.json({ message: 'Альбом и его треки переданы', albumId: id, newLabelId: labelId });
});

export default router;