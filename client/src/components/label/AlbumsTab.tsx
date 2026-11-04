import { useState, useEffect } from 'react';
import { useAuth } from '../../store/auth';
import { api } from '../../api/client';
import TrackCover from '../TrackCover';
import CreateAlbumModal from './CreateAlbumModal';
import type { Album } from '../../types';
import AlbumDetailModal from './AlbumDetailModal';
import { formatAlbumType } from '../../api/format'

export default function AlbumsTab() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [openedAlbumId, setOpenedAlbumId] = useState<number | null>(null);

  const loadAlbums = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = user?.role === 'LABEL' ? `/albums?labelId=${user.id}` : '/albums';
      const { data } = await api.get<Album[]>(url);
      setAlbums(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки альбомов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, [user]);

  const handleDelete = async (albumId: number, title: string) => {
    if (!confirm(`Удалить альбом «${title}»?`)) return;
    try {
      await api.delete(`/albums/${albumId}`);
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Не удалось удалить альбом';
      alert(msg);
    }
  };

  if (loading) return <p className="muted">Загрузка альбомов...</p>;
  if (error) return <p className="muted">{error}</p>;

  return (
    <div>
      <div className="label-tab-header">
        <h2 className="label-tab-title">
          {user?.role === 'LABEL' ? 'Мои альбомы' : 'Все альбомы'} ({albums.length})
        </h2>
        {user?.role !== 'ADMIN' && (
          <button className="btn-pill" onClick={() => setCreateOpen(true)}>
            + Создать альбом
          </button>
        )}
      </div>

      {albums.length === 0 ? (
        <p className="muted">Пока нет альбомов. Создайте первый.</p>
      ) : (
        <div className="library-grid">
          {albums.map((album) => {
            const primary = album.artists?.find((a) => a.role === 'PRIMARY');
            const featured = album.artists?.filter((a) => a.role === 'FEATURED') ?? [];
            const artistLine = primary
              ? featured.length === 0
                ? primary.name
                : `${primary.name}, ${featured.map((a) => a.name).join(', ')}`
              : '—';

            return (
              <div key={album.id} className="library-card label-album-card">
                <div onClick={() => setOpenedAlbumId(album.id)} style={{ cursor: 'pointer' }}>
                  <TrackCover
                    coverUrl={album.coverUrl}
                    alt={album.title}
                    className="library-card-cover"
                  />
                  <div className="library-card-info">
                    <div className="library-card-title">{album.title}</div>
                    <div className="library-card-sub">{artistLine}</div>
                    <div className="library-card-sub" style={{ marginTop: '4px', fontSize: '11px', opacity: 0.7 }}>
                      {formatAlbumType(album.type)} {album.year ? `• ${album.year}` : ''}
                    </div>
                  </div>
                </div>
                <div className="label-album-actions">
                <button
                    className="label-track-btn"
                    onClick={() => setOpenedAlbumId(album.id)}
                    title="Открыть"
                >
                    Открыть
                  </button>
                  <button
                    className="label-track-btn label-track-btn-danger"
                    onClick={() => handleDelete(album.id, album.title)}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateAlbumModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            loadAlbums();
          }}
        />
      )}
      {openedAlbumId !== null && (
        <AlbumDetailModal
            albumId={openedAlbumId}
            onClose={() => setOpenedAlbumId(null)}
            onChange={() => loadAlbums()}
        />
      )}
    </div>
  );
}