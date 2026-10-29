import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import LikeButton from './LikeButton';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import { useArtists } from '../store/artists';
import type { Track } from '../types';

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
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