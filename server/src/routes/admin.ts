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

export default router;