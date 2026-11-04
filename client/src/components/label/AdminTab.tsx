import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { User, Track, Album } from '../../types';

interface Label {
  id: number;
  email: string;
  labelName: string | null;
  verified: boolean;
}

export default function AdminTab() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [creating, setCreating] = useState(false);

  const [transferType, setTransferType] = useState<'track' | 'album'>('track');
  const [transferId, setTransferId] = useState<number | null>(null);
  const [transferLabelId, setTransferLabelId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [labelsRes, tracksRes, albumsRes] = await Promise.all([
        api.get<Label[]>('/admin/labels'),
        api.get<Track[]>('/tracks'),
        api.get<Album[]>('/albums'),
      ]);
      setLabels(labelsRes.data);
      setTracks(tracksRes.data);
      setAlbums(albumsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword || !newLabelName) return;
    setCreating(true);
    try {
      await api.post('/admin/labels', { email: newEmail, password: newPassword, labelName: newLabelName });
      setNewEmail(''); setNewPassword(''); setNewLabelName('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm('Удалить лейбл?')) return;
    try {
      await api.delete(`/admin/labels/${labelId}`);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferId || !transferLabelId) return;
    try {
      if (transferType === 'track') {
        await api.patch(`/admin/tracks/${transferId}/transfer`, { labelId: transferLabelId });
      } else {
        await api.patch(`/admin/albums/${transferId}/transfer`, { labelId: transferLabelId });
      }
      alert('Передача выполнена');
      setTransferId(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка передачи');
    }
  };

  if (loading) return <p className="muted">Загрузка...</p>;

  return (
    <div className="admin-tab">
      <h2 className="label-tab-title">Администрирование</h2>

      <div className="admin-section">
        <h3>Лейблы</h3>
        <form onSubmit={handleCreateLabel} className="admin-create-label-form">
          <input type="email" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          <input type="password" placeholder="Пароль" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <input type="text" placeholder="Название лейбла" value={newLabelName} onChange={(e) => setNewLabelName(e.target.value)} required />
          <button type="submit" className="btn-pill" disabled={creating}>Создать</button>
        </form>
        <ul className="admin-labels-list">
          {labels.map((l) => (
            <li key={l.id} className="admin-label-item">
              <span>{l.labelName || l.email} ({l.email})</span>
              <button className="label-track-btn label-track-btn-danger" onClick={() => handleDeleteLabel(l.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-section">
        <h3>Передача контента</h3>
        <form onSubmit={handleTransfer} className="admin-transfer-form">
          <select value={transferType} onChange={(e) => { setTransferType(e.target.value as 'track' | 'album'); setTransferId(null); }}>
            <option value="track">Трек</option>
            <option value="album">Альбом</option>
          </select>

          <select value={transferId ?? ''} onChange={(e) => setTransferId(Number(e.target.value) || null)} required>
            <option value="">— Выберите {transferType === 'track' ? 'трек' : 'альбом'} —</option>
            {(transferType === 'track' ? tracks : albums).map((item) => {
              const currentOwner = labels.find((l) => l.id === item.labelId)?.labelName || `Label ID ${item.labelId}`;
              return (
                <option key={item.id} value={item.id}>
                  {(item as any).title} (Текущий владелец: {currentOwner})
                </option>
              );
            })}
          </select>

          <select value={transferLabelId ?? ''} onChange={(e) => setTransferLabelId(Number(e.target.value) || null)} required>
            <option value="">— Кому —</option>
            {labels.map((l) => <option key={l.id} value={l.id}>{l.labelName || l.email}</option>)}
          </select>

          <button type="submit" className="btn-pill">Передать</button>
        </form>
      </div>
    </div>
  );
}