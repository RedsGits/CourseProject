import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import TrackList from '../components/TrackList';
import AlbumCard from '../components/AlbumCard';
import { dailyPageGradient, mixMeta, pluralRu } from '../utils/recommendations';
import type { MixPayload } from '../types';

const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M8,17.18V6.82Q8,6.4 8.3,6.11Q8.6,5.82 9,5.82q0.13,0 0.26,0.04T9.53,5.97l8.15,5.18q0.23,0.15 0.34,0.38q0.11,0.23 0.11,0.48t-0.11,0.47t-0.34,0.38L9.53,18.02Q9.4,18.1 9.26,18.14Q9.13,18.18 9,18.18q-0.4,0-0.7-0.29T8,17.18Z" />
  </svg>
);

const IconPause = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M16,19q-0.82,0-1.41-0.59T14,17V7q0-0.82 0.59-1.41T16,5q0.82,0 1.41,0.59Q18,6.18 18,7V17q0,0.82-0.59,1.41T16,19ZM8,19q-0.82,0-1.41-0.59T6,17V7Q6,6.18 6.59,5.59T8,5Q8.83,5 9.41,5.59Q10,6.18 10,7V17q0,0.82-0.59,1.41Q8.83,19 8,19Z" />
  </svg>
);

const IconNote = () => (
  <svg viewBox="0 0 24 24" width="96" height="96" fill="currentColor" aria-hidden="true">
    <path d="M12,3v10.55A4,4 0 1,0 14,17V7h4V3H12Z" />
  </svg>
);

export default function MixPage() {
  const { id } = useParams<{ id: string }>();
  const [mix, setMix] = useState<MixPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = `mix-${id ?? 'unknown'}`;

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    api.get<MixPayload>(`/recommendations/mix/${id}`)
      .then((res) => setMix(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Загрузка...</p>;

  if (notFound || !mix) {
    return (
      <div className="empty-state">
        <h1>Подборка не найдена</h1>
        <p className="muted">Возможно, для неё пока недостаточно данных.</p>
        <Link to="/" className="back-link">← На главную</Link>
      </div>
    );
  }

  const meta = mixMeta(mix);
  const tracks = mix.tracks ?? [];
  const albums = mix.albums ?? [];
  const isMixPlaying =
    tracks.length > 0 &&
    current != null &&
    isPlaying &&
    playbackContext === contextId &&
    tracks.some((track) => track.id === current.id);

  const handlePlay = () => {
    if (tracks.length === 0) return;
    if (isMixPlaying) togglePlay();
    else setTrack(tracks[0], tracks, contextId);
  };

  const countLabel =
    albums.length > 0
      ? `${albums.length} ${pluralRu(albums.length, 'альбом', 'альбома', 'альбомов')}`
      : `${tracks.length} ${pluralRu(tracks.length, 'трек', 'трека', 'треков')}`;

  if (mix.kind === 'daily') {
    return (
      <div className="playlist-page">
        <div
          className="playlist-gradient-bg"
          style={{ background: dailyPageGradient(mix.date ?? '') }}
        />

        <header className="playlist-header" style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="playlist-cover-large"
            style={{
              background: meta.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="mix-cover-note"><IconNote /></span>
          </div>

          <div className="playlist-header-content">
            <div className="playlist-info">
              <span className="playlist-type">Персональная подборка</span>
              <h1 className="playlist-name" style={{ fontSize: '48px' }}>{meta.title}</h1>
              <div className="playlist-meta">
                <span>{meta.subtitle}</span>
                <span>•</span>
                <span>
                  {tracks.length} {pluralRu(tracks.length, 'трек', 'трека', 'треков')}
                </span>
              </div>
            </div>

            <div className="playlist-actions-inline">
              <button className="btn-play-large" onClick={handlePlay}>
                {isMixPlaying ? <IconPause /> : <IconPlay />}
              </button>
            </div>
          </div>
        </header>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <TrackList tracks={tracks} contextId={contextId} columns={1} />
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>{meta.title}</h1>
        <p className="muted">
          {meta.subtitle} · {countLabel}
        </p>
      </header>

      {tracks.length > 0 && (
        <div className="mix-actions">
          <button className="btn-pill" onClick={handlePlay}>
            {isMixPlaying ? 'Пауза' : 'Слушать'}
          </button>
        </div>
      )}

      {albums.length > 0 ? (
        <div className="library-grid">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="empty-state">
          <p className="muted">Пока не удалось собрать подборку.</p>
          <Link to="/recommendations" className="back-link">Настроить рекомендации</Link>
        </div>
      ) : (
        <>
          {mix.kind === 'genre' && tracks.length < 5 && (
            <p className="muted rec-mix-note">
              В каталоге пока мало треков этого жанра — подборка пополнится с новыми релизами.
            </p>
          )}
          <TrackList tracks={tracks} contextId={contextId} columns={1} />
        </>
      )}
    </div>
  );
}
