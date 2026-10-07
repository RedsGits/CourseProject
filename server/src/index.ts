import 'temporal-polyfill/global'
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import artistRoutes from './routes/artists';
import trackRoutes from './routes/tracks';
import playlistRoutes from './routes/playlists';
import historyRoutes from './routes/history';
import searchRoutes from './routes/search';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/search', searchRoutes);

app.listen(PORT, () => {
  console.log(`Сервер работает на http://localhost:${PORT}`);
});