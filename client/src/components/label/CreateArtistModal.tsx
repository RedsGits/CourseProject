import { useState } from 'react';
import { api } from '../../api/client';
import type { Artist } from '../../types';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export default function CreateArtistModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Имя обязательно');
      return;
    }
    if (countryCode && !/^[A-Za-z]{2}$/.test(countryCode.trim())) {
      setError('Код страны должен быть двумя буквами (например, RU, US)');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { data: artist } = await api.post<Artist>('/artists', {
        name: name.trim(),
        bio: bio.trim() || undefined,
        countryCode: countryCode.trim().toUpperCase() || undefined,
      });

      if (imageFile) {
        const fd = new FormData();
        fd.append('image', imageFile);
        await api.post(`/artists/${artist.id}/image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(console.error);
      }

      if (bannerFile) {
        const fd = new FormData();
        fd.append('banner', bannerFile);
        await api.post(`/artists/${artist.id}/banner`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(console.error);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка создания артиста');
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
        <h1 className="modal-title" style={{ textAlign: 'center' }}>Новый артист</h1>
        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="label-form">
          <label className="label-form-field">
            <span className="label-form-label">Имя *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Биография</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Несколько слов об артисте..."
              style={{
                fontFamily: 'inherit',
                fontSize: '15px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                outline: 'none',
                width: '100%',
                resize: 'vertical',
              }}
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">
              Код страны (ISO 3166-1 alpha-2: RU, US, GB, ...)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="RU"
                style={{ maxWidth: '100px' }}
              />
              {countryCode.length === 2 && (
                <span className="muted" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className={`fi fi-${countryCode.toLowerCase()}`} />
                  {countryName(countryCode)}
                </span>
              )}
            </div>
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Аватар (опционально, до 5 МБ)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Баннер (опционально, до 5 МБ)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
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