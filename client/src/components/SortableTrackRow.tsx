import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import LikeButton from './LikeButton';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import type { Track } from '../types';

interface Props {
  track: Track;
  isCurrent: boolean;
  isOwner?: boolean;
  isRecentlyDropped?: boolean;
  onPlay: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  togglePlay: () => void;
}

export default function SortableTrackRow({ 
  track, 
  isCurrent, 
  isOwner, 
  isRecentlyDropped, 
  onPlay, 
  onDelete, 
  togglePlay 
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`track-row-wrapper ${isDragging ? 'is-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div 
        className={`track-row ${isCurrent ? 'track-row-active' : ''} ${isRecentlyDropped ? 'is-dropped' : ''}`}
        onClick={() => { if (isCurrent) togglePlay(); else onPlay(); }}
      >
        <div className="track-row-left">
          <div className="track-row-cover">
            {track.title[0]?.toUpperCase() ?? '♪'}
          </div>
          <span className="track-row-title">{track.title}</span>
        </div>
        <div className="track-row-right" onPointerDown={(e) => e.stopPropagation()}>
          <LikeButton trackId={track.id} className="track-row-btn" />
          <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
          <span className="track-row-meta">
            {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
          </span>
          {isOwner && onDelete && (
            <button className="btn-remove-track" onClick={onDelete} title="Удалить">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}