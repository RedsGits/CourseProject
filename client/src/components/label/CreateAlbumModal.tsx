import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Artist, AlbumType } from '../../types';
import ArtistSearchSelect from './ArtistSearchSelect';
import ArtistSingleSelect from './ArtistSingleSelect';

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

  useEffect(() => {
    if (primaryArtistId) {
      setFeaturedIds((prev) => prev.filter((id) => id !== primaryArtistId));
    }
  }, [primaryArtistId]);

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

          <div className="label-form-field">
            <span className="label-form-label">Основной артист *</span>
            <ArtistSingleSelect
              artists={artists}
              selectedId={primaryArtistId}
              onChange={(id) => setPrimaryArtistId(id)}
            />
            <p className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>
              Вы можете выбрать любого артиста. Если у вас появятся его треки, вы сможете редактировать его профиль.
            </p>
          </div>

          <label className="label-form-field">
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
          </label>

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

          <div className="label-form-field">
            <span className="label-form-label">Фиты (опционально)</span>
            <ArtistSearchSelect
              artists={artists}
              selectedIds={featuredIds}
              onChange={setFeaturedIds}
              primaryArtistId={primaryArtistId}
            />
          </div>

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