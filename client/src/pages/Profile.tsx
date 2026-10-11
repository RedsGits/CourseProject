import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="empty-state">
        <h1>Вы не авторизованы</h1>
        <p className="muted">Войдите, чтобы увидеть профиль.</p>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="profile-page">
      <div className="profile-card">
        <img
          className="profile-avatar"
          src={user.avatarUrl || '/Defpfp.png'}
          alt={user.name ?? user.email}
        />
        <h1 className="profile-name">{user.name ?? 'Без имени'}</h1>
        <p className="profile-email">{user.email}</p>
        <span className="profile-role">{user.role}</span>

        <button onClick={handleLogout} className="btn-logout-profile">
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}