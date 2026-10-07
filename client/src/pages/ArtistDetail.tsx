import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import type { Artist, Track } from '../types';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { setTrack, current } = usePlayer();

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    api
      .get<Artist>(`/artists/${id}`)
      .then((r) => {
        setArtist(r.data);
        return api.get<Track[]>(`/tracks?artistId=${id}`);
      })
      .then((r) => setTracks(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="muted">Загрузка...</p>;
  }

  if (notFound || !artist) {
    return (
      <div className="empty-state">
        <h1>Ничего не найдено</h1>
        <p className="muted">Артист с таким id не существует.</p>
        <Link to="/" className="back-link">← На главную</Link>
      </div>
    );
  }

  return (
    <div className="artist-page">
      <div className="artist-banner" />

      <div className="artist-content">
        <div className="artist-header-new">
          <div className="artist-avatar">
            <img src="/Defpfp.png" alt={artist.name} />
          </div>
          <div className="artist-meta">
            <span className="artist-type">Исполнитель</span>
            <h1 className="artist-name">{artist.name}</h1>
            {artist.country && (
              <p className="artist-country">{artist.country}</p>
            )}
          </div>
        </div>

        <section className="section">
          <h2>Музыка</h2>
          {tracks.length === 0 ? (
            <p className="muted">У этого артиста пока нет треков</p>
          ) : (
            <div className="track-grid">
              {tracks.map((t) => {
                const year = new Date(t.createdAt).getFullYear();
                const type = t.albumId ? 'Альбом' : 'Сингл';
                const isActive = current?.id === t.id;

                return (
                  <button
                    key={t.id}
                    className={`track-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setTrack(t, tracks)}
                  >
                    <div className="track-card-cover">
                      <div className="track-card-cover-placeholder">
                        {t.title[0]?.toUpperCase() ?? '♪'}
                      </div>
                    </div>
                    <div className="track-card-info">
                      <div className="track-card-title">{t.title}</div>
                      <div className="track-card-meta">
                        {year} · {type}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}