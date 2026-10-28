import { Router } from 'express';
import { db } from '../prisma/db';
import { authenticate, type AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.delete('/:trackId', async (req: AuthRequest, res) => {
  const trackId = Number(req.params.trackId);
  const userId = req.user!.id;

  if (!Number.isInteger(trackId)) {
    return res.status(400).json({ error: 'Неверный trackId' });
  }

  const existing = await db.orm.public.TrackReaction
    .where({ userId, trackId })
    .first();

  if (!existing) {
    return res.status(404).json({ error: 'Реакция не найдена' });
  }

  const track = await db.orm.public.Track.where({ id: trackId }).first();

  await db.transaction(async (tx) => {
    await tx.orm.public.TrackReaction.where({ id: existing.id }).delete();

    if (track) {
      await tx.orm.public.Track
        .where({ id: trackId })
        .update({
          likeCount: Math.max(0, (track.likeCount ?? 0) - (existing.type === 'LIKE' ? 1 : 0)),
          dislikeCount: Math.max(0, (track.dislikeCount ?? 0) - (existing.type === 'DISLIKE' ? 1 : 0)),
        });
    }
  });

  res.status(204).send();
});

router.get('/me', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const type = req.query.type === 'DISLIKE' ? 'DISLIKE' : 'LIKE'; // по умолчанию LIKE

  const reactions = await db.orm.public.TrackReaction
    .where({ userId, type })
    .all();

  if (reactions.length === 0) {
    return res.json([]);
  }

  const trackIds = reactions.map((r) => r.trackId);
  const allTracks = await db.orm.public.Track.all();
  const trackMap = new Map(allTracks.map((t) => [t.id, t]));

  reactions.sort((a, b) => {
    const ta = (a.createdAt as any).epochMilliseconds || new Date(a.createdAt as any).getTime();
    const tb = (b.createdAt as any).epochMilliseconds || new Date(b.createdAt as any).getTime();
    return tb - ta;
  });

  const result = reactions
    .map((r) => trackMap.get(r.trackId))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  res.json(result);
});

router.get('/:trackId', async (req: AuthRequest, res) => {
  const trackId = Number(req.params.trackId);
  if (!Number.isInteger(trackId)) {
    return res.status(400).json({ error: 'Неверный trackId' });
  }

  const reaction = await db.orm.public.TrackReaction
    .where({ userId: req.user!.id, trackId })
    .first();

  res.json(reaction ? { type: reaction.type } : null);
});

router.post('/:trackId', async (req: AuthRequest, res) => {
  const trackId = Number(req.params.trackId);
  const { type } = req.body as { type?: 'LIKE' | 'DISLIKE' };
  const userId = req.user!.id;

  if (!Number.isInteger(trackId) || !type || !['LIKE', 'DISLIKE'].includes(type)) {
    return res.status(400).json({ error: 'Неверный trackId или type' });
  }

  const track = await db.orm.public.Track.where({ id: trackId }).first();
  if (!track) {
    return res.status(404).json({ error: 'Трек не найден' });
  }

  const existing = await db.orm.public.TrackReaction
    .where({ userId, trackId })
    .first();

  if (existing) {
    if (existing.type === type) {
      return res.status(200).json({ message: 'Реакция уже стоит', type });
    }

    await db.transaction(async (tx) => {
      await tx.orm.public.TrackReaction
        .where({ id: existing.id })
        .update({ type });

      const likeDelta = type === 'LIKE' ? 1 : -1;
      const dislikeDelta = type === 'DISLIKE' ? 1 : -1;

      await tx.orm.public.Track
        .where({ id: trackId })
        .update({
          likeCount: (track.likeCount ?? 0) + likeDelta,
          dislikeCount: (track.dislikeCount ?? 0) + dislikeDelta,
        });
    });

    return res.status(200).json({ message: 'Реакция изменена', type });
  }

  await db.transaction(async (tx) => {
    await tx.orm.public.TrackReaction.create({
      userId,
      trackId,
      type,
    });

    await tx.orm.public.Track
      .where({ id: trackId })
      .update({
        likeCount: (track.likeCount ?? 0) + (type === 'LIKE' ? 1 : 0),
        dislikeCount: (track.dislikeCount ?? 0) + (type === 'DISLIKE' ? 1 : 0),
      });
  });

  res.status(201).json({ message: 'Реакция добавлена', type });
});

export default router;