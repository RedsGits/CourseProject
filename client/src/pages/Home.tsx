import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import ScrollRow from '../components/ScrollRow';
import TrackCover from '../components/TrackCover';
import TrackList from '../components/TrackList';
import AlbumCard from '../components/AlbumCard';
import { genreLabel, genreGradient } from '../utils/genres';
import { formatDailyDate, dailyGradient, pluralRu } from '../utils/recommendations';
import type {
  Album,
  AlbumSection,
  HomeRecommendations,
  Track,
} from '../types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function sectionTitle(section: AlbumSection): string {
  switch (section.id) {
    case 'for-you':
      return 'Возможно, вам понравится';
    case 'favorite-artists':
      return 'От ваших любимых исполнителей';
    case 'discover':
      return 'Откройте для себя новое';
    default:
      return 'Для вас';
  }
}


export default function Home() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<HomeRecommendations | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [popular, setPopular] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();

  useEffect(() => {
    Promise.all([
      api.get<HomeRecommendations>('/recommendations'),
      api.get<Album[]>('/albums'),
      api.get<Track[]>('/tracks'),
    ])
      .then(([recommendationsRes, albumsRes, tracksRes]) => {
        setRecommendations(recommendationsRes.data);
        setAlbums(
          [...albumsRes.data]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5),
        );
        setPopular(
          [...tracksRes.data]
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 5),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Загрузка...</p>;

  const daily = recommendations?.daily ?? null;
  const isDailyPlaying =
    !!daily &&
    current != null &&
    playbackContext === 'mix-daily' &&
    daily.tracks.some((track) => track.id === current.id) &&
    isPlaying;

  const handleDailyPlay = () => {
    if (!daily || daily.tracks.length === 0) return;
    if (isDailyPlaying) {
      togglePlay();
    } else {
      setTrack(daily.tracks[0], daily.tracks, 'mix-daily');
    }
  };

  return (
    <div className="home-page" style={{ paddingBottom: '40px' }}>
      <header className="home-header">
        <h1>{getGreeting()}</h1>
        <p className="muted">Что послушаем сегодня?</p>
      </header>

      {recommendations && !recommendations.hasData && (
        <section className="rec-onboarding">
          <div className="rec-onboarding-text">
            <h2>Настроим ваши рекомендации?</h2>
            <p>
              Выберите любимые жанры — соберём первые подборки. Дальше система будет
              учиться на прослушиваниях, лайках и ваших плейлистах.
            </p>
          </div>
          <Link to="/recommendations" className="btn-pill rec-onboarding-btn">
            Выбрать жанры
          </Link>
        </section>
      )}

      {daily && daily.tracks.length > 0 && (
        <section className="rec-daily" style={{ background: dailyGradient(daily.date) }}>
          <div className="rec-daily-info">
            <span className="rec-daily-kicker">Плейлист дня</span>
            <h2>Собрано специально для вас</h2>
            <p className="rec-daily-meta">
              {formatDailyDate(daily.date)} · {daily.tracks.length}{' '}
              {pluralRu(daily.tracks.length, 'трек', 'трека', 'треков')}
            </p>
            <div className="rec-daily-actions">
              <button className="btn-pill" onClick={handleDailyPlay}>
                {isDailyPlaying ? 'Пауза' : 'Слушать'}
              </button>
              <Link to="/mix/daily" className="btn-pill btn-pill-ghost">
                Открыть
              </Link>
            </div>
          </div>
          <Link to="/mix/daily" className="rec-daily-covers" aria-label="Открыть плейлист дня">
            {daily.tracks.slice(0, 4).map((track) => (
              <TrackCover
                key={track.id}
                coverUrl={track.album?.coverUrl}
                alt={track.title}
                className="rec-daily-cover"
              />
            ))}
          </Link>
        </section>
      )}

      {recommendations && recommendations.favoriteArtists.length > 0 && (
        <section className="section">
          <div className="scroll-row-header">
            <div className="scroll-row-heading">
              <h2>Ваши любимые артисты</h2>
            </div>
          </div>
          <div className="rec-fav-artists">
            {recommendations.favoriteArtists.map((artist) => (
              <article key={artist.id} className="rec-fav-artist">
                <div className="rec-fav-avatar-wrap">
                  <Link to={`/artist/${artist.id}`} className="rec-fav-avatar-link">
                    <img
                      src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                      alt={artist.name}
                      className="rec-fav-avatar"
                      onError={(e) => {
                        if (!e.currentTarget.src.includes('Defpfp')) {
                          e.currentTarget.src = '/Defpfp.png';
                        }
                      }}
                    />
                  </Link>
                  <Link
                    to={`/album/${artist.albumId}`}
                    className="rec-fav-album"
                    title={`${artist.albumTitle} · ${artist.trackTitle}`}
                  >
                    <TrackCover
                      coverUrl={artist.coverUrl}
                      alt={artist.albumTitle}
                      className="rec-fav-album-cover"
                    />
                  </Link>
                </div>
                <Link to={`/artist/${artist.id}`} className="rec-fav-name">{artist.name}</Link>
                <span className="rec-fav-track">Чаще всего: {artist.trackTitle}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {recommendations?.sections.map((section) => (
        <ScrollRow
          key={section.id}
          title={sectionTitle(section)}
          onTitleClick={() => navigate(`/mix/${section.id}`)}
        >
          {section.albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </ScrollRow>
      ))}

      {recommendations && recommendations.genreMixes.length > 0 && (
        <section className="section">
          <div className="scroll-row-header">
            <div className="scroll-row-heading">
              <h2>Ваши жанры</h2>
            </div>
          </div>
          <div className="rec-genre-grid">
            {recommendations.genreMixes.map((mix) => (
              <Link
                key={mix.genre}
                to={`/mix/genre-${mix.genre}`}
                className="rec-genre-card"
                style={{ background: genreGradient(mix.genre) }}
              >
                <span className="rec-genre-name">{genreLabel(mix.genre)}</span>
                <span className="rec-genre-count">
                  {mix.trackCount} {pluralRu(mix.trackCount, 'трек', 'трека', 'треков')}
                </span>
                <span className="rec-genre-arrow">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {albums.length > 0 && (
        <ScrollRow title="Новые релизы" onTitleClick={() => navigate('/new-releases')}>
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </ScrollRow>
      )}

      {popular.length > 0 && (
        <section className="section">
          <div className="scroll-row-header">
            <div className="scroll-row-heading">
              <h2 className="clickable-title" onClick={() => navigate('/popular')}>
                Популярно сейчас
              </h2>
            </div>
          </div>
          <TrackList tracks={popular} contextId="popular-home" columns={1} />
        </section>
      )}
    </div>
  );
}
