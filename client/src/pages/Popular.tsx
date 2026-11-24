import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TrackList from '../components/TrackList';
import type { Track } from '../types';

export default function Popular() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Track[]>('/tracks')
      .then((res) => {
        setTracks([...res.data].sort((a, b) => b.playCount - a.playCount));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>Популярно сейчас</h1>
        <p className="muted">Самые прослушиваемые треки на DoeReMi</p>
      </header>

      {loading ? (
        <p className="muted">Загрузка...</p>
      ) : tracks.length === 0 ? (
        <p className="muted">Пока нет опубликованных треков.</p>
      ) : (
        <TrackList tracks={tracks} contextId="popular-page" columns={2} />
      )}
    </div>
  );
}
