import { Link } from 'react-router-dom';
import type { Track } from '../types';
import { usePlayer } from '../store/player';
import TrackCover from './TrackCover';
import LikeButton from './LikeButton';
import AddToPlaylistMenu from './AddToPlaylistMenu';
import ExplicitBadge from './ExplicitBadge';
import PlayingBars from './PlayingBars';

interface Props {
  tracks: Track[];
  contextId: string;
  columns?: 1 | 2;
}

function formatDuration(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export default function TrackList({ tracks, contextId, columns = 2 }: Props) {
  const { setTrack, current, isPlaying, togglePlay } = usePlayer();

  if (tracks.length === 0) return null;

  return (
    <div className={`search-tracks-list ${columns === 2 ? 'two-cols' : 'one-col'}`}>
      {tracks.map((track) => {
        const isCurrent = current?.id === track.id;
        const isActuallyPlaying = isCurrent && isPlaying;

        return (
          <div
            key={track.id}
            className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
            onClick={() => {
              if (isCurrent) togglePlay();
              else setTrack(track, tracks, contextId);
            }}
          >
            <div className="track-row-left">
              <TrackCover coverUrl={track.album?.coverUrl} alt={track.title}>
                {isCurrent ? (
                  <div className="track-row-play-overlay is-now-playing">
                    <PlayingBars active={isActuallyPlaying} />
                  </div>
                ) : (
                  <div className="track-row-play-overlay">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </TrackCover>

              <div className="track-row-info">
                <span className="track-title-line">
                  <Link
                    to={`/album/${track.albumId}`}
                    className="track-title-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="track-row-title">{track.title}</span>
                  </Link>
                  {track.isExplicit && <ExplicitBadge />}
                </span>
                <div className="track-row-artist-line">
                  {track.artists?.map((artist, index) => (
                    <span key={artist.id}>
                      {index > 0 && ', '}
                      <Link
                        to={`/artist/${artist.id}`}
                        className="track-row-artist"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {artist.name}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="track-row-right">
              <LikeButton trackId={track.id} className="track-row-btn" />
              <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
              <span className="track-row-meta">{formatDuration(track.duration)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
