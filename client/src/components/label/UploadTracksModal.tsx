import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import type { Album, Genre, Artist } from '../../types';
import ArtistSearchSelect from './ArtistSearchSelect';
import ExplicitBadge from '../ExplicitBadge';

const GENRES: Genre[] = [
  'POP','ROCK','HIPHOP','RNB','ELECTRONIC','HOUSE','TECHNO','TRANCE','DUBSTEP','DRUM_AND_BASS',
  'RAP','JAZZ','BLUES','CLASSICAL','ORCHESTRAL','OPERA','COUNTRY','FOLK','FOLK_ROCK','INDIE',
  'ALTERNATIVE','METAL','HEAVY_METAL','PUNK','HARDCORE','REGGAE','SKA','SOUL','FUNK','DISCO',
  'LATIN','PHONK','SALSA','BOSSA_NOVA','SAMBA','AFROBEAT','K_POP','J_POP','ANIME','SOUNDTRACK',
  'AMBIENT','CHILLOUT','LO_FI','NEW_AGE','GOSPEL','SPIRITUAL','WORLD','CELTIC','GUITAR','PIANO',
  'EXPERIMENTAL','SPOKEN_WORD',
];

interface PendingFile {
  file: File;
  title: string;
  genre: Genre;
  isExplicit: boolean;
}

interface Props {
  album: Album;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadTracksModal({ album, onClose, onSuccess }: Props) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    api.get<Artist[]>('/artists').then((r) => setArtists(r.data)).catch(console.error);
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const pending: PendingFile[] = selected.map((f) => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      genre: 'POP',
      isExplicit: false,
    }));
    setFiles((prev) => [...prev, ...pending]);
    e.target.value = '';
  };

  const updateFile = (idx: number, patch: Partial<PendingFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Выберите хотя бы один файл');
      return;
    }
    if (files.some((f) => !f.title.trim())) {
      setError('У всех файлов должно быть название');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress({ done: 0, total: files.length });

    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const fd = new FormData();
        fd.append('audio', f.file);
        fd.append('title', f.title.trim());
        fd.append('albumId', String(album.id));
        fd.append('genre', f.genre);
        fd.append('isExplicit', String(f.isExplicit));
        await api.post('/tracks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err) {
        failed++;
        console.error(`Ошибка загрузки "${f.title}":`, err);
      }
      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);

    if (failed > 0) {
      alert(`Загружено ${files.length - failed} из ${files.length}. ${failed} с ошибками (см. консоль)`);
    }

    onSuccess();
  };

  const primaryArtist = album.artists?.find((a) => a.role === 'PRIMARY');
  const featured = album.artists?.filter((a) => a.role === 'FEATURED') ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="auth-card modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', textAlign: 'left', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h1 className="modal-title" style={{ textAlign: 'center' }}>
          Загрузить треки в «{album.title}»
        </h1>

        <p className="muted" style={{ textAlign: 'center', fontSize: '13px', marginBottom: '20px' }}>
          Артисты: {primaryArtist?.name ?? '—'}
          {featured.length > 0 && `, ${featured.map((a) => a.name).join(', ')}`}
          {' '}(берутся из альбома)
        </p>

        {error && <div className="error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="label-form-field" style={{ marginBottom: '20px' }}>
            <label className="label-form-label">Добавить аудиофайлы (макс. 20 МБ каждый)</label>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/flac"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {files.length > 0 && (
            <div className="upload-tracks-list">
              {files.map((f, idx) => (
                <div key={idx} className="upload-track-item">
                  <div className="upload-track-filename" title={f.file.name}>
                    {f.file.name}
                  </div>
                  <input
                    type="text"
                    value={f.title}
                    onChange={(e) => updateFile(idx, { title: e.target.value })}
                    placeholder="Название трека"
                    disabled={uploading}
                    maxLength={100}
                  />
                  <select
                    value={f.genre}
                    onChange={(e) => updateFile(idx, { genre: e.target.value as Genre })}
                    disabled={uploading}
                  >
                    {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <label className="explicit-check" title="Содержит нецензурную лексику (18+)">
                    <input
                      type="checkbox"
                      className="explicit-checkbox"
                      checked={f.isExplicit}
                      onChange={(e) => updateFile(idx, { isExplicit: e.target.checked })}
                      disabled={uploading}
                    />
                    <ExplicitBadge />
                  </label>
                  <button
                    type="button"
                    className="label-track-btn label-track-btn-danger"
                    onClick={() => removeFile(idx)}
                    disabled={uploading}
                    title="Убрать"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <p className="muted" style={{ marginTop: '12px' }}>
              Загрузка: {progress.done} из {progress.total}
            </p>
          )}

          <div className="label-form-field">
            <span className="label-form-label">Фиты для этих треков (опционально)</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={uploading}>
              Отмена
            </button>
            <button type="submit" className="btn-pill" disabled={uploading || files.length === 0}>
              {uploading ? 'Загрузка...' : `Загрузить (${files.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}