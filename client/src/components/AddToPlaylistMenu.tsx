import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

interface PlaylistInfo {
  id: number;
  name: string;
  hasTrack: boolean;
}

export default function AddToPlaylistMenu({ trackId, className = "player-btn" }: { trackId: number, className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
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
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  return (
    <div className="add-to-playlist-wrap" ref={menuRef}>
      <button className={className} onClick={handleOpen} title="Добавить в плейлист">
        <svg viewBox="0 -960 960 960" width="20" height="20" fill="currentColor">
          <path d="M120-320v-80h280v80H120Zm0-160v-80h440v80H120Zm0-160v-80h440v80H120Zm520 480v-160H480v-80h160v-160h80v160h160v80H720v160h-80Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="playlist-menu" onClick={(e) => e.stopPropagation()}>
          <div className="playlist-menu-header">Добавить в плейлист</div>
          {loading ? (
            <div className="playlist-menu-empty">Загрузка...</div>
          ) : playlists.length === 0 ? (
            <div className="playlist-menu-empty">У вас пока нет плейлистов</div>
          ) : (
            playlists.map((playlist) => (
              <button
                key={playlist.id}
                className="playlist-menu-item"
                onClick={() => toggleTrack(playlist.id, playlist.hasTrack)}
              >
                <span>{playlist.name}</span>
                {playlist.hasTrack && (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}