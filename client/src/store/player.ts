import { create } from 'zustand';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  current: Track | null;
  queue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  fadeIn: boolean;
  shuffle: boolean;
  repeat: RepeatMode;

  setTrack: (track: Track, queue?: Track[]) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  current: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  fadeIn: false,
  shuffle: false,
  repeat: 'off',

  setTrack: (track, queue) => {
    const q = queue ?? get().queue;
    const { shuffle } = get();

    if (shuffle) {
      const others = q.filter((t) => t.id !== track.id);
      set({
        current: track,
        queue: [track, ...shuffleArray(others)],
        originalQueue: q,
        currentIndex: 0,
        fadeIn: false,
      });
    } else {
      const idx = q.findIndex((t) => t.id === track.id);
      set({
        current: track,
        queue: q,
        originalQueue: q,
        currentIndex: idx >= 0 ? idx : 0,
        fadeIn: false,
      });
    }
  },

  next: () => {
    const { queue, currentIndex, repeat } = get();
    if (queue.length === 0) return;

    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        set({ current: queue[0], currentIndex: 0, fadeIn: true });
      }
      return;
    }
    set({ current: queue[nextIdx], currentIndex: nextIdx, fadeIn: true });
  },

  prev: () => {
    const { queue, currentIndex } = get();
    if (queue.length === 0) return;
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    set({ current: queue[prevIdx], currentIndex: prevIdx, fadeIn: true });
  },

  stop: () =>
    set({
      current: null,
      queue: [],
      originalQueue: [],
      currentIndex: -1,
      fadeIn: false,
    }),

  toggleShuffle: () => {
    const { shuffle, queue, current } = get();
    if (!current) {
      set({ shuffle: !shuffle });
      return;
    }

    if (!shuffle) {
      const others = queue.filter((t) => t.id !== current.id);
      set({
        shuffle: true,
        queue: [current, ...shuffleArray(others)],
        currentIndex: 0,
      });
    } else {
      const { originalQueue } = get();
      const restored = originalQueue.length > 0 ? originalQueue : queue;
      const idx = restored.findIndex((t) => t.id === current.id);
      set({
        shuffle: false,
        queue: restored,
        currentIndex: idx >= 0 ? idx : 0,
      });
    }
  },

  toggleRepeat: () => {
    const order: RepeatMode[] = ['off', 'all', 'one'];
    const idx = order.indexOf(get().repeat);
    set({ repeat: order[(idx + 1) % order.length] });
  },
}));