import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Artist, AlbumType } from '../../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateAlbumModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [primaryArtistId, setPrimaryArtistId] = useState<number | null>(null);
  const [featuredIds, setFeaturedIds] = useState<number[]>([]);
  const [type, setType] = useState<AlbumType>('ALBUM');
  const [year, setYear] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Artist[]>('/artists')
      .then((r) => setArtists(r.data))
      .catch(console.error);
  }, []);

  const toggleFeatured = (id: number) => {
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !primaryArtistId) {
      setError('Заполните название и выберите основного артиста');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: album } = await api.post('/albums', {
        title: title.trim(),
        primaryArtistId,
        featuredArtistIds: featuredIds,
        type,
        year: year ? Number(year) : undefined,
      });

      if (coverFile) {
        const fd = new FormData();
        fd.append('cover', coverFile);
        await api.post(`/albums/${album.id}/cover`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания альбома');
    } finally {
      setSubmitting(false);
    }
  };

  const availableFeatured = artists.filter((a) => a.id !== primaryArtistId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="auth-card modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '560px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h1 className="modal-title" style={{ textAlign: 'center' }}>Новый альбом</h1>
        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="label-form">
          <label className="label-form-field">
            <span className="label-form-label">Название релиза *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Основной артист *</span>
            <select
              value={primaryArtistId ?? ''}
              onChange={(e) => setPrimaryArtistId(Number(e.target.value) || null)}
              required
            >
              <option value="">— Выберите —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <div className="label-form-field">
            <span className="label-form-label">Тип релиза *</span>
            <div className="label-type-tabs">
              {(['SINGLE', 'EP', 'ALBUM'] as AlbumType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`label-type-tab ${type === t ? 'active' : ''}`}
                  onClick={() => setType(t)}
                >
                  {t === 'SINGLE' ? 'Сингл' : t === 'EP' ? 'EP' : 'Альбом'}
                </button>
              ))}
            </div>
          </div>

          <label className="label-form-field">
            <span className="label-form-label">Год (опционально)</span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={1900}
              max={2100}
              placeholder="Например, 2026"
            />
          </label>

          {availableFeatured.length > 0 && (
            <div className="label-form-field">
              <span className="label-form-label">Фиты (опционально)</span>
              <div className="label-feat-list">
                {availableFeatured.map((a) => (
                  <label key={a.id} className="label-feat-item">
                    <input
                      type="checkbox"
                      checked={featuredIds.includes(a.id)}
                      onChange={() => toggleFeatured(a.id)}
                    />
                    <span>{a.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="label-form-field">
            <span className="label-form-label">Обложка (опционально, до 5 МБ)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-pill" disabled={submitting}>
              {submitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}