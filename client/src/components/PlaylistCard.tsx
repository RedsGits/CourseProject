import { Link } from 'react-router-dom';
import { resolveUploadUrl } from '../utils/media';
import { pluralRu } from '../utils/recommendations';

interface PlaylistCardData {
  id: number;
  name: string;
  coverUrl?: string | null;
  trackCount?: number;
  ownerName?: string | null;
}

export default function PlaylistCard({ playlist }: { playlist: PlaylistCardData }) {
  const cover = resolveUploadUrl(playlist.coverUrl);
  const trackCount = playlist.trackCount ?? 0;

  return (
    <Link to={`/playlist/${playlist.id}`} className="library-card playlist-card">
      <div className="library-card-cover">
        {cover ? (
          <img
            src={cover}
            alt={playlist.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="playlist-cover-placeholder">♫</div>
        )}
      </div>
      <div className="library-card-info">
        <div className="library-card-title">{playlist.name}</div>
        <div className="library-card-sub">
          {trackCount} {pluralRu(trackCount, 'трек', 'трека', 'треков')}
          {playlist.ownerName ? ` · ${playlist.ownerName}` : ''}
        </div>
      </div>
    </Link>
  );
}
