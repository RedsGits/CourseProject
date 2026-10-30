import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../store/player';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import LikeButton from './LikeButton';
import AddToPlaylistMenu from './AddToPlaylistMenu';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PREV_SEEK_THRESHOLD = 5;
const FADE_DURATION = 0.4;

const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M8,17.18V6.82Q8,6.4 8.3,6.11Q8.6,5.82 9,5.82q0.13,0 0.26,0.04T9.53,5.97l8.15,5.18q0.23,0.15 0.34,0.38q0.11,0.23 0.11,0.48t-0.11,0.47t-0.34,0.38L9.53,18.02Q9.4,18.1 9.26,18.14Q9.13,18.18 9,18.18q-0.4,0-0.7-0.29T8,17.18Z" />
  </svg>
);
const IconPause = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M16,19q-0.82,0-1.41-0.59T14,17V7q0-0.82 0.59-1.41T16,5q0.82,0 1.41,0.59Q18,6.18 18,7V17q0,0.82-0.59,1.41T16,19ZM8,19q-0.82,0-1.41-0.59T6,17V7Q6,6.18 6.59,5.59T8,5Q8.83,5 9.41,5.59Q10,6.18 10,7V17q0,0.82-0.59,1.41Q8.83,19 8,19Z" />
  </svg>
);
const IconPrev = () => (
  <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor">
    <path d="M5.5,17V7q0-0.43 0.29-0.71T6.5,6T7.21,6.29T7.5,7V17q0,0.43-0.29,0.71T6.5,18q-0.42,0-0.71-0.29Q5.5,17.43 5.5,17Zm11.45-0.02l-6.2-4.15q-0.22-0.15-0.34-0.36T10.3,12t0.11-0.46t0.34-0.36l6.2-4.15q0.13-0.1 0.28-0.13q0.15-0.02 0.27-0.02q0.4,0 0.7,0.27q0.3,0.28 0.3,0.73v8.25q0,0.45-0.3,0.73t-0.7,0.27q-0.13,0-0.27-0.02t-0.28-0.13Z" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor">
    <path d="M16.5,17V7q0-0.43 0.29-0.71T17.5,6t0.71,0.29T18.5,7V17q0,0.43-0.29,0.71T17.5,18t-0.71-0.29Q16.5,17.43 16.5,17Zm-11-0.88V7.88q0-0.45 0.3-0.73Q6.1,6.88 6.5,6.88q0.13,0 0.28,0.02Q6.93,6.93 7.05,7.02l6.2,4.15q0.23,0.15 0.34,0.36T13.7,12t-0.11,0.46q-0.11,0.21-0.34,0.36l-6.2,4.15q-0.13,0.1-0.28,0.13T6.5,17.13q-0.4,0-0.7-0.27T5.5,16.13Z" />
  </svg>
);

const IconShuffle = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M15,20q-0.42,0-0.71-0.29Q14,19.43 14,19t0.29-0.71T15,18h1.6l-2.48-2.47q-0.3-0.3-0.29-0.71t0.31-0.71t0.71-0.3t0.71,0.3L18,16.55V15q0-0.43 0.29-0.71T19,14t0.71,0.29T20,15v4q0,0.43-0.29,0.71T19,20H15ZM4.3,19.7Q4.03,19.43 4.03,19T4.3,18.3L16.6,6H15q-0.42,0-0.71-0.29Q14,5.43 14,5t0.29-0.71T15,4h4q0.43,0 0.71,0.29T20,5V9q0,0.42-0.29,0.71T19,10T18.29,9.71T18,9V7.4L5.7,19.7Q5.43,19.98 5,19.98q-0.42,0-0.7-0.28ZM4.28,5.7Q4,5.43 4,5T4.28,4.3T4.96,4.02T5.68,4.3l4.2,4.18q0.28,0.28 0.29,0.69T9.88,9.88q-0.27,0.27-0.7,0.27T8.48,9.88L4.28,5.7Z" />
  </svg>
);

const IconRepeat = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M6.85,19L7.7,19.85q0.3,0.3 0.29,0.7T7.7,21.25q-0.3,0.3-0.71,0.31T6.28,21.28L3.7,18.7q-0.15-0.15-0.21-0.32T3.43,18t0.06-0.38T3.7,17.3l2.58-2.58q0.3-0.3 0.71-0.29T7.7,14.75q0.28,0.3 0.29,0.7T7.7,16.15L6.85,17H17V14q0-0.43 0.29-0.71T18,13t0.71,0.29T19,14v3q0,0.82-0.59,1.41T17,19H6.85ZM17.15,7H7v3q0,0.42-0.29,0.71T6,11q-0.42,0-0.71-0.29Q5,10.43 5,10V7Q5,6.18 5.59,5.59T7,5H17.15L16.3,4.15q-0.3-0.3-0.29-0.7q0.01-0.4 0.29-0.7q0.3-0.3 0.71-0.31q0.41-0.01 0.71,0.29L20.3,5.3q0.15,0.15 0.21,0.32T20.58,6T20.51,6.38T20.3,6.7L17.73,9.27q-0.3,0.3-0.71,0.29T16.3,9.25q-0.27-0.3-0.29-0.7t0.29-0.7L17.15,7Z" />
  </svg>
);

