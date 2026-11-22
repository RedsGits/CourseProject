import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import TrackCover from '../components/TrackCover';
import ScrollRow from '../components/ScrollRow';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import ExplicitBadge from '../components/ExplicitBadge';
import type { Track, Album, Artist } from '../types';

import { useAuth } from '../store/auth';

const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M8,17.18V6.82Q8,6.4 8.3,6.11Q8.6,5.82 9,5.82q0.13,0 0.26,0.04T9.53,5.97l8.15,5.18q0.23,0.15 0.34,0.38q0.11,0.23 0.11,0.48t-0.11,0.47t-0.34,0.38L9.53,18.02Q9.4,18.1 9.26,18.14Q9.13,18.18 9,18.18q-0.4,0-0.7-0.29T8,17.18Z" />
  </svg>
);

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export default function Home() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = 'home-page';

  useEffect(() => {
    Promise.all([
      api.get<Track[]>('/tracks'),
      api.get<Album[]>('/albums'),
      api.get<Artist[]>('/artists')
    ]).then(([tracksRes, albumsRes, artistsRes]) => {
      const sortedTracks = [...tracksRes.data].sort((a, b) => b.playCount - a.playCount).slice(0, 10);
      setTracks(sortedTracks);

      const sortedAlbums = [...albumsRes.data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 10);
      setAlbums(sortedAlbums);

      setArtists(artistsRes.data.slice(0, 10));
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Загрузка...</p>;

  return (
    <div className="home-page" style={{ paddingBottom: '40px' }}>
      <header style={{ marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '800', marginBottom: '8px' }}>
          {getGreeting()}
        </h1>
        <p className="muted">Что послушаем сегодня?</p>
      </header>

      {albums.length > 0 && (
        <ScrollRow title="Новые релизы">
          {albums.map((album) => (
            <Link key={album.id} to={`/album/${album.id}`} className="library-card">
              <TrackCover 
                coverUrl={album.coverUrl} 
                alt={album.title} 
                className="library-card-cover" 
              />
              <div className="library-card-info">
                <div className="library-card-title">{album.title}</div>
                <div className="library-card-sub">
                  {album.artists.find(a => a.role === 'PRIMARY')?.name || 'Неизвестно'}
                </div>
              </div>
            </Link>
          ))}
        </ScrollRow>
      )}

      {tracks.length > 0 && (
        <section className="section" style={{ marginTop: '40px' }}>
          <h2>Популярно сейчас</h2>
          <div className="search-tracks-list two-cols">
            {tracks.map((track) => {
              const isCurrent = current?.id === track.id;
              const isActuallyPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={track.id}
                  className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
                  onClick={() => {
                    if (isCurrent) togglePlay();
                    else setTrack(track, tracks, contextId);
                  }}
                >
                  <div className="track-row-left">
                    <TrackCover coverUrl={track.album?.coverUrl} alt={track.title}>
                      <div className="track-row-play-overlay">
                        {isActuallyPlaying ? (
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </div>
                    </TrackCover>
                    <div className="track-row-info">
                      <span className="track-title-line">
                        <span className="track-row-title">{track.title}</span>
                        {track.isExplicit && <ExplicitBadge />}
                      </span>
                      <div className="track-row-artist-line">
                        {track.artists.map((a, i) => (
                          <span key={a.id}>
                            {i > 0 && ', '}
                            <Link to={`/artist/${a.id}`} className="track-row-artist" onClick={(e) => e.stopPropagation()}>
                              {a.name}
                            </Link>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="track-row-right">
                    <LikeButton trackId={track.id} className="track-row-btn" />
                    <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
                    <span className="track-row-meta">
                      {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {artists.length > 0 && (
        <ScrollRow title="Артисты">
          {artists.map((artist) => (
            <Link key={artist.id} to={`/artist/${artist.id}`} className="library-card artist-card">
              <div className="library-card-cover">
                <img
                  src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                  alt={artist.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { if (!e.currentTarget.src.includes('Defpfp')) e.currentTarget.src = '/Defpfp.png'; }}
                />
              </div>
              <div className="library-card-info">
                <div className="library-card-title">{artist.name}</div>
              </div>
            </Link>
          ))}
        </ScrollRow>
      )}
    </div>
  );
}