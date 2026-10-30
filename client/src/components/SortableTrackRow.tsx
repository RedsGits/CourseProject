import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import LikeButton from './LikeButton';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { useArtists } from '../store/artists';
import type { Track } from '../types';

const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M8,17.18V6.82Q8,6.4 8.3,6.11Q8.6,5.82 9,5.82q0.13,0 0.26,0.04T9.53,5.97l8.15,5.18q0.23,0.15 0.34,0.38q0.11,0.23 0.11,0.48t-0.11,0.47t-0.34,0.38L9.53,18.02Q9.4,18.1 9.26,18.14Q9.13,18.18 9,18.18q-0.4,0-0.7-0.29T8,17.18Z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M16,19q-0.82,0-1.41-0.59T14,17V7q0-0.82 0.59-1.41T16,5q0.82,0 1.41,0.59Q18,6.18 18,7V17q0,0.82-0.59,1.41T16,19ZM8,19q-0.82,0-1.41-0.59T6,17V7Q6,6.18 6.59,5.59T8,5Q8.83,5 9.41,5.59Q10,6.18 10,7V17q0,0.82-0.59,1.41Q8.83,19 8,19Z" />
  </svg>
);

interface Props {
  track: Track;
  isCurrent: boolean;
  isPlaying: boolean;
  isOwner?: boolean;
  isRecentlyDropped?: boolean;
  onPlay: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  togglePlay: () => void;
}

export default function SortableTrackRow({ 
  track, 
  isCurrent, 
  isPlaying,
  isOwner, 
  isRecentlyDropped, 
  onPlay, 
  onDelete, 
  togglePlay 
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const { artistsMap } = useArtists();
  
  const artistName = artistsMap[track.artistId] || '...';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
    opacity: isDragging ? 0.8 : 1,
    cursor: isOwner ? 'grab' : 'pointer', 
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`track-row-wrapper ${isDragging ? 'is-dragging' : ''}`}
      {...(isOwner ? attributes : {})}
      {...(isOwner ? listeners : {})}
    >
      <div 
        className={`track-row ${isCurrent ? 'track-row-active' : ''} ${isRecentlyDropped ? 'is-dropped' : ''}`}
        onClick={() => { if (isCurrent) togglePlay(); else onPlay(); }}
      >
        <div className="track-row-left">
          <div className="track-row-cover">
            {track.title[0]?.toUpperCase() ?? '♪'}
            <div className="track-row-play-overlay">
              {isPlaying ? <IconPause /> : <IconPlay />}
            </div>
          </div>
          
          <div className="track-row-info">
            <span className="track-row-title">{track.title}</span>
            <Link 
              to={`/artist/${track.artistId}`} 
              className="track-row-artist"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {artistName}
            </Link>
          </div>
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