import { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import type { Artist } from '../../types';
import { useAuth } from '../../store/auth';

interface Props {
  artistId: number;
  canEdit: boolean;
  canDelete: boolean;
  onClose: () => void;
  onChange: () => void;
}

function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(['ru'], { type: 'region' }).of(code) ?? null;
  } catch {
    return null;
  }
}

export default function ArtistDetailModal({ artistId, canEdit, canDelete, onClose, onChange }: Props) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const loadArtist = async () => {
    try {
      const { data } = await api.get<Artist>(`/artists/${artistId}`);
      setArtist(data);
      setEditName(data.name);
      setEditBio(data.bio ?? '');
      setEditCountry(data.countryCode ?? '');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка загрузки артиста');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtist();
  }, [artistId]);

  const handleSave = async () => {
    if (!editName.trim()) {
      alert('Имя не может быть пустым');
      return;
    }
    if (editCountry && !/^[A-Za-z]{2}$/.test(editCountry.trim())) {
      alert('Код страны должен быть двумя буквами');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/artists/${artistId}`, {
        name: editName.trim(),
        bio: editBio.trim() || null,
        countryCode: editCountry.trim().toUpperCase() || null,
      });
      await loadArtist();
      setIsEditing(false);
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/artists/${artistId}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadArtist();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось загрузить аватар');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('banner', file);
      await api.post(`/artists/${artistId}/banner`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadArtist();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось загрузить баннер');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!artist) return;
    if (!confirm(`Удалить артиста «${artist.name}»? Все его альбомы и треки будут удалены.`)) return;
    try {
      await api.delete(`/artists/${artistId}`);
      onClose();
      onChange();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Не удалось удалить артиста');
    }
  };

  const country = artist?.countryCode ? countryName(artist.countryCode) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="album-detail-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <p className="muted" style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</p>
        ) : error || !artist ? (
          <p className="muted" style={{ padding: '40px', textAlign: 'center' }}>{error ?? 'Артист не найден'}</p>
        ) : (
          <>
            <button className="album-detail-close" onClick={onClose} title="Закрыть">✕</button>

            {artist.bannerUrl && (
              <div
                className="artist-detail-banner"
                style={{
                  backgroundImage: `url(http://localhost:5000/uploads/${artist.bannerUrl})`,
                }}
              />
            )}

            <div className="album-detail-header" style={{ marginTop: artist.bannerUrl ? '-60px' : 0, position: 'relative', zIndex: 1 }}>
              <div
                className="artist-detail-avatar-wrap"
                onClick={() => canEdit && !isAdmin && imageInputRef.current?.click()}
                title={canEdit && !isAdmin ? 'Изменить аватар' : undefined}
              >
                <img
                  src={artist.imageUrl ? `http://localhost:5000/uploads/${artist.imageUrl}` : '/Defpfp.png'}
                  alt={artist.name}
                  className="artist-detail-avatar"
                  onError={(e) => {
                    if (!e.currentTarget.src.includes('Defpfp')) {
                      e.currentTarget.src = '/Defpfp.png';
                    }
                  }}
                />
                {uploadingImage && <div className="album-detail-cover-overlay">Загрузка...</div>}
                {canEdit && <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />}
              </div>

              <div className="album-detail-info">
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="artist-edit-input"
                      style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}
                      maxLength={100}
                    />
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      rows={4}
                      className="artist-edit-textarea"
                      placeholder="Биография"
                      maxLength={2000}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        value={editCountry}
                        onChange={(e) => setEditCountry(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="RU"
                        className="artist-edit-input"
                        style={{ maxWidth: '80px' }}
                      />
                      {editCountry.length === 2 && (
                        <span className="muted" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`fi fi-${editCountry.toLowerCase()}`} />
                          {countryName(editCountry)}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="label-form-label">Исполнитель</span>
                    <h2 className="album-detail-title">{artist.name}</h2>
                    {artist.countryCode && country && (
                      <p className="album-detail-artists" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`fi fi-${artist.countryCode.toLowerCase()}`} />
                        {country}
                      </p>
                    )}
                    {artist.bio && (
                      <p className="muted" style={{ fontSize: '14px', lineHeight: 1.5, marginTop: '8px' }}>
                        {artist.bio}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="album-detail-actions">
              {canEdit && !isAdmin && (
                <>
                  {isEditing ? (
                    <>
                      <button className="label-track-btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Сохранение...' : '✓ Сохранить'}
                      </button>
                      <button className="label-track-btn" onClick={() => { setIsEditing(false); loadArtist(); }}>
                        Отмена
                      </button>
                    </>
                  ) : (
                    <button className="label-track-btn" onClick={() => setIsEditing(true)}>
                      ✎ Редактировать
                    </button>
                  )}
                  <button className="label-track-btn" onClick={() => bannerInputRef.current?.click()} disabled={uploadingBanner}>
                    {uploadingBanner ? 'Загрузка...' : (artist.bannerUrl ? 'Изменить баннер' : 'Загрузить баннер')}
                  </button>
                  <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
                </>
              )}
              
              {canDelete && (
                <button className="label-track-btn label-track-btn-danger" onClick={handleDelete}>
                  Удалить артиста
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}