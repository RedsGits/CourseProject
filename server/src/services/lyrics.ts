const LRCLIB_BASE = 'https://lrclib.net/api';
const USER_AGENT = 'DoeReMi/1.0.0 (https://github.com/RedsGits/CourseProject)';

export interface LrclibResult {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  instrumental: boolean;
}

export async function fetchLyricsFromLrclib(
  trackName: string,
  artistName: string,
  albumName?: string | null,
  duration?: number | null,
): Promise<LrclibResult | null> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
  });

  if (albumName) params.set('album_name', albumName);
  if (duration) params.set('duration', String(duration));

  const res = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`LRCLIB ответил ${res.status}`);
  }

  const data = await res.json();

  return {
    plainLyrics: data.plainLyrics ?? null,
    syncedLyrics: data.syncedLyrics ?? null,
    instrumental: Boolean(data.instrumental),
  };
}