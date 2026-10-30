import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { usePlayer } from '../store/player';
import type { Track, Artist } from '../types';
import LikeButton from '../components/LikeButton';
import AddToPlaylistMenu from '../components/AddToPlaylistMenu';
import { useArtists } from '../store/artists';

interface Album { id: number; title: string; artistId: number; }
interface Playlist { id: number; name: string; isPublic: boolean; coverUrl?: string | null; }

const IconSearchBig = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M9.5,16q-2.72,0-4.61-1.89Q3,12.23 3,9.5Q3,6.77 4.89,4.89T9.5,3t4.61,1.89T16,9.5q0,1.1-0.35,2.07T14.7,13.3l5.6,5.6q0.28,0.28 0.28,0.7q0,0.42-0.28,0.7q-0.27,0.27-0.7,0.27T18.9,20.3l-5.6-5.6q-0.75,0.6-1.72,0.95T9.5,16Zm0-2q1.88,0 3.19-1.31T14,9.5T12.69,6.31T9.5,5T6.31,6.31T5,9.5t1.31,3.19T9.5,14Z" />
  </svg>
);

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12,13.4L7.1,18.3q-0.28,0.27-0.7,0.27T5.7,18.3q-0.27-0.28-0.27-0.7T5.7,16.9L10.6,12L5.7,7.1Q5.43,6.82 5.43,6.4T5.7,5.7T6.4,5.43T7.1,5.7L12,10.6l4.9-4.9q0.27-0.27 0.7-0.27T18.3,5.7t0.27,0.7T18.3,7.1L13.4,12l4.9,4.9q0.27,0.28 0.27,0.7q0,0.42-0.27,0.7t-0.7,0.27T16.9,18.3L12,13.4Z" />
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
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'artists' | 'tracks' | 'albums' | 'playlists'>('all');
  
  const { setTrack, current, isPlaying, togglePlay } = usePlayer();

  const { artistsMap } = useArtists();

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
        <img 
          src="/Logo2.png" 
          alt="DoeReMi" 
          className={`search-hero-logo ${logoLoaded ? 'loaded' : ''}`}
          onLoad={() => setLogoLoaded(true)}
        />
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
                                  else setTrack(track, results.tracks!, 'search');
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

                                  <div className="track-row-info">
                                    <span className="track-row-title">{track.title}</span>
                                    <Link 
                                      to={`/artist/${track.artistId}`} 
                                      className="track-row-artist"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {artistsMap[track.artistId] || '...'}
                                    </Link>
                                  </div>
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
                            else setTrack(track, results.tracks!, 'search');
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

                            <div className="track-row-info">
                              <span className="track-row-title">{track.title}</span>
                              <Link 
                                to={`/artist/${track.artistId}`} 
                                className="track-row-artist"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {artistsMap[track.artistId] || '...'}
                              </Link>
                            </div>
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