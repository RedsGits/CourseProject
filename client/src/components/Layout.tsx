import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/auth';
import { usePlayer } from '../store/player';
import { useTheme } from '../store/theme';
import Player from './Player';
import BrandLogo from './BrandLogo';
import { resolveAvatarUrl } from '../utils/media';

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

const IconRecommendations = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M3,17v2h6v-2H3ZM3,5v2h10V5H3Zm10,16v-2h8v-2h-8v-2h-2v6h2ZM7,9v2H3v2h4v2h2V9H7Zm14,4v-2H11v2h10Zm-6-4h2V7h4V5h-4V3h-2v6Z" />
  </svg>
);

export default function Layout() {
  const { user } = useAuth();
  const { current } = usePlayer();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user?.role === 'LABEL') {
      navigate('/label');
    }
  }, [user, navigate]);
  
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [isTouchSidebar, setIsTouchSidebar] = useState(false);
  const [isTouchExpanded, setIsTouchExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const gestureRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    armed: false,
    dragging: false,
  });

  const closeTouchExpanded = () => {
    setIsTouchExpanded(false);
    if (sidebarRef.current) {
      sidebarRef.current.style.width = '';
      sidebarRef.current.style.transition = '';
    }
  };

  useEffect(() => {
    closeTouchExpanded();
  }, [location.pathname]);

  useEffect(() => {
    if (!isTouchExpanded) return;

    const handleOutsidePointer = (event: PointerEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        closeTouchExpanded();
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer, true);
  }, [isTouchExpanded]);

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
  }, []);

  const handleSidebarPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') {
      setIsTouchSidebar(false);
      closeTouchExpanded();
      return;
    }

    if (event.pointerType !== 'touch') return;
    if (!window.matchMedia('(min-width: 901px)').matches) return;

    setIsTouchSidebar(true);
    if (isTouchExpanded) {
      suppressClickRef.current = false;
      return;
    }

    suppressClickRef.current = false;
    const gesture = gestureRef.current;
    gesture.active = true;
    gesture.startX = event.clientX;
    gesture.startY = event.clientY;
    gesture.armed = false;
    gesture.dragging = false;

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      gesture.armed = true;
    }, 180);
  };

  const handleSidebarPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse') {
      setIsTouchSidebar(false);
      closeTouchExpanded();
      return;
    }

    if (event.pointerType !== 'touch') return;
    if (!window.matchMedia('(min-width: 901px)').matches) return;

    const gesture = gestureRef.current;
    if (!gesture.active || isTouchExpanded || !gesture.armed) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.1 || deltaX <= 4) return;

    if (!gesture.dragging) {
      gesture.dragging = true;
      suppressClickRef.current = true;
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = 'none';
      }
    }

    const width = Math.min(240, 80 + deltaX * 1.5);
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${width}px`;
    }

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handleSidebarPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return;
    if (!window.matchMedia('(min-width: 901px)').matches) return;

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const gesture = gestureRef.current;
    if (!gesture.active) return;

    if (gesture.dragging) {
      const currentWidth = parseFloat(sidebarRef.current?.style.width || '80') || 80;
      setIsTouchExpanded(currentWidth >= 150);
      if (sidebarRef.current) {
        sidebarRef.current.style.width = '';
        sidebarRef.current.style.transition = '';
      }
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    }

    gesture.active = false;
    gesture.armed = false;
    gesture.dragging = false;
  };

  const handleSidebarPointerCancel = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    gestureRef.current.active = false;
    gestureRef.current.armed = false;
    gestureRef.current.dragging = false;
    suppressClickRef.current = false;
    if (sidebarRef.current) {
      sidebarRef.current.style.width = '';
      sidebarRef.current.style.transition = '';
    }
  };

  const handleSidebarClickCapture = (event: React.MouseEvent) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClickRef.current = false;
    }
  };

  return (
    <motion.div className={`app ${current ? 'has-player' : ''}`} layoutScroll>
      <aside
        className={`sidebar ${isTouchSidebar ? 'is-touch' : ''} ${isTouchExpanded ? 'is-touch-expanded' : ''}`}
        ref={sidebarRef}
        onPointerDown={handleSidebarPointerDown}
        onPointerMove={handleSidebarPointerMove}
        onPointerUp={handleSidebarPointerUp}
        onPointerCancel={handleSidebarPointerCancel}
        onClickCapture={handleSidebarClickCapture}
      >
        <Link to="/" className="sidebar-logo" title="На главную">
          <BrandLogo variant="icon" className="logo-icon" />
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

          <NavLink to="/recommendations" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-icon"><IconRecommendations /></span>
            <span className="sidebar-link-text">Рекомендации</span>
          </NavLink>
        </nav>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-right">
            <button
              type="button"
              className="header-theme-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
            >
              {theme === 'light' ? <IconMoon /> : <IconSun />}
            </button>
            {user?.role === 'ADMIN' && (
              <Link to="/label" className="btn-pill" style={{ marginRight: '12px' }}>
                Админ-панель
              </Link>
            )}
            {user ? (
              <Link to="/profile" className="header-user-block">
                <img
                  className={`header-avatar ${avatarLoaded ? 'loaded' : ''}`}
                  src={resolveAvatarUrl(user.avatarUrl)}
                  alt={user.name ?? user.email}
                  onLoad={() => setAvatarLoaded(true)}
                  onError={(event) => {
                    if (!event.currentTarget.src.includes('Defpfp')) {
                      event.currentTarget.src = '/Defpfp.png';
                    }
                  }}
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
    </motion.div>
  );
}