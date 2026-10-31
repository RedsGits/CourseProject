import { Router } from 'express';
import { db } from '../prisma/db';

const router = Router();

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  const album = await db.orm.public.Album.where({ id }).first();
  if (!album) return res.status(404).json({ error: 'Альбом не найден' });

  res.json(album);
});

export default router;