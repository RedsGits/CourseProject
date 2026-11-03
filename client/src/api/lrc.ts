import type { LrcLine } from '../types';

export function parseLrc(syncedLyrics: string): LrcLine[] {
  const result: LrcLine[] = [];
  const timeRe = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const raw of syncedLyrics.split('\n')) {
    const times: number[] = [];
    let match: RegExpExecArray | null;
    timeRe.lastIndex = 0;

    while ((match = timeRe.exec(raw)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const fracStr = match[3] ?? '';
      const ms = fracStr ? parseInt(fracStr.padEnd(3, '0'), 10) : 0;
      times.push(min * 60 + sec + ms / 1000);
    }

    if (times.length === 0) continue;

    const text = raw.replace(timeRe, '').trim();
    for (const t of times) result.push({ time: t, text });
  }

  return result.sort((a, b) => a.time - b.time);
}

export function getActiveLineIndex(lines: LrcLine[], currentTime: number): number {
  if (lines.length === 0) return -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (currentTime >= lines[i].time) return i;
  }
  return -1;
}