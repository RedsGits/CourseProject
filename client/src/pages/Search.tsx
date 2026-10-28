import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import type { Track, Artist } from '../types';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';

interface Album { id: number; title: string; artistId: number; }
interface Playlist { id: number; name: string; isPublic: boolean; coverUrl?: string | null; }

const IconSearchBig = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

interface SearchResults {
  query: string;
  tracks?: Track[];
  artists?: Artist[];
  albums?: Album[];
  playlists?: Playlist[];
}

function ScrollRow({ 
  title, 
  children, 
  onTitleClick 
}: { 
  title: string; 
  children: React.ReactNode; 
  onTitleClick?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    const timer = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScroll);
    };
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth : current.offsetWidth;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const showArrows = showLeft || showRight;

  return (
    <section className="section scroll-row-section">
      <div className="scroll-row-header">
        <h2 
          onClick={onTitleClick} 
          className={onTitleClick ? 'clickable-title' : ''}
        >
          {title}
        </h2>
        {showArrows && (
          <div className="scroll-row-arrows">
            {showLeft && <button onClick={() => scroll('left')}><IconChevronLeft /></button>}
            {showRight && <button onClick={() => scroll('right')}><IconChevronRight /></button>}
          </div>
        )}
      </div>
      <div className="scroll-row-content" ref={scrollRef} onScroll={checkScroll}>
        {children}
      </div>
    </section>
  );
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'artists' | 'tracks' | 'albums' | 'playlists'>('all');
  
  const { setTrack, current, isPlaying, togglePlay } = usePlayer();

  const isActive = isFocused || query.length > 0;

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`);
        setResults(data);
        setActiveTab('all');
      } catch (error) {
        console.error('Ошибка поиска:', error);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const hasAnyResults = results && (
    (results.tracks?.length ?? 0) > 0 || 
    (results.artists?.length ?? 0) > 0 || 
    (results.albums?.length ?? 0) > 0 || 
    (results.playlists?.length ?? 0) > 0
  );

  return (
    <div className={`search-page ${isActive ? 'is-active' : ''}`}>
      
      <div className="search-hero">
        <img src="/Logo2.png" alt="DoeReMi" className="search-hero-logo" />
      </div>

      <div className="search-input-wrap">
        <span className="search-input-icon">
          <IconSearchBig />
        </span>
        <input
          type="text"
          placeholder="Что хотите послушать?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {query.length > 0 && (
          <button className="search-clear-btn" onClick={() => setQuery('')}>
            <IconClose />
          </button>
        )}
      </div>

      {isActive && query.trim() && (
        <div className="search-tabs">
          {['all', 'artists', 'tracks', 'albums', 'playlists'].map((tab) => (
            <button
              key={tab}
              className={`search-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab as any)}
            >
              {tab === 'all' && 'Лучшее'}
              {tab === 'artists' && 'Исполнители'}
              {tab === 'tracks' && 'Треки'}
              {tab === 'albums' && 'Альбомы'}
              {tab === 'playlists' && 'Плейлисты'}
            </button>
          ))}
        </div>
      )}

      <div className="search-results-container">
        {results && !isSearching && (
          <>
            {!hasAnyResults && (
              <div className="search-empty">
                <h2>Ничего не найдено</h2>
                <p>По запросу «{results.query}» ничего нет. Попробуйте изменить запрос.</p>
              </div>
            )}

            {hasAnyResults && (
              <div style={{ marginTop: '24px' }}>
                
                {activeTab === 'all' && (
                  <>
                    {results.tracks && results.tracks.length > 0 && (
                      <section className="section">
                        <h2 
                          onClick={() => setActiveTab('tracks')} 
                          className="clickable-title"
                        >
                          Треки
                        </h2>
                        <div className={`search-tracks-list ${results.tracks.slice(0, 6).length > 3 ? 'two-cols' : 'one-col'}`}>
                          {results.tracks.slice(0, 6).map((track) => {
                            const isCurrent = current?.id === track.id;
                            const isActuallyPlaying = isCurrent && isPlaying;
                            
                            return (
                              <div
                                key={track.id}
                                className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
                                onClick={() => {
                                  if (isCurrent) togglePlay();
                                  else setTrack(track, results.tracks!);
                                }}
                              >
                                <div className="track-row-left">
                                  <div className="track-row-cover">
                                    {track.title[0]?.toUpperCase() ?? '♪'}
                                    <div className="track-row-play-overlay">
                                      {isActuallyPlaying ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                                        </svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                  <span className="track-row-title">{track.title}</span>
                                </div>
                                <div className="track-row-right">
                                  <LikeButton trackId={track.id} className="track-row-btn" />
                                  <AddToPlaylistMenu trackId={track.id} className="track-row-btn" />
                                  <span className="track-row-meta">
                                    {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {results.artists && results.artists.length > 0 && (
                      <ScrollRow title="Исполнители" onTitleClick={() => setActiveTab('artists')}>
                        {results.artists.slice(0, 10).map((artist) => (
                          <Link key={artist.id} to={`/artist/${artist.id}`} className="library-card artist-card">
                            <div className="library-card-cover">
                              <img src="/Defpfp.png" alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div className="library-card-info">
                              <div className="library-card-title">{artist.name}</div>
                            </div>
                          </Link>
                        ))}
                      </ScrollRow>
                    )}

                    {results.albums && results.albums.length > 0 && (
                      <ScrollRow title="Альбомы" onTitleClick={() => setActiveTab('albums')}>
                        {results.albums.slice(0, 10).map((album) => (
                          <div key={album.id} className="library-card">
                            <div className="library-card-cover">
                              <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                              </svg>
                            </div>
                            <div className="library-card-info">
                              <div className="library-card-title">{album.title}</div>
                            </div>
                          </div>
                        ))}
                      </ScrollRow>
                    )}

                    {results.playlists && results.playlists.length > 0 && (
                      <ScrollRow title="Плейлисты" onTitleClick={() => setActiveTab('playlists')}>
                        {results.playlists.slice(0, 10).map((playlist) => (
                          <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="library-card">
                            <div className="library-card-cover">
                              {playlist.coverUrl ? (
                                <img 
                                  src={`http://localhost:5000/uploads/${playlist.coverUrl}`} 
                                  alt={playlist.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                                </svg>
                              )}
                            </div>
                            <div className="library-card-info">
                              <div className="library-card-title">{playlist.name}</div>
                            </div>
                          </Link>
                        ))}
                      </ScrollRow>
                    )}
                  </>
                )}

                {activeTab === 'artists' && results.artists && (
                  <div className="library-grid">
                    {results.artists.map((artist) => (
                      <Link key={artist.id} to={`/artist/${artist.id}`} className="library-card artist-card">
                        <div className="library-card-cover">
                          <img src="/Defpfp.png" alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div className="library-card-info">
                          <div className="library-card-title">{artist.name}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {activeTab === 'tracks' && results.tracks && (
                  <div className="search-tracks-list one-col" style={{ marginTop: '24px' }}>
                    {results.tracks.map((track) => {
                      const isCurrent = current?.id === track.id;
                      const isActuallyPlaying = isCurrent && isPlaying;
                      
                      return (
                        <div
                          key={track.id}
                          className={`track-row ${isCurrent ? 'track-row-active' : ''}`}
                          onClick={() => {
                            if (isCurrent) togglePlay();
                            else setTrack(track, results.tracks!);
                          }}
                        >
                          <div className="track-row-left">
                            <div className="track-row-cover">
                              {track.title[0]?.toUpperCase() ?? '♪'}
                              <div className="track-row-play-overlay">
                                {isActuallyPlaying ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="track-row-title">{track.title}</span>
                          </div>
                          <span className="track-row-meta">
                            {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'albums' && results.albums && results.albums.length > 0 && (
                  <div className="library-grid">
                    {results.albums.map((album) => (
                      <div key={album.id} className="library-card">
                        <div className="library-card-cover">
                          <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
                          </svg>
                        </div>
                        <div className="library-card-info">
                          <div className="library-card-title">{album.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'playlists' && results.playlists && results.playlists.length > 0 && (
                  <div className="library-grid">
                    {results.playlists.map((playlist) => (
                      <Link key={playlist.id} to={`/playlist/${playlist.id}`} className="library-card">
                        <div className="library-card-cover">
                          {playlist.coverUrl ? (
                            <img 
                              src={`http://localhost:5000/uploads/${playlist.coverUrl}`} 
                              alt={playlist.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <svg viewBox="0 0 24 24" width="48" height="48" fill="#fff">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          )}
                        </div>
                        <div className="library-card-info">
                          <div className="library-card-title">{playlist.name}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {activeTab === 'albums' && (!results.albums || results.albums.length === 0) && (
                   <p className="muted">Альбомы не найдены</p>
                )}
                {activeTab === 'playlists' && (!results.playlists || results.playlists.length === 0) && (
                   <p className="muted">Плейлисты не найдены</p>
                )}

              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}