import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import { useEffect } from 'react';
import { useArtists } from '../store/artists';
import Player from './Player';

const IconHome = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M4,19V10Q4,9.52 4.21,9.1Q4.43,8.67 4.8,8.4l6-4.5Q11.33,3.5 12,3.5t1.2,0.4l6,4.5q0.38,0.28 0.59,0.7Q20,9.52 20,10v9q0,0.82-0.59,1.41T18,21H15q-0.42,0-0.71-0.29Q14,20.43 14,20V15q0-0.43-0.29-0.71T13,14H11q-0.42,0-0.71,0.29T10,15v5q0,0.43-0.29,0.71T9,21H6q-0.82,0-1.41-0.59T4,19Z" />
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M9.5,16q-2.72,0-4.61-1.89Q3,12.23 3,9.5Q3,6.77 4.89,4.89T9.5,3t4.61,1.89T16,9.5q0,1.1-0.35,2.07T14.7,13.3l5.6,5.6q0.28,0.28 0.28,0.7q0,0.42-0.28,0.7q-0.27,0.27-0.7,0.27T18.9,20.3l-5.6-5.6q-0.75,0.6-1.72,0.95T9.5,16Zm0-2q1.88,0 3.19-1.31T14,9.5T12.69,6.31T9.5,5T6.31,6.31T5,9.5t1.31,3.19T9.5,14Z" />
  </svg>
);

const IconLibrary = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M12.5,15q1.05,0 1.78-0.73T15,12.5V7h2q0.43,0 0.71-0.29Q18,6.43 18,6T17.71,5.29T17,5H15q-0.42,0-0.71,0.29T14,6v4.5q-0.32-0.25-0.7-0.38T12.5,10q-1.05,0-1.77,0.72T10,12.5t0.73,1.77T12.5,15ZM8,18q-0.82,0-1.41-0.59T6,16V4Q6,3.17 6.59,2.59T8,2H20q0.83,0 1.41,0.59T22,4V16q0,0.82-0.59,1.41T20,18H8ZM4,22q-0.82,0-1.41-0.59T2,20V7Q2,6.57 2.29,6.29T3,6T3.71,6.29T4,7V20H17q0.43,0 0.71,0.29T18,21t-0.29,0.71T17,22H4Z" />
  </svg>
);

export default function Layout() {
  const { user } = useAuth();
  const { current } = usePlayer();
  
  const [avatarLoaded, setAvatarLoaded] = useState(false);

    const { fetchArtists } = useArtists();

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  return (
    <div className={`app ${current ? 'has-player' : ''}`}>
      <aside className="sidebar">
        <Link to="/" className="sidebar-logo" title="На главную">
          <img src="/Logonotext.png" className="logo-icon" />
          <span className="logo-text">DoeReMi</span>
        </Link>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon"><IconHome /></span>
            <span className="sidebar-link-text">На главную</span>
          </NavLink>
          
          <NavLink to="/search" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon"><IconSearch /></span>
            <span className="sidebar-link-text">Поиск</span>
          </NavLink>

          <NavLink to="/library" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon"><IconLibrary /></span>
            <span className="sidebar-link-text">Библиотека</span>
          </NavLink>
        </nav>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-right">
            {user ? (
              <Link to="/profile" className="header-user-block">
                <img
                  className={`header-avatar ${avatarLoaded ? 'loaded' : ''}`}
                  src={user.avatarUrl || '/Defpfp.png'}
                  alt={user.name ?? user.email}
                  onLoad={() => setAvatarLoaded(true)}
                />
                <span className="header-user-name">
                  {user.name ?? user.email}
                </span>
              </Link>
            ) : (
              <Link to="/login" className="btn-pill">
                Войти
              </Link>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <Player />
    </div>
  );
}