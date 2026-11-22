import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Artist, Album, Genre } from '../../types';
import ExplicitBadge from '../ExplicitBadge';

const GENRES: Genre[] = [
  'POP','ROCK','HIPHOP','RNB','ELECTRONIC','HOUSE','TECHNO','TRANCE','DUBSTEP','DRUM_AND_BASS',
  'RAP','JAZZ','BLUES','CLASSICAL','ORCHESTRAL','OPERA','COUNTRY','FOLK','FOLK_ROCK','INDIE',
  'ALTERNATIVE','METAL','HEAVY_METAL','PUNK','HARDCORE','REGGAE','SKA','SOUL','FUNK','DISCO',
  'LATIN','PHONK','SALSA','BOSSA_NOVA','SAMBA','AFROBEAT','K_POP','J_POP','ANIME','SOUNDTRACK',
  'AMBIENT','CHILLOUT','LO_FI','NEW_AGE','GOSPEL','SPIRITUAL','WORLD','CELTIC','GUITAR','PIANO',
  'EXPERIMENTAL','SPOKEN_WORD',
];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadTrackModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [artistId, setArtistId] = useState<number | null>(null);
  const [albumId, setAlbumId] = useState<number | null>(null);
  const [genre, setGenre] = useState<Genre>('POP');
  const [isExplicit, setIsExplicit] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Artist[]>('/artists').then((r) => setArtists(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!artistId) { setAlbums([]); setAlbumId(null); return; }
    api.get<Album[]>(`/albums?artistId=${artistId}`).then((r) => setAlbums(r.data)).catch(console.error);
    setAlbumId(null);
  }, [artistId]);

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !albumId) {
        setError('Заполните название, выберите альбом и файл');
        return;
    }
    setSubmitting(true);
    setError(null);
    try {
        const fd = new FormData();
        fd.append('audio', file);
        fd.append('title', title.trim());
        fd.append('albumId', String(albumId));
        fd.append('genre', genre);
        fd.append('isExplicit', String(isExplicit));
        await api.post('/tracks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        onSuccess();
    } catch (err: any) {
        setError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
        setSubmitting(false);
    }
    };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="auth-card modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', textAlign: 'left' }}
      >
        <h1 className="modal-title" style={{ textAlign: 'center' }}>Загрузить трек</h1>
        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit} className="label-form">
          <label className="label-form-field">
            <span className="label-form-label">Название *</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Основной артист *</span>
            <select value={artistId ?? ''} onChange={(e) => setArtistId(Number(e.target.value) || null)} required>
              <option value="">— Выберите —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Альбом *</span>
            <select
              value={albumId ?? ''}
              onChange={(e) => setAlbumId(Number(e.target.value) || null)}
              required
              disabled={!artistId}
            >
              <option value="">{artistId ? '— Выберите —' : 'Сначала выберите артиста'}</option>
              {albums.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.type})</option>)}
            </select>
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Жанр *</span>
            <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>

          <label className="label-form-checkbox">
            <input
              type="checkbox"
              checked={isExplicit}
              onChange={(e) => setIsExplicit(e.target.checked)}
            />
            <span>
              Содержит нецензурную лексику (18+)
              <ExplicitBadge />
            </span>
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Аудиофайл * (макс. 20 МБ)</span>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/flac"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-pill" disabled={submitting}>
              {submitting ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}