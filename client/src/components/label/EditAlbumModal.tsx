import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Album, Artist, AlbumType } from '../../types';
import ArtistSearchSelect from './ArtistSearchSelect';
import ArtistSingleSelect from './ArtistSingleSelect';

interface Props {
  album: Album;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAlbumModal({ album, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(album.title);
  const [year, setYear] = useState(album.year?.toString() ?? '');
  const [type, setType] = useState<AlbumType>(album.type);
  
  const primary = album.artists.find((a) => a.role === 'PRIMARY');
  const [primaryArtistId, setPrimaryArtistId] = useState<number | null>(primary?.id || null);

  const [featuredIds, setFeaturedIds] = useState<number[]>(
    album.artists.filter((a) => a.role === 'FEATURED').map((a) => a.id)
  );

  const [artists, setArtists] = useState<Artist[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Artist[]>('/artists')
      .then((r) => setArtists(r.data))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Название не может быть пустым');
      return;
    }
    if (!primaryArtistId) {
      setError('Выберите основного артиста');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/albums/${album.id}`, {
        title: title.trim(),
        year: year ? Number(year) : null,
        type,
        primaryArtistId,
        featuredArtistIds: featuredIds,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
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
        <h1 className="modal-title" style={{ textAlign: 'center' }}>Редактировать альбом</h1>
        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="label-form">
          <label className="label-form-field">
            <span className="label-form-label">Название</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Тип</span>
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
            <span className="label-form-label">Год</span>
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

          <div className="label-form-field">
            <span className="label-form-label">Фиты (опционально)</span>
            <p className="muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
              Изменение затронет все треки этого альбома
            </p>
            <ArtistSearchSelect
              artists={artists}
              selectedIds={featuredIds}
              onChange={setFeaturedIds}
              primaryArtistId={primaryArtistId}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-pill" disabled={submitting}>
              {submitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}