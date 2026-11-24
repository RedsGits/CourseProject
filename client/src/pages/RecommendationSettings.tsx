// История: группировка по дням и вывод через TrackList.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import TrackList from '../components/TrackList';
import { GENRE_ORDER, genreLabel } from '../utils/genres';
import type {
  Genre,
  HistoryFeedItem,
  HistoryFeedResponse,
  RecommendationProfile,
} from '../types';

const MAX_GENRES = 5;

interface HistoryDayGroup {
  key: string;
  label: string;
  items: HistoryFeedItem[];
}

function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function formatHistoryDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const key = localDateKey(date);
  if (key === localDateKey(now)) return 'Сегодня';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (key === localDateKey(yesterday)) return 'Вчера';

  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  };
  return date.toLocaleDateString('ru-RU', options);
}

function buildHistoryFeed(items: HistoryFeedItem[]): HistoryFeedItem[] {
  const byTrackAndDay = new Map<string, HistoryFeedItem>();

  for (const item of items) {
    const threshold = Math.min(30, item.track.duration / 2);
    const qualifies = item.completed || item.listenedSeconds >= threshold;
    if (!qualifies) continue;

    const key = `${item.track.id}:${localDateKey(item.listenedAt)}`;
    const current = byTrackAndDay.get(key);
    if (!current || new Date(item.listenedAt).getTime() > new Date(current.listenedAt).getTime()) {
      byTrackAndDay.set(key, item);
    }
  }

  return [...byTrackAndDay.values()].sort(
    (a, b) =>
      new Date(b.listenedAt).getTime() - new Date(a.listenedAt).getTime() ||
      b.historyId - a.historyId,
  );
}

function groupHistoryFeed(items: HistoryFeedItem[]): HistoryDayGroup[] {
  const groups: HistoryDayGroup[] = [];

  for (const item of items) {
    const key = localDateKey(item.listenedAt);
    const current = groups[groups.length - 1];

    if (current && current.key === key) {
      current.items.push(item);
    } else {
      groups.push({
        key,
        label: formatHistoryDayLabel(item.listenedAt),
        items: [item],
      });
    }
  }

  return groups;
}

