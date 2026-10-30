import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface PlaylistInfo {
  id: number;
  name: string;
  hasTrack: boolean;
}

const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M11,13H6q-0.42,0-0.71-0.29Q5,12.43 5,12t0.29-0.71T6,11h5V6q0-0.43 0.29-0.71T12,5t0.71,0.29T13,6v5h5q0.43,0 0.71,0.29T19,12t-0.29,0.71T18,13H13v5q0,0.43-0.29,0.71T12,19t-0.71-0.29Q11,18.43 11,18V13Z" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M9.55,15.15l8.48-8.48q0.3-0.3 0.7-0.3t0.7,0.3q0.3,0.3 0.3,0.71T19.43,8.1l-9.18,9.2q-0.3,0.3-0.7,0.3t-0.7-0.3L4.55,13q-0.3-0.3-0.29-0.71t0.31-0.71t0.71-0.3T6,11.58l3.55,3.58Z" />
  </svg>
);

export default function AddToPlaylistMenu({ trackId, className = "player-btn" }: { trackId: number, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setNewPlaylistName('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      setIsCreating(false);
      return;
    }
    setIsOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get<PlaylistInfo[]>(`/tracks/${trackId}/playlists`);
      setPlaylists(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrack = async (playlistId: number, hasTrack: boolean) => {
    try {
      if (hasTrack) {
        await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
      } else {
        await api.post(`/playlists/${playlistId}/tracks`, { trackId });
      }
      setPlaylists((prev) =>
        prev.map((p) => (p.id === playlistId ? { ...p, hasTrack: !hasTrack } : p))
      );
    } catch (err: any) {
      console.error('Ошибка:', err);
      alert(err.response?.data?.error || 'Не удалось добавить трек');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: newPlaylist } = await api.post('/playlists', {
        name: newPlaylistName.trim(),
        isPublic: false,
      });

      await api.post(`/playlists/${newPlaylist.id}/tracks`, { trackId });

      setPlaylists([...playlists, { id: newPlaylist.id, name: newPlaylist.name, hasTrack: true }]);
      
      window.dispatchEvent(new CustomEvent('playlist-created'));
      
      setNewPlaylistName('');
      setIsCreating(false);
    } catch (err: any) {
      console.error('Ошибка создания плейлиста:', err);
      alert(err.response?.data?.error || 'Не удалось создать плейлист');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-to-playlist-wrap" ref={menuRef}>
      <button className={className} onClick={handleOpen} title="Добавить в плейлист">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
          <path d="M4,16q-0.42,0-0.71-0.29T3,15t0.29-0.71T4,14H9q0.43,0 0.71,0.29T10,15T9.71,15.71T9,16H4Zm0-4q-0.42,0-0.71-0.29Q3,11.43 3,11t0.29-0.71T4,10h9q0.43,0 0.71,0.29T14,11t-0.29,0.71T13,12H4ZM4,8Q3.58,8 3.29,7.71Q3,7.43 3,7T3.29,6.29T4,6h9q0.43,0 0.71,0.29T14,7T13.71,7.71T13,8H4ZM16.29,19.71Q16,19.43 16,19V16H13q-0.42,0-0.71-0.29T12,15t0.29-0.71T13,14h3V11q0-0.43 0.29-0.71T17,10t0.71,0.29T18,11v3h3q0.43,0 0.71,0.29T22,15t-0.29,0.71T21,16H18v3q0,0.43-0.29,0.71T17,20t-0.71-0.29Z" />
        </svg>
      </button>


      {isOpen && (
        <div className="playlist-menu" onClick={(e) => e.stopPropagation()}>
          <div className="playlist-menu-header">Добавить в плейлист</div>
          
          <div className="playlist-menu-list">
            {loading ? (
              <div className="playlist-menu-empty">Загрузка...</div>
            ) : playlists.length === 0 && !isCreating ? (
              <div className="playlist-menu-empty">У вас пока нет плейлистов</div>
            ) : (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  className="playlist-menu-item"
                  onClick={() => toggleTrack(playlist.id, playlist.hasTrack)}
                >
                  <span>{playlist.name}</span>
                  {playlist.hasTrack && <IconCheck />}
                </button>
              ))
            )}
          </div>

          <div className="playlist-menu-footer">
            {isCreating ? (
              <form onSubmit={handleCreatePlaylist} className="create-playlist-form">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Название..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  maxLength={50}
                />
                <button type="submit" disabled={!newPlaylistName.trim() || isSubmitting}>
                  {isSubmitting ? '...' : <IconCheck />}
                </button>
              </form>
            ) : (
              <button className="playlist-menu-create-btn" onClick={() => setIsCreating(true)}>
                <IconPlus /> Создать плейлист
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}