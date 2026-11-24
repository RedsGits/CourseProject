import { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import BrandLogo from '../components/BrandLogo';

const IconHeadphones = () => (
  <svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true">
    <path
      d="M10 38v-6a22 22 0 0 1 44 0v6"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <rect x="6" y="34" width="14" height="22" rx="6" fill="currentColor" />
    <rect x="44" y="34" width="14" height="22" rx="6" fill="currentColor" />
  </svg>
);

const IconPlaylist = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" aria-hidden="true">
    <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
  </svg>
);

const IconLike = () => (
  <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" aria-hidden="true">
    <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
  </svg>
);

export default function Landing() {
  const { user } = useAuth();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const apply = () => {
      const dpr = window.devicePixelRatio || 1;
      el.style.setProperty('--grid-line', `${1 / dpr}px`);
    };

    apply();
    window.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, []);

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-grid" ref={gridRef} />
        <div className="landing-grid-fade" />
      </div>

      <div className="landing-inner">
        <header className="landing-header">
          <BrandLogo className="landing-logo" />
        </header>

        <main className="landing-main">
          <h1 className="landing-title">Твой билет в мир музыки</h1>

          <Link className="landing-login" to="/login">
            <span>Войти</span>
          </Link>

          <section className="landing-features" aria-label="Возможности DoeReMi">
            <article className="landing-feature">
              <span className="landing-feature-icon"><IconHeadphones /></span>
              <h2>Прослушивание<br /> здесь и сейчас</h2>
            </article>

            <article className="landing-feature">
              <span className="landing-feature-icon"><IconPlaylist /></span>
              <h2>Быстрая и удобная<br /> настройка плейлистов</h2>
            </article>

            <article className="landing-feature">
              <span className="landing-feature-icon"><IconLike /></span>
              <h2>Персональные<br /> рекомендации</h2>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
