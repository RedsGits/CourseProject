import { Link } from 'react-router-dom';
import type { Track } from '../../types';
import TrackCover from '../TrackCover';
import ExplicitBadge from '../ExplicitBadge';
import { useAuth } from '../../store/auth';

interface Props {
  track: Track;
  onFetchLyrics: () => void;
  isFetching: boolean;
  onEdit: () => void;
  onKaraoke: () => void;
  onDelete: () => void;
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getArtistLine(track: Track): string {
  const primary = track.artists?.find((a) => a.role === 'PRIMARY');
  const featured = track.artists?.filter((a) => a.role === 'FEATURED') ?? [];
  if (!primary && featured.length === 0) return '—';
  if (!primary) return featured.map((a) => a.name).join(', ');
  if (featured.length === 0) return primary.name;
  return `${primary.name}, ${featured.map((a) => a.name).join(', ')}`;
}

export default function LabelTrackRow({ track, onFetchLyrics, isFetching, onEdit, onKaraoke, onDelete }: Props) {

  const hasLyrics = track.lyrics != null;
  const hasSyncedLyrics = track.syncedLyrics != null;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="label-track-row">
        <TrackCover
        coverUrl={track.album?.coverUrl}
        alt={track.title}
        className="label-track-cover"
        />

      <div className="label-track-info">
        <div className="label-track-title-line">
          <span className="label-track-title">{track.title}</span>
          {track.isExplicit && <ExplicitBadge />}
        </div>
        <div className="label-track-sub">
          <span>{getArtistLine(track)}</span>
          <span>•</span>
          <span>{track.album?.title ?? '—'}</span>
          <span>•</span>
          <span className="label-track-genre">{track.genre}</span>
        </div>
      </div>

      <div className="label-track-meta">
        <span>{formatTime(track.duration)}</span>
        <span className="label-track-plays">{track.playCount} ▶</span>
      </div>

      <div className="label-track-lyrics-status" title={
        hasSyncedLyrics ? 'Караоке готово'
        : hasLyrics ? 'Есть plain-текст'
        : 'Текста нет'
      }>
        {hasSyncedLyrics ? '🎤' : hasLyrics ? '📝' : '—'}
      </div>

      <div className="label-track-actions">
        {!isAdmin && !hasLyrics && (
          <button
            className="label-track-btn"
            onClick={onFetchLyrics}
            disabled={isFetching}
            title="Подтянуть текст из lrclib"
          >
            {isFetching ? '...' : 'Текст'}
          </button>
        )}
        {!isAdmin && (
          <button
            className="label-track-btn"
            onClick={onKaraoke}
            title={hasSyncedLyrics ? 'Редактировать караоке' : 'Создать караоке'}
          >
            Караоке
          </button>
        )}
        {!isAdmin && (
            <button className="label-track-btn" onClick={onEdit} title="Редактировать">
            Редактировать
            </button>
        )}
        <button className="label-track-btn label-track-btn-danger" onClick={onDelete} title="Удалить">
          ✕
        </button>
      </div>
    </div>
  );
}