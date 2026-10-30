import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import type { Artist, Track } from '../types';

function formatPlayCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toString();
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

  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = `artist-${id}`;
  const isArtistPlaying = isPlaying && playbackContext === contextId;

  useEffect(() => {
    if (!id) { setNotFound(true); setLoading(false); return; }
    setLoading(true);
    Promise.all([ api.get<Artist>(`/artists/${id}`), api.get<Track[]>(`/artists/${id}/tracks`) ])
      .then(([artistRes, tracksRes]) => {
        setArtist(artistRes.data);
        setTracks(tracksRes.data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Загрузка...</p>;
  if (notFound || !artist) return <div className="empty-state"><h1>Ничего не найдено</h1><Link to="/" className="back-link">← На главную</Link></div>;

  const handleMainPlay = () => {
    if (isArtistPlaying) togglePlay();
    else if (tracks.length > 0) setTrack(tracks[0], tracks, contextId);
  };

  return (
    <div className="playlist-page">
      <div className="playlist-gradient-bg" style={{ background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0%, var(--bg) 80%)` }} />

      <header className="playlist-header" style={{ position: 'relative', zIndex: 1 }}>
        <div className="playlist-cover-large playlist-cover-interactive" onClick={() => setIsImageOpen(true)}>
          <img src={artist.imageUrl || '/Defpfp.png'} alt={artist.name} className="playlist-cover-img" />
        </div>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">Исполнитель</span>
            <h1 className="playlist-name" title={artist.name} style={{ fontSize: '56px' }}>
              {artist.name}
            </h1>
            {artist.country && <div className="playlist-meta" style={{ marginTop: '8px' }}><span>{artist.country}</span></div>}
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

                return (
                  <div key={track.id} className={`track-row ${isCurrent ? 'track-row-active' : ''}`} onClick={() => { if (isCurrent) togglePlay(); else setTrack(track, tracks, contextId); }}>
                    <div className="track-row-left">
                      <div className="track-row-cover">
                        {track.title[0]?.toUpperCase() ?? '♪'}
                        <div className="track-row-play-overlay">{isActuallyPlaying ? <IconPause /> : <IconPlay />}</div>
                      </div>
                      <div className="track-row-info">
                        <span className="track-row-title">{track.title}</span>
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
      </div>

      {isImageOpen && (
        <div className="cover-fullscreen-modal" onClick={() => setIsImageOpen(false)}>
          <div className="cover-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img src={artist.imageUrl || '/Defpfp.png'} alt={artist.name} className="cover-fullscreen-img" />
            <button className="close-fullscreen-btn" onClick={() => setIsImageOpen(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}