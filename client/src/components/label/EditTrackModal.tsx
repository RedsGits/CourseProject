import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import ArtistSearchSelect from './ArtistSearchSelect';
import type { Artist, Track, Genre } from '../../types';

const GENRES: Genre[] = [
  'POP','ROCK','HIPHOP','RNB','ELECTRONIC','HOUSE','TECHNO','TRANCE','DUBSTEP','DRUM_AND_BASS',
  'RAP','JAZZ','BLUES','CLASSICAL','ORCHESTRAL','OPERA','COUNTRY','FOLK','FOLK_ROCK','INDIE',
  'ALTERNATIVE','METAL','HEAVY_METAL','PUNK','HARDCORE','REGGAE','SKA','SOUL','FUNK','DISCO',
  'LATIN','PHONK','SALSA','BOSSA_NOVA','SAMBA','AFROBEAT','K_POP','J_POP','ANIME','SOUNDTRACK',
  'AMBIENT','CHILLOUT','LO_FI','NEW_AGE','GOSPEL','SPIRITUAL','WORLD','CELTIC','GUITAR','PIANO',
  'EXPERIMENTAL','SPOKEN_WORD',
];

interface Props {
  track: Track;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditTrackModal({ track, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState<Genre>(track.genre);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);

  const [featuredIds, setFeaturedIds] = useState<number[]>(() => {
    return track.artists
      ?.filter((a) => a.role === 'FEATURED')
      .map((a) => a.id) || [];
  });

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
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/tracks/${track.id}`, {
        title: title.trim(),
        genre,
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
        style={{ maxWidth: '460px', textAlign: 'left' }}
      >
        <h1 className="modal-title" style={{ textAlign: 'center' }}>Редактировать трек</h1>
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
              autoFocus
            />
          </label>

          <label className="label-form-field">
            <span className="label-form-label">Жанр</span>
            <select value={genre} onChange={(e) => setGenre(e.target.value as Genre)}>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>

          <div className="label-form-field">
            <span className="label-form-label">Фиты (опционально)</span>
            <ArtistSearchSelect
              artists={artists}
              selectedIds={featuredIds}
              onChange={setFeaturedIds}
              primaryArtistId={track.artists?.find((a) => a.role === 'PRIMARY')?.id}
            />
          </div>

          <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
            Артисты, альбом и аудиофайл не меняются. Чтобы изменить артистов — отредактируйте альбом.
          </p>

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