import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { GENRE_ORDER, genreLabel } from '../utils/genres';
import type { Genre, RecommendationProfile } from '../types';

const MAX_GENRES = 5;

export default function RecommendationSettings() {
  const [profile, setProfile] = useState<RecommendationProfile | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
