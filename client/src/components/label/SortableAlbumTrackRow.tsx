import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Track } from '../../types';
import { useAuth } from '../../store/auth';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  track: Track;
  index: number;
  onEdit: () => void;
  onKaraoke: () => void;
  onDelete: () => void;
}

export default function SortableAlbumTrackRow({ track, index, onEdit, onKaraoke, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    opacity: isDragging ? 0.8 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`album-detail-track-row ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="album-detail-track-num">{index + 1}</div>

      <div className="album-detail-track-info">
        <span className="album-detail-track-title">{track.title}</span>
        <span className="album-detail-track-meta">
          {track.genre} • {formatTime(track.duration)}
          {track.lyrics ? ' • 📝' : ''}
          {track.syncedLyrics ? ' 🎤' : ''}
        </span>
      </div>

      <div className="album-detail-track-actions" onPointerDown={(e) => e.stopPropagation()}>
        {!isAdmin && track.lyrics && (
          <button className="label-track-btn" onClick={(e) => { e.stopPropagation(); onKaraoke(); }}>
            🎤
          </button>
        )}
        {!isAdmin && (
          <button className="label-track-btn" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            Редактировать
          </button>
        )}
        <button className="label-track-btn label-track-btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          ✕
        </button>
      </div>
    </div>
  );
}