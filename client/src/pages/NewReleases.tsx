import { useEffect, useState } from 'react';
import { api } from '../api/client';
import AlbumCard from '../components/AlbumCard';
import type { Album } from '../types';

export default function NewReleases() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Album[]>('/albums')
      .then((res) => {
        setAlbums(
          [...res.data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Новые релизы</h1>
        <p className="muted">Свежие альбомы и синглы на DoeReMi</p>
      </header>

      {loading ? (
        <p className="muted">Загрузка...</p>
      ) : albums.length === 0 ? (
        <p className="muted">Пока нет релизов.</p>
      ) : (
        <div className="library-grid">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} showYear />
          ))}
        </div>
      )}
    </div>
  );
}
