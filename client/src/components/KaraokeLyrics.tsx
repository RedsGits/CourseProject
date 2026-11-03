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
  const lastScrollIndexRef = useRef(-1);
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    setLines(parseLrc(syncedLyrics));
    lastScrollIndexRef.current = -1;
  }, [syncedLyrics]);

  useEffect(() => {
    if (lines.length === 0) return;
    let raf = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const idx = getActiveLineIndex(lines, audio.currentTime);
        setActiveIndex((prev) => (prev !== idx ? idx : prev));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lines, audioRef]);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeIndex < 0) return;
    if (lastScrollIndexRef.current === activeIndex) return;
    lastScrollIndexRef.current = activeIndex;
    lineRefs.current[activeIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex, isPlaying]);

  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current && activeIndex >= 0) {
      const line = lineRefs.current[activeIndex];
      const container = containerRef.current;
      if (line && container) {
        const lr = line.getBoundingClientRect();
        const cr = container.getBoundingClientRect();
        const visible = lr.top >= cr.top && lr.bottom <= cr.bottom;
        if (!visible) {
          line.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        lastScrollIndexRef.current = activeIndex;
      }
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, activeIndex]);

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
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