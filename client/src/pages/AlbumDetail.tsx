import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import type { Album, Track, TrackArtistInfo } from '../types';
import { formatAlbumType } from '../api/format'
import { FastAverageColor } from 'fast-average-color';

interface AlbumWithTracks extends Album {
  tracks: Track[];
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

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [album, setAlbum] = useState<AlbumWithTracks | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>('var(--bg-elevated)');
  const [isImageOpen, setIsImageOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = `album-${id}`;
  const isAlbumPlaying = isPlaying && playbackContext === contextId;

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    api.get<AlbumWithTracks>(`/albums/${id}`)
      .then((r) => setAlbum(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

   const extractColor = async (img: HTMLImageElement) => {
    try {
      const fac = new FastAverageColor();
      const color = await fac.getColorAsync(img);
      setDominantColor(color.hex);
    } catch (err) {
      console.error('Ошибка извлечения цвета:', err);
    }
  };

  const handleImageLoad = () => {
    if (imgRef.current) extractColor(imgRef.current);
  };

  useEffect(() => {
    setDominantColor('var(--bg-elevated)');
    if (album?.coverUrl) {
      const timer = setTimeout(() => {
        if (imgRef.current) extractColor(imgRef.current);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [id, album?.coverUrl]);

  if (loading) return <p className="muted">Загрузка...</p>;
  if (notFound || !album) return <div className="empty-state"><h1>Альбом не найден</h1><Link to="/" className="back-link">← На главную</Link></div>;

  const handleMainPlay = () => {
    if (isAlbumPlaying) togglePlay();
    else if (album.tracks.length > 0) setTrack(album.tracks[0], album.tracks, contextId);
  };

  const primary = album.artists.find((a) => a.role === 'PRIMARY');
  const featured = album.artists.filter((a) => a.role === 'FEATURED');

  return (
    <div className="playlist-page">
      <div 
        className="playlist-gradient-bg" 
        style={{ background: `linear-gradient(to bottom, ${dominantColor} 0%, var(--bg) 80%)` }} 
      />

      <header className="playlist-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="playlist-cover-large playlist-cover-interactive" onClick={() => setIsImageOpen(true)}>
          {album.coverUrl ? (
            <img 
                ref={imgRef}
                src={`http://localhost:5000/uploads/${album.coverUrl}`} 
                alt={album.title} 
                className="playlist-cover-img" 
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
            />
          ) : (
            <svg viewBox="0 0 24 24" width="80" height="80" fill="#fff">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
            </svg>
          )}
        </div>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">{formatAlbumType(album.type)}</span>
            <h1 className="playlist-name" style={{ fontSize: '56px' }}>{album.title}</h1>
            <div className="playlist-meta">
              {primary && <Link to={`/artist/${primary.id}`} className="track-row-artist">{primary.name}</Link>}
              {featured.map((a) => (
                <span key={a.id}>
                  <span>, </span>
                  <Link to={`/artist/${a.id}`} className="track-row-artist">{a.name}</Link>
                </span>
              ))}
              {album.year && <><span>•</span><span>{album.year}</span></>}
              <span>•</span>
              <span>{album.tracks.length} треков</span>
            </div>
          </div>
          <div className="playlist-actions-inline">
            <button className="btn-play-large" onClick={handleMainPlay} disabled={album.tracks.length === 0}>
              {isAlbumPlaying ? <IconPause /> : <IconPlay />}
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="search-tracks-list one-col">
          {album.tracks.length === 0 ? (
            <p className="muted">В этом альбоме пока нет треков.</p>
          ) : (
            album.tracks.map((track, idx) => {
              const isCurrent = current?.id === track.id;
              const isActuallyPlaying = isCurrent && isPlaying;
              return (
                <div
                  key={track.id}
                  className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
                  onClick={() => { if (isCurrent) togglePlay(); else setTrack(track, album.tracks, contextId); }}
                >
                  <div className="track-row-left">
                    <div className="album-detail-track-num" style={{ width: '32px', fontSize: '15px', textAlign: 'center' }}>
                      {idx + 1}
                    </div>
                    <div className="track-row-info">
                      <span className="track-row-title">{track.title}</span>
                      <div className="track-row-artist-line">
                        {track.artists?.map((a, i) => (
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
                  <div className="track-row-right" onPointerDown={(e) => e.stopPropagation()}>
                    <LikeButton trackId={track.id} className="track-row-btn" />
                    <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
                    <span className="track-row-meta">{formatTime(track.duration)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      {isImageOpen && (
        <div className="cover-fullscreen-modal" onClick={() => setIsImageOpen(false)}>
          <div className="cover-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            {album.coverUrl ? (
              <img
                src={`http://localhost:5000/uploads/${album.coverUrl}`}
                alt={album.title}
                className="cover-fullscreen-img"
              />
            ) : (
              <div className="cover-fullscreen-placeholder">
                <svg viewBox="0 0 24 24" width="120" height="120" fill="#fff">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                </svg>
              </div>
            )}
            <button className="close-fullscreen-btn" onClick={() => setIsImageOpen(false)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}