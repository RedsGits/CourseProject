import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../store/player';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PREV_SEEK_THRESHOLD = 5;
const FADE_DURATION = 0.4;

const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
const IconPrev = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M6 6h2v12H6zM20 6v12l-9-6z" />
  </svg>
);
const IconNext = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M16 6h2v12h-2zM4 6l9 6-9 6z" />
  </svg>
);
const IconShuffle = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>
);
const IconRepeat = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </svg>
);
const IconHeart = ({ filled }: { filled: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  </svg>
);
const IconVolume = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    {muted ? (
      <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
    ) : (
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    )}
  </svg>
);

const VOLUME_KEY = 'player.volume';
const MUTED_KEY = 'player.muted';

function loadVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY);
  if (raw === null) return 1;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
}

function loadMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === 'true';
}

export default function Player() {
  const {current, next, prev, currentIndex, fadeIn, shuffle, repeat, toggleShuffle, toggleRepeat,} = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(loadVolume);
  const [isMuted, setIsMuted] = useState(loadMuted);
  const [isLiked, setIsLiked] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  const fadeInRef = useRef(fadeIn);
  fadeInRef.current = fadeIn;
  const [artistName, setArtistName] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.load();
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [current]);

  useEffect(() => {
    if (!current) {
      setArtistName(null);
      return;
    }
    api
      .get<{ name: string }>(`/artists/${current.artistId}`)
      .then((r) => setArtistName(r.data.name))
      .catch(() => setArtistName('Неизвестный артист'));
  }, [current]);

  const applyVolumeWithFade = (audio: HTMLAudioElement) => {
    const base = isMutedRef.current ? 0 : volumeRef.current;
    const d = audio.duration;
    const t = audio.currentTime;

    if (!d || !Number.isFinite(d) || d < FADE_DURATION * 2) {
      audio.volume = base;
      return;
    }

    const fadeInMultiplier = fadeInRef.current
      ? Math.min(1, t / FADE_DURATION)
      : 1;

    const fadeOut = Math.min(1, (d - t) / FADE_DURATION);

    const multiplier = Math.min(fadeInMultiplier, fadeOut);

    audio.volume = base * multiplier;
  };

  useEffect(() => {
    if (!current) return;
    let rafId: number;

    const tick = () => {
      const audio = audioRef.current;
      if (audio && !isSeeking) {
        setCurrentTime(audio.currentTime);
        applyVolumeWithFade(audio);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [current, isSeeking]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    applyVolumeWithFade(audio);
  }, [volume, isMuted, current]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    localStorage.setItem(MUTED_KEY, String(isMuted));
  }, [isMuted]);

  if (!current) return null;

  const streamUrl = `http://localhost:5000/api/tracks/${current.id}/stream`;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const isFirstInQueue = currentIndex <= 0;
  const canGoPrevByTrack = !isFirstInQueue;
  const shouldSeekToStart = currentTime >= PREV_SEEK_THRESHOLD;
  const isPrevDisabled = isFirstInQueue && !shouldSeekToStart;

  const handlePrev = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (shouldSeekToStart) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (canGoPrevByTrack) {
      prev();
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(e.target.value));
  };

  const commitSeek = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = currentTime;
    }
    setIsSeeking(false);
  };

  const handleSeekKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();

      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const newTime = Math.max(0, Math.min(duration, currentTime + delta));

      audio.currentTime = newTime;
      setCurrentTime(newTime);

      setIsSeeking(false);
    }
  };

  return (
    <div className="player">
      <audio
        ref={audioRef}
        src={streamUrl}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          if (repeat === 'one') {
              const audio = audioRef.current;
              if (audio) {
              audio.currentTime = 0;
              audio.play();
              }
          } else {
              next();
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="player-content">
        <div className="player-left">
          <div className="player-cover">
            {current.title[0]?.toUpperCase() ?? '♪'}
          </div>
          <div className="player-info">
            <div className="player-title">{current.title}</div>
            <Link to={`/artist/${current.artistId}`} className="player-artist">
              {artistName ?? '...'}
            </Link>
          </div>
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button
              className={`player-btn ${shuffle ? 'is-active' : ''}`}
              onClick={toggleShuffle}
              title={shuffle ? 'Перемешивание включено' : 'Перемешать'}
            >
              <IconShuffle />
            </button>
            <button
              className={`player-btn ${isPrevDisabled ? 'is-disabled' : ''}`}
              onClick={handlePrev}
              disabled={isPrevDisabled}
              title={shouldSeekToStart ? 'В начало трека' : 'Предыдущий'}
            >
              <IconPrev />
            </button>
            <button className="player-play" onClick={togglePlay} title={isPlaying ? 'Пауза' : 'Играть'}>
              {isPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <button className="player-btn" onClick={next} title="Следующий">
              <IconNext />
            </button>
            <button
              className={`player-btn ${repeat !== 'off' ? 'is-active' : ''}`}
              onClick={toggleRepeat}
              title={
                  repeat === 'off'
                  ? 'Повтор выключен'
                  : repeat === 'all'
                  ? 'Повтор всех'
                  : 'Повтор одного'
              }
            >
              <IconRepeat />
              {repeat === 'one' && <span className="player-btn-badge">1</span>}
            </button>
          </div>

          <div className="player-progress-row">
            <span className="player-time">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="any"
              value={currentTime}
              onChange={handleSeekChange}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={commitSeek}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={commitSeek}
              onKeyDown={handleSeekKeyDown}
              className="player-progress-slider"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, #404040 ${duration ? (currentTime / duration) * 100 : 0}%, #404040 100%)`,
              }}
            />
            <span className="player-time">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-right">
          <button
            className={`player-btn ${isLiked ? 'is-active' : ''}`}
            onClick={() => setIsLiked(!isLiked)}
            title="В избранное"
          >
            <IconHeart filled={isLiked} />
          </button>
          <button
            className="player-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            <IconVolume muted={isMuted} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
            }}
            className="player-volume"
            style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${
                (isMuted ? 0 : volume) * 100
                }%, #404040 ${(isMuted ? 0 : volume) * 100}%, #404040 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}