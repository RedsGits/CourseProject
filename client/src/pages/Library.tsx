import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import type { Track } from '../types';

interface Playlist {
  id: number;
  name: string;
  isPublic: boolean;
  userId: number;
}

export default function Library() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedTracks, setLikedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    Promise.all([
      api.get('/playlists'),
      api.get('/reactions/me')
    ])
      .then(([playlistsRes, likesRes]) => {
        setPlaylists(playlistsRes.data);
        setLikedTracks(likesRes.data);
      })
      .catch((err) => console.error('Ошибка загрузки библиотеки:', err))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      const { data } = await api.post('/playlists', {
        name: newPlaylistName.trim(),
        isPublic
      });
      setPlaylists([...playlists, data]);
      setIsModalOpen(false);
      setNewPlaylistName('');
      setIsPublic(false);
    } catch (err) {
      console.error('Ошибка создания плейлиста:', err);
      alert('Не удалось создать плейлист');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) return <p className="muted">Загрузка библиотеки...</p>;

  return (
    <div className="library-page">
      <div className="library-header">
        <h1>Моя библиотека</h1>
        <button 
          className="btn-pill" 
          onClick={() => setIsModalOpen(true)}
        >
          Создать плейлист
        </button>
      </div>

      <div className="library-grid">
        <Link to="/liked" className="library-card liked-card">
          <div className="library-card-cover liked-cover">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="library-card-info">
            <div className="library-card-title">Любимые треки</div>
            <div className="library-card-sub">{likedTracks.length} треков</div>
          </div>
        </Link>

        {playlists.map((playlist) => (
          <Link to={`/playlist/${playlist.id}`} key={playlist.id} className="library-card">
            <div className="library-card-cover">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div className="library-card-info">
              <div className="library-card-title">{playlist.name}</div>
              <div className="library-card-sub">
                {playlist.isPublic ? 'Публичный' : 'Приватный'}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Новый плейлист</h2>
            <form onSubmit={handleCreatePlaylist}>
              <input
                type="text"
                placeholder="Название плейлиста"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                autoFocus
                maxLength={50}
              />
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">Сделать публичным</span>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn-pill" disabled={isCreating || !newPlaylistName.trim()}>
                  {isCreating ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}