export default function RecommendationSettings() {
  const [profile, setProfile] = useState<RecommendationProfile | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [historyFeed, setHistoryFeed] = useState<HistoryFeedItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    api.get<HistoryFeedResponse>('/history', { params: { raw: 1, limit: 1000 } })
      .then(({ data }) => setHistoryFeed(buildHistoryFeed(data.items ?? [])))
      .catch(() => setHistoryError('Не удалось загрузить историю прослушиваний'))
      .finally(() => setHistoryLoading(false));
  }, []);

  const historyGroups = useMemo(() => groupHistoryFeed(historyFeed), [historyFeed]);

  useEffect(() => {
    api.get<RecommendationProfile>('/recommendations/profile')
      .then((res) => {
        setProfile(res.data);
        setSelected(res.data.preferredGenres ?? []);
      })
      .catch(() => setError('Не удалось загрузить профиль рекомендаций'))
      .finally(() => setLoading(false));
  }, []);

  const maxScore = useMemo(() => {
    const scores = profile?.topGenres.map((item) => item.score) ?? [];
    return Math.max(1, ...scores);
  }, [profile]);

  const toggleGenre = (genre: Genre) => {
    setMessage(null);
    setError(null);

    setSelected((prev) => {
      if (prev.includes(genre)) return prev.filter((item) => item !== genre);
      if (prev.length >= MAX_GENRES) {
        setError(`Можно выбрать не больше ${MAX_GENRES} жанров`);
        return prev;
      }
      return [...prev, genre];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data } = await api.put<RecommendationProfile>('/recommendations/genres', {
        genres: selected,
      });
      setProfile(data);
      setSelected(data.preferredGenres ?? []);
      setMessage('Сохранено — подборки на главной уже обновились');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Не удалось сохранить жанры');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="muted">Загрузка...</p>;

  return (
    <div className="rec-settings-page">
      <header className="home-header">
        <h1>Рекомендации</h1>
      </header>

      <section className="rec-panel">
        <div className="rec-panel-head">
          <div>
            <h2>Любимые жанры</h2>
            <p className="muted">
              Выберите до {MAX_GENRES} жанров. Они дадут стартовые рекомендации.
            </p>
          </div>
          <span className="rec-counter">{selected.length} / {MAX_GENRES}</span>
        </div>

        <div className="genre-chip-grid">
          {GENRE_ORDER.map((genre) => (
            <button
              key={genre}
              type="button"
              className={`genre-chip ${selected.includes(genre) ? 'is-active' : ''}`}
              onClick={() => toggleGenre(genre)}
            >
              {genreLabel(genre)}
            </button>
          ))}
        </div>

        {error && <div className="error rec-message">{error}</div>}
        {message && <div className="rec-success rec-message">{message}</div>}

        <div className="rec-panel-actions">
          <button className="btn-pill" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <Link to="/" className="btn-pill btn-pill-ghost">На главную</Link>
        </div>
      </section>

      <section className="rec-panel">
        <h2>Ваш топ жанров</h2>

        {profile && profile.topGenres.length > 0 ? (
          <div className="rec-taste-list">
            {profile.topGenres.map((item) => (
              <div key={item.genre} className="rec-taste-row">
                <span className="rec-taste-name">{genreLabel(item.genre)}</span>
                <div className="rec-taste-bar">
                  <span style={{ width: `${Math.max(6, (item.score / maxScore) * 100)}%` }} />
                </div>
                <span className="rec-taste-score">{item.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">
            Пока данных мало. Послушайте несколько треков, поставьте лайки или выберите
            жанры выше — профиль появится автоматически.
          </p>
        )}

        <div className="rec-stats">
          <div className="rec-stat">
            <strong>{profile?.stats.plays ?? 0}</strong>
            <span>прослушиваний</span>
          </div>
          <div className="rec-stat">
            <strong>{profile?.stats.likes ?? 0}</strong>
            <span>лайков</span>
          </div>
          <div className="rec-stat">
            <strong>{profile?.stats.playlistTracks ?? 0}</strong>
            <span>треков в плейлистах</span>
          </div>
        </div>
      </section>

      {profile && profile.topArtists.length > 0 && (
        <section className="rec-panel">
          <h2>Любимые исполнители</h2>
          <div className="rec-artists-row">
            {profile.topArtists.slice(0, 6).map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`} className="rec-artist">
                <img
                  src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                  alt={artist.name}
                  className="rec-artist-avatar"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('Defpfp')) e.currentTarget.src = '/Defpfp.png';
                  }}
                />
                <span className="rec-artist-name">{artist.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="rec-panel">
        <div className="rec-panel-head">
          <div>
            <h2>История прослушиваний</h2>
          </div>
        </div>

        {historyLoading ? (
          <p className="muted">Загрузка истории...</p>
        ) : historyError ? (
          <p className="muted">{historyError}</p>
        ) : historyGroups.length === 0 ? (
          <p className="muted">
            Пока нет прослушиваний. Включите трек минимум на 30 секунд или половину — он появится здесь.
          </p>
        ) : (
          <div className="history-days">
            {historyGroups.map((group) => (
              <section key={group.key} className="history-day">
                <h3 className="history-day-title">{group.label}</h3>
                <TrackList
                  tracks={group.items.map((item) => item.track)}
                  contextId={`history-${group.key}`}
                  columns={1}
                />
              </section>
            ))}
          </div>
        )}
      </section>

      <section className="rec-panel rec-panel-note">
        <h2>Как работает система</h2>
        <ul className="rec-note-list">
          <li>Дослушанный до конца трек даёт жанру и артисту больше баллов, чем частичное прослушивание.</li>
          <li>Лайк значительно усиливает жанр, дизлайк - снижает.</li>
          <li>Пропуск трека (прослушано меньше 20%) уменьшает вес жанра.</li>
          <li>Треки, добавленные в ваши плейлисты, тоже влияют на подборки.</li>
          <li>Плейлист дня пересобирается каждый день, остальные подборки обновляются автоматически.</li>
        </ul>
      </section>
    </div>
  );
}