const IconVolume = ({ muted }: { muted: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    {muted ? (
      <path d="M16.78,19.58q-0.28,0.18-0.55,0.32t-0.58,0.28q-0.38,0.18-0.76,0T14.35,19.6q-0.15-0.38 0.04-0.74t0.56-0.54q0.1-0.05 0.19-0.1t0.19-0.1L12,14.8v2.78q0,0.68-0.61,0.94T10.3,18.3L7,15H4q-0.42,0-0.71-0.29T3,14V10Q3,9.57 3.29,9.29T4,9H6.2L2.1,4.9Q1.83,4.63 1.83,4.2T2.1,3.5Q2.38,3.22 2.8,3.22T3.5,3.5l17,17q0.28,0.27 0.28,0.7T20.5,21.9q-0.27,0.28-0.7,0.28T19.1,21.9l-2.32-2.32ZM19,11.98q0-2.08-1.1-3.79q-1.1-1.71-2.95-2.56Q14.58,5.45 14.4,5.09T14.35,4.35q0.15-0.4 0.54-0.57t0.79,0q2.43,1.07 3.88,3.28T21,11.98q0,0.82-0.15,1.64t-0.43,1.56q-0.2,0.55-0.61,0.69t-0.76,0.01t-0.56-0.45t-0.01-0.75q0.27-0.65 0.4-1.31T19,11.98ZM14.78,8.42Q15.6,8.95 16.05,10t0.45,2q0,0.13 0,0.25T16.48,12.5q-0.05,0.32-0.35,0.42t-0.55-0.15L14.3,11.5q-0.15-0.15-0.22-0.34T14,10.77V8.85q0-0.3 0.26-0.44q0.26-0.14 0.51,0.01ZM9.75,6.95Q9.6,6.8 9.6,6.6T9.75,6.25L10.3,5.7q0.47-0.48 1.09-0.21T12,6.43V8q0,0.35-0.3,0.47T11.15,8.35l-1.4-1.4Z" />
    ) : (
      <path d="M19,11.98q0-2.08-1.1-3.79q-1.1-1.71-2.95-2.56Q14.58,5.45 14.4,5.09T14.35,4.35q0.15-0.4 0.54-0.57t0.79,0q2.43,1.07 3.88,3.29Q21,9.27 21,11.98t-1.45,4.91t-3.88,3.29q-0.4,0.18-0.79,0T14.35,19.6q-0.13-0.38 0.05-0.74t0.55-0.54q1.85-0.85 2.95-2.56T19,11.98ZM7,15H4q-0.42,0-0.71-0.29T3,14V10Q3,9.57 3.29,9.29T4,9H7l3.3-3.3q0.47-0.48 1.09-0.21T12,6.43V17.58q0,0.68-0.61,0.94T10.3,18.3L7,15Zm9.5-3q0,1.05-0.47,1.99t-1.25,1.54q-0.25,0.15-0.51,0.01T14,15.1V8.85q0-0.3 0.26-0.44q0.26-0.14 0.51,0.01Q15.55,9.05 16.03,10t0.47,2Z" />
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
  const {current, next, prev, currentIndex, fadeIn, shuffle, repeat, toggleShuffle, toggleRepeat, isPlaying, setIsPlaying} = usePlayer();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const hasScrobbledRef = useRef(false);
  const listenedTimeRef = useRef(0);
  const lastTickRef = useRef(performance.now());
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(loadVolume);
  const [isMuted, setIsMuted] = useState(loadMuted);
  const [isSeeking, setIsSeeking] = useState(false);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  const fadeInRef = useRef(fadeIn);
  fadeInRef.current = fadeIn;
  const [artistName, setArtistName] = useState<string | null>(null);

  useEffect(() => {
    hasScrobbledRef.current = false;
    listenedTimeRef.current = 0;
    lastTickRef.current = performance.now();
  }, [current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, current, setIsPlaying]);

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
      const now = performance.now();
      
      const delta = Math.min(now - lastTickRef.current, 100);
      lastTickRef.current = now;

      if (audio && !isSeeking) {
        setCurrentTime(audio.currentTime);
        applyVolumeWithFade(audio);

        if (isPlaying && !audio.paused) {
          listenedTimeRef.current += delta / 1000;
        }

        const threshold = Math.min(30, audio.duration / 2);
        
        if (
          listenedTimeRef.current >= threshold &&
          !hasScrobbledRef.current &&
          current
        ) {
          hasScrobbledRef.current = true;
          api.post(`/history/${current.id}`)
            .then(() => console.log(`🎵 Прослушивание "${current.title}" засчитано (${Math.round(listenedTimeRef.current)} сек)`))
            .catch((err) => console.error('Ошибка записи истории:', err));
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [current, isSeeking, isPlaying]);

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
            <LikeButton trackId={current.id} type="dislike" className="player-btn" />

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

            <button className="player-play" onClick={() => setIsPlaying(!isPlaying)}>
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

            <LikeButton trackId={current.id} type="like" className="player-btn" />
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
          <AddToPlaylistMenu trackId={current.id} />
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