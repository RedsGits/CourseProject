import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { useTheme, type Theme } from '../store/theme';
import { resolveAvatarUrl } from '../utils/media';
import type { User } from '../types';

const ROLE_LABELS: Record<string, string> = {
  USER: 'Слушатель',
  LABEL: 'Лейбл',
  ADMIN: 'Администратор',
};

const IconSun = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M20.3 14.6A8.5 8.5 0 0 1 9.4 3.7 8.5 8.5 0 1 0 20.3 14.6Z" />
  </svg>
);

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name ?? '');
  }, [user?.name]);

  useEffect(() => {
    if (!user) return;
    api.get<{ user: User }>('/auth/me')
      .then(({ data }) => {
        updateUser(data.user);
        setName(data.user.name ?? '');
      })
      .catch(() => {});
  }, [updateUser, user?.id]);

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

  const handleNameSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setNameError(null);
    setNameSuccess(null);

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Имя не должно быть короче 2 символов');
      return;
    }
    if (trimmed.length > 30) {
      setNameError('Имя слишком длинное');
      return;
    }
    if (trimmed === (user.name ?? '')) {
      setNameSuccess('Имя не изменилось');
      return;
    }

    setNameSaving(true);
    try {
      const { data } = await api.patch<{ user: User }>('/auth/profile', { name: trimmed });
      updateUser(data.user);
      setName(data.user.name ?? '');
      setNameSuccess('Имя обновлён');
    } catch (err: any) {
      setNameError(err.response?.data?.error || 'Не удалось сохранить никнейм');
    } finally {
      setNameSaving(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setAvatarError(null);
    if (!file.type.startsWith('image/')) {
      setAvatarError('Можно загрузить только изображение');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Файл слишком большой — максимум 5 МБ');
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setAvatarUploading(true);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const { data } = await api.post<{ user: User }>('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(data.user);
    } catch (err: any) {
      setAvatarError(err.response?.data?.error || 'Не удалось загрузить аватар');
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(preview);
      setAvatarPreview(null);
    }
  };

  const handleAvatarDelete = async () => {
    if (!user.avatarUrl) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const { data } = await api.delete<{ user: User }>('/auth/avatar');
      updateUser(data.user);
    } catch (err: any) {
      setAvatarError(err.response?.data?.error || 'Не удалось удалить аватар');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Введите текущий пароль');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль должен быть не короче 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Пароль изменён');
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Не удалось изменить пароль');
    } finally {
      setPasswordSaving(false);
    }
  };

  const avatarSrc = resolveAvatarUrl(avatarPreview ?? user.avatarUrl);

  return (
    <div className="account-page">
      <header className="home-header">
        <h1>Ваш аккаунт</h1>
      </header>

      <div className="account-grid">
        <section className="account-card account-identity">
          <div className="account-avatar-wrap">
            <img
              className="account-avatar"
              src={avatarSrc}
              alt={user.name ?? user.email}
              onError={(event) => {
                if (!event.currentTarget.src.includes('Defpfp')) {
                  event.currentTarget.src = '/Defpfp.png';
                }
              }}
            />
            <div className="account-avatar-overlay">
              <button
                type="button"
                className="account-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
              >
                {avatarUploading ? 'Загрузка...' : 'Сменить фото'}
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  className="account-avatar-btn account-avatar-btn-ghost"
                  onClick={handleAvatarDelete}
                  disabled={avatarUploading}
                >
                  Удалить
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="account-file-input"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="account-identity-info">
            <h2>{user.name ?? 'Без имени'}</h2>
            <p className="account-email">{user.email}</p>
            <span className="account-role">{ROLE_LABELS[user.role] ?? user.role}</span>
          </div>

          {avatarError && <div className="error account-message">{avatarError}</div>}


          <button onClick={handleLogout} className="btn-logout-profile">
            Выйти из аккаунта
          </button>
        </section>

        <section className="account-card">
          <h2>Имя</h2>

          <form className="account-form" onSubmit={handleNameSubmit}>
            <label className="account-label">
              <input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameError(null);
                  setNameSuccess(null);
                }}
                maxLength={30}
                placeholder="Как вас называть?"
              />
            </label>

            {nameError && <div className="error">{nameError}</div>}
            {nameSuccess && <div className="rec-success">{nameSuccess}</div>}

            <div className="account-form-actions">
              <button type="submit" className="btn-pill" disabled={nameSaving}>
                {nameSaving ? 'Сохраняем...' : 'Сохранить'}
              </button>
            </div>
          </form>
        </section>

        <section className="account-card">
          <h2>Пароль</h2>

          <form className="account-form" onSubmit={handlePasswordSubmit}>
            <label className="account-label">
              Текущий пароль
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            <label className="account-label">
              Новый пароль
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Минимум 6 символов"
              />
            </label>

            <label className="account-label">
              Повторите новый пароль
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder="Ещё раз"
              />
            </label>

            {passwordError && <div className="error">{passwordError}</div>}
            {passwordSuccess && <div className="rec-success">{passwordSuccess}</div>}

            <div className="account-form-actions">
              <button type="submit" className="btn-pill" disabled={passwordSaving}>
                {passwordSaving ? 'Меняем...' : 'Изменить пароль'}
              </button>
            </div>
          </form>
        </section>

        <section className="account-card">
          <h2>Оформление</h2>

          <div className="theme-options">
            {([
              { id: 'dark' as Theme, title: 'Тёмная', icon: <IconMoon /> },
              { id: 'light' as Theme, title: 'Светлая', icon: <IconSun /> },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                className={`theme-option ${theme === option.id ? 'is-active' : ''}`}
                onClick={() => setTheme(option.id)}
              >
                <span className={`theme-preview theme-preview--${option.id}`} aria-hidden="true">
                  <span className="theme-preview-sidebar" />
                  <span className="theme-preview-card" />
                  <span className="theme-preview-card theme-preview-card-small" />
                </span>
                <span className="theme-option-title">{option.icon}{option.title}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
