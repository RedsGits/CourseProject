import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import type { Artist, Track, Album, PublicPlaylist } from '../types';
import TrackCover from '../components/TrackCover';
import ExplicitBadge from '../components/ExplicitBadge';
import PlayingBars from '../components/PlayingBars';
import { formatAlbumType } from '../api/format';
import PlaylistCard from '../components/PlaylistCard';


function formatPlayCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
}

function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) ?? null;
  } catch {
    return null;
  }
}

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

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [isBioOpen, setIsBioOpen] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<PublicPlaylist[]>([]);

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = `artist-${id}`;
  const isArtistPlaying = isPlaying && playbackContext === contextId;

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      api.get<Artist>(`/artists/${id}`),
      api.get<Track[]>(`/artists/${id}/tracks`),
      api.get<Album[]>(`/albums?artistId=${id}`),
      api.get<PublicPlaylist[]>(`/artists/${id}/playlists`).catch(() => ({ data: [] as PublicPlaylist[] })),
    ])
      .then(([artistRes, tracksRes, albumsRes, playlistsRes]) => {
        setArtist(artistRes.data);
        setTracks(tracksRes.data);
        setAlbums(albumsRes.data);
        setPublicPlaylists(playlistsRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isBioOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBioOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBioOpen]);

  if (loading) return <p className="muted">Загрузка...</p>;
  if (notFound || !artist) return <div className="empty-state"><h1>Ничего не найдено</h1><Link to="/" className="back-link">← На главную</Link></div>;

  const handleMainPlay = () => {
    if (isArtistPlaying) togglePlay();
    else if (tracks.length > 0) setTrack(tracks[0], tracks, contextId);
  };

  const country = countryName(artist.countryCode);
  const bannerStyle = artist.bannerUrl
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, var(--bg) 90%), url(http://localhost:5000/uploads/${artist.bannerUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0%, var(--bg) 80%)` };

  return (
    <div className="playlist-page">
      <div className="playlist-gradient-bg" style={bannerStyle} />

      <header className="playlist-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="playlist-cover-large playlist-cover-interactive" onClick={() => setIsImageOpen(true)}>
          <img
            src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
            alt={artist.name}
            className="playlist-cover-img"
            onError={(e) => {
              if (!e.currentTarget.src.includes('Defpfp')) {
                e.currentTarget.src = '/Defpfp.png';
              }
            }}
          />
        </div>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">Исполнитель</span>
            <h1
              className={`playlist-name${artist.bio ? ' playlist-name-clickable' : ''}`}
              title={artist.bio ? 'Открыть биографию' : artist.name}
              style={{ fontSize: '56px' }}
              onClick={() => { if (artist.bio) setIsBioOpen(true); }}
            >
              {artist.name}
            </h1>
            {((artist.countryCode && country) || artist.bio) && (
              <div className="playlist-meta" style={{ marginTop: '8px', gap: '14px' }}>
                {artist.countryCode && country && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span className={`fi fi-${artist.countryCode.toLowerCase()}`} style={{ borderRadius: '2px' }} />
                    <span>{country}</span>
                  </span>
                )}
                {artist.bio && (
                  <button className="artist-bio-btn" onClick={() => setIsBioOpen(true)}>
                    Биография
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="playlist-actions-inline">
            <button className="btn-play-large" onClick={handleMainPlay} disabled={tracks.length === 0}>
              {isArtistPlaying ? <IconPause /> : <IconPlay />}
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <section className="section" style={{ marginTop: '40px' }}>
          <Link to={`/artist/${id}/tracks`} className="clickable-title" style={{ display: 'inline-block' }}>
            <h2>Популярные треки</h2>
          </Link>
          
          {tracks.length === 0 ? (
            <p className="muted">У этого артиста пока нет треков</p>
          ) : (
            <div className="search-tracks-list one-col">
              {tracks.slice(0, 5).map((track) => {
                const isCurrent = current?.id === track.id;
                const isActuallyPlaying = isCurrent && isPlaying;

                const primary = track.artists?.find((a) => a.role === 'PRIMARY');
                const featured = track.artists?.filter((a) => a.role === 'FEATURED') ?? [];
                const allArtists = primary ? [primary, ...featured] : featured;

                return (
                  <div key={track.id} className={`track-row ${isCurrent ? 'track-row-active' : ''}`} onClick={() => { if (isCurrent) togglePlay(); else setTrack(track, tracks, contextId); }}>
                    <div className="track-row-left">
                      <TrackCover coverUrl={track.album?.coverUrl} alt={track.title}>
                        {isCurrent ? (
                          <div className="track-row-play-overlay is-now-playing">
                            <PlayingBars active={isActuallyPlaying} />
                          </div>
                        ) : (
                          <div className="track-row-play-overlay"><IconPlay /></div>
                        )}
                      </TrackCover>
                      <div className="track-row-info">
                        <span className="track-title-line">
                          <Link
                            to={`/album/${track.albumId}`}
                            className="track-title-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="track-row-title">{track.title}</span>
                          </Link>
                          {track.isExplicit && <ExplicitBadge />}
                        </span>
                        <div className="track-row-artist-line">
                          {allArtists.map((a, i) => (
                            <span key={a.id}>
                              {i > 0 && ', '}
                              <Link
                                to={`/artist/${a.id}`}
                                className="track-row-artist"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                {a.name}
                              </Link>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="track-row-right" style={{ gap: '16px' }} onPointerDown={(e) => e.stopPropagation()}>
                      <span className="track-row-meta" style={{ minWidth: '80px', textAlign: 'right' }}>
                        {track.playCount > 0 ? formatPlayCount(track.playCount) : ''}
                      </span>
                      
                      <LikeButton trackId={track.id} className="track-row-btn" />
                      <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
                      
                      <span className="track-row-meta" style={{ minWidth: '35px', textAlign: 'right' }}>
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="section" style={{ marginTop: '40px' }}>
          <h2>Музыка</h2>
          {albums.length === 0 ? (
            <p className="muted">У этого артиста пока нет релизов</p>
          ) : (
            <div className="library-grid">
              {albums.map((album) => (
                <Link key={album.id} to={`/album/${album.id}`} className="library-card">
                  <div className="library-card-cover">
                    {album.coverUrl ? (
                      <img
                        src={`http://localhost:5000/uploads/${album.coverUrl}`}
                        alt={album.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                      </svg>
                    )}
                  </div>
                  <div className="library-card-info">
                    <div className="library-card-title">{album.title}</div>
                    <div className="library-card-sub">
                      {formatAlbumType(album.type)} {album.year ? `• ${album.year}` : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {publicPlaylists.length > 0 && (
          <section className="section" style={{ marginTop: '40px' }}>
            <h2>Плейлисты с этим исполнителем</h2>
            <div className="library-grid">
              {publicPlaylists.map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </section>
        )}
      </div>

      {isImageOpen && (
        <div className="cover-fullscreen-modal" onClick={() => setIsImageOpen(false)}>
          <div className="cover-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
              alt={artist.name}
              className="cover-fullscreen-img"
              onError={(e) => {
                if (!e.currentTarget.src.includes('Defpfp')) {
                  e.currentTarget.src = '/Defpfp.png';
                }
              }}
            />
            <button className="close-fullscreen-btn" onClick={() => setIsImageOpen(false)}>✕</button>
          </div>
        </div>
      )}
      {isBioOpen && artist.bio && (
        <div className="bio-modal-overlay" onClick={() => setIsBioOpen(false)}>
          <div
            className="bio-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Биография ${artist.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="bio-modal-close" onClick={() => setIsBioOpen(false)} title="Закрыть">✕</button>

            <div className="bio-modal-header">
              <img
                src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                alt={artist.name}
                className="bio-modal-avatar"
                onError={(e) => {
                  if (!e.currentTarget.src.includes('Defpfp')) {
                    e.currentTarget.src = '/Defpfp.png';
                  }
                }}
              />
              <div>
                <span className="bio-modal-label">Биография</span>
                <h2 className="bio-modal-name">{artist.name}</h2>
                {artist.countryCode && country && (
                  <div className="bio-modal-country">
                    <span className={`fi fi-${artist.countryCode.toLowerCase()}`} />
                    <span>{country}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bio-modal-text">
              {artist.bio
                .split(/\r?\n/)
                .filter((line) => line.trim())
                .map((line, i) => <p key={i}>{line}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}