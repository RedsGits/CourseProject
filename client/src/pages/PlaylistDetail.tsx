import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import type { Track } from '../types';

interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
  userId: number;
  tracks?: Track[];
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { setTrack, current, isPlaying, togglePlay } = usePlayer();
  const navigate = useNavigate();
  
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPlaylist = () => {
    api.get<Playlist>(`/playlists/${id}`)
      .then((res) => setPlaylist(res.data))
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const tracks = playlist?.tracks || [];
  const isPlaylistPlaying = isPlaying && current && tracks.some(t => t.id === current.id);

  const handleMainPlay = () => {
    if (isPlaylistPlaying) {
      togglePlay();
    } else if (tracks.length > 0) {
      setTrack(tracks[0], tracks);
    }
  };

  const handleDeleteTrack = async (e: React.MouseEvent, trackId: number) => {
    e.stopPropagation();
    if (!window.confirm('Удалить трек из плейлиста?')) return;

    try {
      await api.delete(`/playlists/${id}/tracks/${trackId}`);
      setPlaylist((prev) => prev ? { ...prev, tracks: prev.tracks?.filter(t => t.id !== trackId) } : null);
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить плейлист?')) return;
    try {
      await api.delete(`/playlists/${id}`);
      navigate('/library');
    } catch (err) {
      console.error('Ошибка удаления плейлиста:', err);
    }
  };

  if (loading) return <p className="muted">Загрузка...</p>;
  if (error || !playlist) return <p className="muted">Плейлист не найден или у вас нет к нему доступа.</p>;

  const isOwner = user?.id === playlist.userId;

  return (
    <div className="playlist-page">
      <header className="playlist-header">
        <div className="playlist-cover-large">
          <svg viewBox="0 0 24 24" width="80" height="80" fill="#fff">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        <div className="playlist-header-content">
          <div className="playlist-info">
            <span className="playlist-type">{playlist.isPublic ? 'Публичный плейлист' : 'Приватный плейлист'}</span>
            <h1 className="playlist-name">{playlist.name}</h1>
            <div className="playlist-meta">
              <span>{isOwner ? user.name : 'Пользователь'}</span>
              <span>•</span>
              <span>{tracks.length} треков</span>
            </div>
          </div>

          <div className="playlist-actions-inline">
            <button className="btn-play-large" onClick={handleMainPlay} disabled={tracks.length === 0}>
              {isPlaylistPlaying ? (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            {isOwner && (
              <button className="btn-delete-playlist" onClick={handleDeletePlaylist} title="Удалить плейлист">
                Удалить
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="search-tracks-list one-col">
        {tracks.length === 0 ? (
          <p className="muted">В этом плейлисте пока нет треков.</p>
        ) : (
          tracks.map((track) => {
            const isCurrent = current?.id === track.id;
            const isActuallyPlaying = isCurrent && isPlaying;
            return (
              <div
                key={track.id}
                className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
                onClick={() => {
                  if (isCurrent) togglePlay();
                  else setTrack(track, tracks);
                }}
              >
                <div className="track-row-left">
                  <div className="track-row-cover">
                    {track.title[0]?.toUpperCase() ?? '♪'}
                    <div className="track-row-play-overlay">
                      {isActuallyPlaying ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="track-row-title">{track.title}</span>
                </div>
                <div className="track-row-right">
                  <span className="track-row-meta">
                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                  </span>
                  {isOwner && (
                    <button className="btn-remove-track" onClick={(e) => handleDeleteTrack(e, track.id)} title="Удалить из плейлиста">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}