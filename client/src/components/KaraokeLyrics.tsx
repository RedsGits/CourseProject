import { useEffect, useRef, useState } from 'react';
import { parseLrc, getActiveLineIndex } from '../api/lrc';
import type { LrcLine } from '../types';

interface Props {
  syncedLyrics: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

export default function KaraokeLyrics({ syncedLyrics, audioRef, isPlaying }: Props) {
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastIndexRef = useRef(-1);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    setLines(parseLrc(syncedLyrics));
    lastIndexRef.current = -1;
  }, [syncedLyrics]);

  const scrollToLine = (index: number, behavior: ScrollBehavior) => {
    const container = containerRef.current;
    const line = lineRefs.current[index];
    if (container && line) {
      const scrollPos = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2;
      container.scrollTo({ top: scrollPos, behavior });
    }
  };

  useEffect(() => {
    if (lines.length === 0) return;
    let raf = 0;

    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        if (!audio.seeking && audio.readyState >= 3) {
          const idx = getActiveLineIndex(lines, audio.currentTime);
          
          if (idx !== lastIndexRef.current) {
            lastIndexRef.current = idx;
            setActiveIndex(idx);
            scrollToLine(idx, 'smooth');
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, audioRef]);

  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current && activeIndex >= 0) {
      const container = containerRef.current;
      const line = lineRefs.current[activeIndex];
      if (line && container) {
        const scrollPos = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2;
        if (Math.abs(container.scrollTop - scrollPos) > 100) {
          container.scrollTo({ top: scrollPos, behavior: 'smooth' });
        }
      }
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, activeIndex]);

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time; 
    }
  };

  return (
    <div className="karaoke-lyrics" ref={containerRef}>
      {lines.map((line, i) => (
        <div
          key={`${line.time}-${i}`}
          ref={(el) => { lineRefs.current[i] = el; }}
          className={`karaoke-line ${i === activeIndex ? 'karaoke-line-active' : ''}`}
          onClick={() => handleSeek(line.time)}
        >
          {line.text || '♪'}
        </div>
      ))}
    </div>
  );
}