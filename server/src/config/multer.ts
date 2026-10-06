import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve('uploads');

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
    // Уникальное имя - это случайный хеш + расширение
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex');
    cb(null, `${name}${ext}`);
    },
});

export const uploadAudio = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 МБ
    },
    fileFilter: (_req, file, cb) => {
        const allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Поддерживаются только аудиофайлы'));
        }
    },
});