import 'dotenv/config';
import 'temporal-polyfill/global';
import 'dotenv/config';
import { db } from '../prisma/db';
import bcrypt from 'bcrypt';

async function main() {
  const email = 'admin@music.local';
  const password = 'admin123';

  // 1. Поиск существующего админа: используем .where().first()
  const exists = await db.orm.public.User.where({ email }).first();
  if (exists) {
    console.log('Админ существует:', email);
    return;
  }

  // 2. Хеширование пароля
  const hash = await bcrypt.hash(password, 10);

  // 3. Создание админа: используем .create()
  await db.orm.public.User.create({
    email,
    password: hash,
    name: 'Root Admin',
    role: 'ADMIN',
  });

  console.log('Админ создан');
  console.log('Почта: ', email);
  console.log('Пароль: ', password);
}

main()
  .catch((e) => {
    console.error('Ошибка сида:', e);
    process.exit(1);
  })
  .finally(() => db.close());