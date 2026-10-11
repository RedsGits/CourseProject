import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import Player from './Player';

export default function Layout() {
  const { user } = useAuth();
  const { current } = usePlayer();
  const navigate = useNavigate();

  return (
    <div className={`app ${current ? 'has-player' : ''}`}>
      <aside className="sidebar">
        <button
          className="sidebar-logo"
          onClick={() => navigate('/')}
          title="На главную"
        >
          <img src="/Logonotext.png"/>
        </button>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-right">
            {user ? (
              <Link to="/profile" className="header-user-block">
                <img
                  className="header-avatar"
                  src={user.avatarUrl || '/Defpfp.png'}
                  alt={user.name ?? user.email}
                  onLoad={(e) => e.currentTarget.classList.add('loaded')}
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