import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { LyricsResponse } from '../types';

interface Props {
  trackId: number;
  trackTitle: string;
  albumId: number;
  lyricsData: LyricsResponse | null;
  loading: boolean;
  hasSyncedLyrics: boolean;
  onClose: () => void;
  onOpenKaraoke: () => void;
}

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12,13.4L7.1,18.3q-0.28,0.27-0.7,0.27T5.7,18.3q-0.27-0.28-0.27-0.7T5.7,16.9L10.6,12L5.7,7.1Q5.43,6.82 5.43,6.4T5.7,5.7T6.4,5.43T7.1,5.7L12,10.6l4.9-4.9q0.27-0.27 0.7-0.27T18.3,5.7t0.27,0.7T18.3,7.1L13.4,12l4.9,4.9q0.27,0.28 0.27,0.7q0,0.42-0.27,0.7t-0.7,0.27T16.9,18.3L12,13.4Z" />
  </svg>
);

export default function LyricsPanel({
  trackTitle,
  albumId,
  lyricsData,
  loading,
  hasSyncedLyrics,
  onClose,
  onOpenKaraoke,
}: Props) {
  return (
    <motion.aside
      initial={{ x: 420 }}
      animate={{ x: 0 }}
      exit={{ x: 420 }}
      transition={{ type: 'tween', duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
      className="lyrics-panel"
    >
      <div className="lyrics-panel-header">
        <div className="lyrics-panel-header-info">
          <span className="lyrics-panel-type">Текст песни</span>
          <h3 className="lyrics-panel-title">
            <Link
              to={`/album/${albumId}`}
              className="lyrics-panel-title-link"
              title="Перейти к альбому"
              onClick={onClose}
            >
              {trackTitle}
            </Link>
          </h3>
        </div>
        <button className="lyrics-panel-close" onClick={onClose} title="Закрыть">
          <IconClose />
        </button>
      </div>

      {hasSyncedLyrics && (
        <button className="lyrics-karaoke-btn" onClick={onOpenKaraoke}>
          Режим караоке
        </button>
      )}

      <div className="lyrics-panel-body">
        {loading ? (
          <p className="muted">Загрузка текста...</p>
        ) : lyricsData?.lyrics ? (
          <div className="lyrics-plain">{lyricsData.lyrics}</div>
        ) : (
          <p className="muted">Текст для этого трека не найден</p>
        )}
      </div>
    </motion.aside>
  );
}