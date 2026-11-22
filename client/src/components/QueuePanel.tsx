import { Link } from 'react-router-dom';
import type { Track } from '../types';
import TrackCover from './TrackCover';
import ExplicitBadge from './ExplicitBadge';
import PlayingBars from './PlayingBars';
import { getArtistLine } from '../api/track';

interface Props {
  current: Track;
  upcoming: Track[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPlayTrack: (trackId: number) => void;
  onRemoveTrack: (trackId: number) => void;
  onNavigateToAlbum: () => void;
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function QueuePanel({
  current,
  upcoming,
  isPlaying,
  onTogglePlay,
  onPlayTrack,
  onRemoveTrack,
  onNavigateToAlbum,
}: Props) {
  return (
    <div className="queue-panel">
      <section className="queue-section">
        <h2 className="queue-section-title">Сейчас играет</h2>

        <div
          className="queue-track-row queue-track-row-current"
          onClick={onTogglePlay}
          title={isPlaying ? 'Пауза' : 'Продолжить'}
        >
          <TrackCover coverUrl={current.album?.coverUrl} alt={current.title} className="queue-track-cover">
            <span className="queue-eq">
              <PlayingBars active={isPlaying} />
            </span>
          </TrackCover>

          <div className="queue-track-info">
            <span className="track-title-line">
              <Link
                to={`/album/${current.albumId}`}
                className="track-title-link"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToAlbum();
                }}
              >
                <span className="queue-track-title">{current.title}</span>
              </Link>
              {current.isExplicit && <ExplicitBadge />}
            </span>
            <span className="queue-track-artist">{getArtistLine(current)}</span>
          </div>

          <span className="queue-track-duration">{formatTime(current.duration)}</span>
        </div>
      </section>

      <section className="queue-section queue-section-next">
        <h2 className="queue-section-title">
          Далее в очереди
          {upcoming.length > 0 && <span className="queue-count">{upcoming.length}</span>}
        </h2>

        {upcoming.length === 0 ? (
          <p className="muted queue-empty">Это последний трек в очереди</p>
        ) : (
          <div className="queue-list">
            {upcoming.map((track) => (
              <div
                key={track.id}
                className="queue-track-row"
                onClick={() => onPlayTrack(track.id)}
                title="Воспроизвести"
              >
                <TrackCover coverUrl={track.album?.coverUrl} alt={track.title} className="queue-track-cover" />

                <div className="queue-track-info">
                  <span className="track-title-line">
                    <Link
                      to={`/album/${track.albumId}`}
                      className="track-title-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToAlbum();
                      }}
                    >
                      <span className="queue-track-title">{track.title}</span>
                    </Link>
                    {track.isExplicit && <ExplicitBadge />}
                  </span>
                  <span className="queue-track-artist">{getArtistLine(track)}</span>
                </div>

                <span className="queue-track-duration">{formatTime(track.duration)}</span>

                <button
                  className="queue-track-remove"
                  title="Убрать из очереди"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTrack(track.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
