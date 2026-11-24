import { Router } from 'express';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { db } from '../prisma/db';
import { signToken } from '../utils/jwt';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { uploadImage } from '../config/multer';

const router = Router();

function publicUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    labelName: user.labelName ?? null,
  };
}

function cleanupUpload(fileName: string | null | undefined) {
  if (!fileName) return;
  const base = path.basename(fileName);
  if (!base) return;
  const filePath = path.resolve('uploads', base);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Не удалось удалить файл:', filePath, err);
    }
  }
}

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
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      labelName: user.labelName ?? null,
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
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      labelName: user.labelName,
    },
  });
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await db.orm.public.User.where({ id: req.user!.id }).first();
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: publicUser(user) });
});

router.patch('/profile', authenticate, async (req: AuthRequest, res) => {
  const { name } = req.body as { name?: unknown };
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Никнейм обязателен', field: 'name' });
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return res.status(400).json({ error: 'Никнейм не должен быть короче 2 символов', field: 'name' });
  }
  if (trimmed.length > 30) {
    return res.status(400).json({ error: 'Никнейм слишком длинный', field: 'name' });
  }

  const updated = await db.orm.public.User
    .where({ id: req.user!.id })
    .update({ name: trimmed });

  if (!updated) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ user: publicUser(updated) });
});

router.patch('/password', authenticate, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Введите текущий и новый пароль' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Новый пароль не должен быть короче 6 символов', field: 'newPassword' });
  }
  if (newPassword.length > 64) {
    return res.status(400).json({ error: 'Новый пароль слишком длинный', field: 'newPassword' });
  }

  const user = await db.orm.public.User.where({ id: req.user!.id }).first();
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    return res.status(400).json({ error: 'Текущий пароль неверный', field: 'currentPassword' });
  }

  const same = await bcrypt.compare(newPassword, user.password);
  if (same) {
    return res.status(400).json({ error: 'Новый пароль совпадает с текущим', field: 'newPassword' });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.orm.public.User.where({ id: user.id }).update({ password: hash });

  res.json({ ok: true });
});

router.post(
  '/avatar',
  authenticate,
  uploadImage.single('avatar'),
  async (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл аватара не загружен' });
    }

    const user = await db.orm.public.User.where({ id: req.user!.id }).first();
    if (!user) {
      cleanupUpload(req.file.filename);
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const oldAvatar = user.avatarUrl;
    const updated = await db.orm.public.User
      .where({ id: user.id })
      .update({ avatarUrl: req.file.filename });

    if (!updated) {
      cleanupUpload(req.file.filename);
      return res.status(500).json({ error: 'Не удалось сохранить аватар' });
    }

    cleanupUpload(oldAvatar);
    res.json({ user: publicUser(updated) });
  },
);

router.delete('/avatar', authenticate, async (req: AuthRequest, res) => {
  const user = await db.orm.public.User.where({ id: req.user!.id }).first();
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const oldAvatar = user.avatarUrl;
  const updated = await db.orm.public.User
    .where({ id: user.id })
    .update({ avatarUrl: null });

  if (!updated) return res.status(500).json({ error: 'Не удалось удалить аватар' });

  cleanupUpload(oldAvatar);
  res.json({ user: publicUser(updated) });
});

export default router;