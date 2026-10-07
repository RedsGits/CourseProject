import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import Player from './Player';

export default function Layout() {
  const { user, logout } = useAuth();
  const { current } = usePlayer();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`app ${current ? 'has-player' : ''}`}>
      <aside className="sidebar">
        <button
          className="sidebar-logo"
          onClick={() => navigate('/')}
          title="На главную"
        >
          <img src="/Logonotext.png" alt="Music Stream" />
        </button>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-right">
            {user ? (
              <>
                <span className="header-user">
                  {user.name ?? user.email}
                </span>
                <button onClick={handleLogout} className="btn-pill">
                  Выйти
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="btn-pill"
              >
                Войти
              </button>
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