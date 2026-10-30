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
const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
    <path d="M6.8,13l2.9,2.9q0.28,0.28 0.28,0.7q0,0.42-0.28,0.7T9,17.58q-0.42,0-0.7-0.27L3.7,12.7q-0.15-0.15-0.21-0.32T3.43,12t0.06-0.38T3.7,11.3L8.3,6.7Q8.58,6.43 9,6.43q0.43,0 0.7,0.27T9.98,7.4T9.7,8.1L6.8,11H19V8q0-0.43 0.29-0.71T20,7q0.43,0 0.71,0.29T21,8v3q0,0.82-0.59,1.41T19,13H6.8Z" />
  </svg>
);

export default function ArtistTracks() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { setTrack, current, isPlaying, togglePlay, playbackContext } = usePlayer();
  const contextId = `artist-tracks-${id}`;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Artist>(`/artists/${id}`),
      api.get<Track[]>(`/artists/${id}/tracks`)
    ])
      .then(([artistRes, tracksRes]) => {
        setArtist(artistRes.data);
        setTracks(tracksRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Загрузка...</p>;
  if (!artist) return <p className="muted">Артист не найден.</p>;

  return (
    <div className="playlist-page" style={{ paddingTop: '20px' }}>
      <header className="playlist-header" style={{ position: 'relative', zIndex: 1, marginBottom: '40px', alignItems: 'center' }}>
        
        <Link to={`/artist/${id}`} className="back-icon-btn" title="Назад к артисту">
          <IconArrowLeft />
        </Link>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <h1 className="playlist-name" style={{ fontSize: '48px' }}>
              Популярные треки {artist.name}
            </h1>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="search-tracks-list one-col">
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
                  <div className="track-row-cover">
                    {track.title[0]?.toUpperCase() ?? '♪'}
                    <div className="track-row-play-overlay">
                      {isActuallyPlaying ? <IconPause /> : <IconPlay />}
                    </div>
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
      </div>
    </div>
  );
}