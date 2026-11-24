import { Link } from 'react-router-dom';
import type { Album } from '../types';
import TrackCover from './TrackCover';

interface Props {
  album: Album;
  showYear?: boolean;
}

export default function AlbumCard({ album, showYear = false }: Props) {
  return (
    <article className="library-card album-card">
      <Link to={`/album/${album.id}`} className="rec-album-cover-link" title={album.title}>
        <TrackCover coverUrl={album.coverUrl} alt={album.title} className="library-card-cover" />
      </Link>

      <div className="library-card-info">
        <Link to={`/album/${album.id}`} className="library-card-title rec-album-title-link">
          {album.title}
        </Link>

        <div className="library-card-sub rec-album-artists">
          {album.artists.length === 0 ? (
            <span>Неизвестно</span>
          ) : (
            album.artists.map((artist, index) => (
              <span key={artist.id}>
                {index > 0 && ', '}
                <Link to={`/artist/${artist.id}`} className="rec-album-artist">
                  {artist.name}
                </Link>
              </span>
            ))
          )}
          {showYear && album.year ? <span> • {album.year}</span> : null}
        </div>
      </div>
    </article>
  );
}
