import { Router } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import {
  getHomeRecommendations,
  getMix,
  getRecommendationProfile,
  savePreferredGenres,
} from '../services/recommendations';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const recommendations = await getHomeRecommendations(req.user!.id);
    res.json(recommendations);
  } catch (err) {
    console.error('Ошибка рекомендаций:', err);
    res.status(500).json({ error: 'Не удалось построить рекомендации' });
  }
});

router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const profile = await getRecommendationProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    console.error('Ошибка профиля рекомендаций:', err);
    res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
});

router.put('/genres', async (req: AuthRequest, res) => {
  const { genres } = req.body as { genres?: unknown };
  try {
    const profile = await savePreferredGenres(req.user!.id, genres);
    res.json(profile);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось сохранить жанры';
    res.status(400).json({ error: message });
  }
});

router.get('/mix/:id', async (req: AuthRequest, res) => {
  try {
    const mix = await getMix(req.user!.id, String(req.params.id));
    if (!mix) return res.status(404).json({ error: 'Подборка не найдена' });
    res.json(mix);
  } catch (err) {
    console.error('Ошибка подборки:', err);
    res.status(500).json({ error: 'Не удалось построить подборку' });
  }
});

export default router;
