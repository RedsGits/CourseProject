import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Album, Artist, AlbumType } from '../../types';

interface Props {
  album: Album;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditAlbumModal({ album, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(album.title);
  const [year, setYear] = useState(album.year?.toString() ?? '');
  const [type, setType] = useState<AlbumType>(album.type);
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

  const primary = album.artists.find((a) => a.role === 'PRIMARY');
  const availableFeatured = artists.filter((a) => a.id !== primary?.id);

  const toggleFeatured = (id: number) => {
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Название не может быть пустым');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/albums/${album.id}`, {
        title: title.trim(),
        year: year ? Number(year) : null,
        type,
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
            <span className="label-form-label">
              Основной артист: <strong>{primary?.name ?? '—'}</strong> (нельзя изменить)
            </span>
          </div>

          {availableFeatured.length > 0 && (
            <div className="label-form-field">
              <span className="label-form-label">Фиты</span>
              <p className="muted" style={{ fontSize: '12px', marginBottom: '6px' }}>
                Изменение затронет все треки этого альбома
              </p>
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