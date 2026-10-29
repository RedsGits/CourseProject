import { useState } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import { useEffect } from 'react';
import { useArtists } from '../store/artists';
import Player from './Player';

const IconHome = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const IconLibrary = () => (
  <svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor">
    <path d="m509-220 91-55 91 55-24-104 80-69-105-9-42-98-42 98-105 9 80 69-24 104ZM240-400v80h-80q-33 0-56.5-23.5T80-400v-400q0-33 23.5-56.5T160-880h400q33 0 56.5 23.5T640-800v80h-80v-80H160v400h80ZM400-80q-33 0-56.5-23.5T320-160v-400q0-33 23.5-56.5T400-640h400q33 0 56.5 23.5T880-560v400q0 33-23.5 56.5T800-80H400Zm0-80h400v-400H400v400Zm200-200Z" />
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