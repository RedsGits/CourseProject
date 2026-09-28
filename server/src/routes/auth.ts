import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../prisma/db';
import { signToken } from '../utils/jwt';

const router = Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: 'Почта и пароль обязательны' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (existing) {
    return res.status(409).json({ error: 'Почта уже используется' });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await db.orm.public.User.create({
    email: normalizedEmail,
    password: hash,
    name: name?.trim() || null,
    role: 'USER',
  });

  const token = signToken({ id: user.id, role: user.role as 'USER' });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: 'Почта и пароль обязательны' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (!user) {
    return res.status(401).json({ error: 'Неверная почта' });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  const token = signToken({
    id: user.id,
    role: user.role as 'USER' | 'LABEL' | 'ADMIN',
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      labelName: user.labelName,
    },
  });
});

export default router;