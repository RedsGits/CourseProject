import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/auth';

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const WarnIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function Register() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [localError, setLocalError] = useState<{ text: string; field: string | null } | null>(null);
  const { register, isLoading, error, errorField, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) {
      setLocalError({ text: 'Введите email', field: 'email' });
      return;
    }

    if (!emailRe.test(email.trim())) {
      setLocalError({ text: 'Некорректный email', field: 'email' });
      return;
    }

    if (!name.trim()) {
      setLocalError({ text: 'Введите имя', field: 'name' });
      return;
    }

    if (name.trim().length < 2) {
      setLocalError({ text: 'Имя не должно быть короче 2 символов', field: 'name' });
      return;
    }

    if (!password) {
      setLocalError({ text: 'Введите пароль', field: 'password' });
      return;
    }

    if (password.length < 6) {
      setLocalError({ text: 'Пароль не должен быть короче 6 символов', field: 'password' });
      return;
    }

    if (password !== passwordConfirm) {
      setLocalError({ text: 'Пароли не совпадают', field: 'passwordConfirm' });
      return;
    }

    const ok = await register(email, password, name.trim());
    if (ok) navigate('/');
  };

  const shownError = localError?.text ?? error;
  const shownField = localError?.field ?? errorField;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/Logo2.png" className="auth-logo"/>
        <h1>Регистрация</h1>
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={shownField === 'email' ? 'input-error' : ''}
              placeholder="Email"
              maxLength={100}
              autoFocus
            />
          </label>

          <label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={shownField === 'name' ? 'input-error' : ''}
              placeholder="Как к вам обращаться?"
              maxLength={30}
            />
          </label>

          <label>
            <div className="input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={shownField === 'password' ? 'input-error' : ''}
                placeholder="Пароль"
                maxLength={64}
                minLength={6}
              />
              <button
                type="button"
                className="input-eye"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <label>
            <div className="input-wrap">
              <input
                type={showPasswordConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={shownField === 'passwordConfirm' ? 'input-error' : ''}
                placeholder="Повторите пароль"
                maxLength={64}
                minLength={6}
              />
              <button
                type="button"
                className="input-eye"
                onClick={() => setShowPasswordConfirm((v) => !v)}
                tabIndex={-1}
                title={showPasswordConfirm ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPasswordConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          {shownError && (
            <div className="error-with-icon">
              <WarnIcon />
              <span>{shownError}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-hint">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}