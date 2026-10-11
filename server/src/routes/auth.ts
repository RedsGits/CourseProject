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
    return res.status(400).json({ error: 'Email и пароль обязательны', field: null, });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.trim())) {
    return res.status(400).json({ error: 'Некорректный email', field: 'email', });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль не должен быть короче 6 символов', field: 'password', });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Имя обязательно', field: 'name', });
  }

  if (email.length > 100) {
    return res.status(400).json({ error: 'Email слишком длинный', field: 'email' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Имя не должно быть короче 2 символов', field: 'name' });
  }

  if (name.trim().length > 30) {
    return res.status(400).json({ error: 'Имя слишком длинное', field: 'name' });
  }

  if (password.length > 64) {
    return res.status(400).json({ error: 'Пароль слишком длинный', field: 'password' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (existing) {
    return res.status(409).json({ error: 'Эта почта уже используется', field: 'email', });
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
    return res.status(400).json({ error: 'Email и пароль обязательны', field: null, });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await db.orm.public.User
    .where({ email: normalizedEmail })
    .first();

  if (!user) {
    return res.status(401).json({ error: 'Пользователь с такой почтой не найден', field: 'email', });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный пароль', field: 'password', });
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