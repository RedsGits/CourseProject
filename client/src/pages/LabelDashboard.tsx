import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { api } from '../api/client';
import LabelTrackRow from '../components/label/LabelTrackRow';
import AlbumsTab from '../components/label/AlbumsTab';
import ArtistsTab from '../components/label/ArtistsTab';
import AdminTab from '../components/label/AdminTab';
import EditTrackModal from '../components/label/EditTrackModal';
import type { Track } from '../types';

type Tab = 'tracks' | 'albums' | 'artists' | 'admin';

function TracksTab() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [karaokeTrack, setKaraokeTrack] = useState<Track | null>(null);

  const loadTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = user?.role === 'LABEL' ? `/tracks?labelId=${user.id}` : '/tracks';
      const { data } = await api.get<Track[]>(url);
      setTracks(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки треков');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, [user]);

  const handleFetch = async (trackId: number) => {
    setFetchingId(trackId);
    try {
      const { data } = await api.post(`/tracks/${trackId}/lyrics/fetch`);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, lyrics: data.lyrics, syncedLyrics: data.syncedLyrics }
            : t
        )
      );
      if (!data.found) alert('lrclib не нашёл текст для этого трека');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось получить текст');
    } finally {
      setFetchingId(null);
    }
  };

  const handleDelete = async (trackId: number) => {
    if (!confirm('Удалить трек? Файл будет удалён с диска. Это нельзя отменить.')) return;
    try {
      await api.delete(`/tracks/${trackId}`);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось удалить трек');
    }
  };

  if (loading) return <p className="muted">Загрузка треков...</p>;
  if (error) return <p className="muted">{error}</p>;

  return (
    <div>
      <div className="label-tab-header">
        <h2 className="label-tab-title">
          {user?.role === 'LABEL' ? 'Мои треки' : 'Все треки'} ({tracks.length})
        </h2>
        <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
          Загрузка треков — во вкладке «Альбомы»
        </p>
      </div>

      {tracks.length === 0 ? (
        <p className="muted">Пока нет треков. Загрузите первый.</p>
      ) : (
        <div className="label-tracks-list">
          {tracks.map((track) => (
            <LabelTrackRow
              key={track.id}
              track={track}
              onFetchLyrics={() => handleFetch(track.id)}
              isFetching={fetchingId === track.id}
              onEdit={() => setEditingTrack(track)}
              onKaraoke={() => setKaraokeTrack(track)}
              onDelete={() => handleDelete(track.id)}
            />
          ))}
        </div>
      )}

      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onSuccess={() => { setEditingTrack(null); loadTracks(); }}
        />
      )}
      
      {karaokeTrack && (
        <KaraokeEditorModal
          track={karaokeTrack}
          onClose={() => setKaraokeTrack(null)}
          onSuccess={() => { setKaraokeTrack(null); loadTracks(); }}
        />
      )}
    </div>
  );
}

export default function LabelDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('tracks');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role === 'USER') navigate('/');
  }, [user, navigate]);

  if (!user || user.role === 'USER') return null;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="label-dashboard">
      <header className="label-dashboard-header">
        <Link to="/label" className="label-dashboard-logo">
          <img src="/Logonotext.png" className="logo-icon" alt="DoeReMi" />
          <span className="logo-text" style={{ opacity: 1, transform: 'none' }}>DoeReMi</span>
          <span className="label-dashboard-badge">{user.role}</span>
        </Link>
        <div className="label-dashboard-user">
          {user.role === 'ADMIN' && <Link to="/" className="label-back-link">← К пользовательскому интерфейсу</Link>}
          <span className="label-dashboard-username">{user.name ?? user.email}</span>
          <button className="btn-pill" onClick={handleLogout}>Выйти</button>
        </div>
      </header>

      <main className="label-dashboard-content">
        <div className="label-dashboard-tabs">
          <button className={`label-tab ${activeTab === 'tracks' ? 'active' : ''}`} onClick={() => setActiveTab('tracks')}>Треки</button>
          <button className={`label-tab ${activeTab === 'albums' ? 'active' : ''}`} onClick={() => setActiveTab('albums')}>Альбомы</button>
          <button className={`label-tab ${activeTab === 'artists' ? 'active' : ''}`} onClick={() => setActiveTab('artists')}>Артисты</button>
          
          {user.role === 'ADMIN' && (
            <button className={`label-tab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              Админ
            </button>
          )}
        </div>

        <div className="label-tab-content">
          {activeTab === 'tracks' && <TracksTab />}
          {activeTab === 'albums' && <AlbumsTab />}
          {activeTab === 'artists' && <ArtistsTab />}
          
          {activeTab === 'admin' && <AdminTab />}
        </div>
      </main>
    </div>
  );
}