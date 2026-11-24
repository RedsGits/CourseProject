import { db } from '../prisma/db';
import { withArtistsBatch } from '../utils/track';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_WINDOW_DAYS = 240;
const DAILY_TRACK_LIMIT = 30;
const MAX_TRACKS_PER_ARTIST = 2;
const MAX_TRACKS_PER_ALBUM = 3;
const FAMILIAR_SHARE = 0.3;
const DAILY_JITTER = 2.5;

const W = {
  completed: 4,
  half: 2,
  partial: 0.75,
  skip: -2,
  like: 6,
  dislike: -7,
  playlist: 2,
  preferredGenre: 8,
};

export const GENRES = [
  'POP', 'ROCK', 'HIPHOP', 'RNB', 'ELECTRONIC', 'HOUSE', 'TECHNO', 'TRANCE', 'DUBSTEP',
  'DRUM_AND_BASS', 'RAP', 'JAZZ', 'BLUES', 'CLASSICAL', 'ORCHESTRAL', 'OPERA', 'COUNTRY',
  'FOLK', 'FOLK_ROCK', 'INDIE', 'ALTERNATIVE', 'METAL', 'HEAVY_METAL', 'PUNK', 'HARDCORE',
  'REGGAE', 'SKA', 'SOUL', 'FUNK', 'DISCO', 'LATIN', 'PHONK', 'SALSA', 'BOSSA_NOVA',
  'SAMBA', 'AFROBEAT', 'K_POP', 'J_POP', 'ANIME', 'SOUNDTRACK', 'AMBIENT', 'CHILLOUT',
  'LO_FI', 'NEW_AGE', 'GOSPEL', 'SPIRITUAL', 'WORLD', 'CELTIC', 'GUITAR', 'PIANO',
  'EXPERIMENTAL', 'SPOKEN_WORD',
] as const;

const GENRE_SET = new Set<string>(GENRES);

const RELATED_GENRES: Record<string, string[]> = {
  POP: ['INDIE', 'RNB', 'ELECTRONIC', 'K_POP', 'J_POP', 'FOLK'],
  ROCK: ['ALTERNATIVE', 'INDIE', 'PUNK', 'METAL', 'FOLK_ROCK', 'HEAVY_METAL'],
  HIPHOP: ['RAP', 'RNB', 'PHONK', 'SOUL', 'FUNK'],
  RNB: ['SOUL', 'HIPHOP', 'POP', 'JAZZ', 'FUNK'],
  ELECTRONIC: ['HOUSE', 'TECHNO', 'TRANCE', 'DUBSTEP', 'DRUM_AND_BASS', 'AMBIENT', 'CHILLOUT'],
  HOUSE: ['ELECTRONIC', 'TECHNO', 'DISCO', 'FUNK'],
  TECHNO: ['HOUSE', 'ELECTRONIC', 'TRANCE', 'AMBIENT'],
  TRANCE: ['TECHNO', 'ELECTRONIC', 'HOUSE', 'AMBIENT'],
  DUBSTEP: ['ELECTRONIC', 'DRUM_AND_BASS', 'HIPHOP'],
  DRUM_AND_BASS: ['ELECTRONIC', 'DUBSTEP', 'TECHNO'],
  RAP: ['HIPHOP', 'RNB', 'PHONK', 'SOUL'],
  JAZZ: ['BLUES', 'SOUL', 'FUNK', 'CLASSICAL', 'LO_FI'],
  BLUES: ['JAZZ', 'SOUL', 'FOLK', 'ROCK'],
  CLASSICAL: ['ORCHESTRAL', 'OPERA', 'PIANO', 'NEW_AGE'],
  ORCHESTRAL: ['CLASSICAL', 'SOUNDTRACK', 'OPERA', 'PIANO'],
  OPERA: ['CLASSICAL', 'ORCHESTRAL', 'SPIRITUAL'],
  COUNTRY: ['FOLK', 'FOLK_ROCK', 'BLUES', 'ROCK'],
  FOLK: ['FOLK_ROCK', 'COUNTRY', 'WORLD', 'CELTIC', 'INDIE'],
  FOLK_ROCK: ['FOLK', 'ROCK', 'INDIE', 'COUNTRY'],
  INDIE: ['ALTERNATIVE', 'POP', 'ROCK', 'FOLK', 'LO_FI'],
  ALTERNATIVE: ['INDIE', 'ROCK', 'PUNK', 'EXPERIMENTAL'],
  METAL: ['HEAVY_METAL', 'ROCK', 'HARDCORE', 'PUNK'],
  HEAVY_METAL: ['METAL', 'HARDCORE', 'ROCK'],
  PUNK: ['ROCK', 'ALTERNATIVE', 'HARDCORE', 'SKA'],
  HARDCORE: ['PUNK', 'METAL', 'HEAVY_METAL', 'DRUM_AND_BASS'],
  REGGAE: ['SKA', 'WORLD', 'SOUL', 'LATIN'],
  SKA: ['REGGAE', 'PUNK', 'ROCK', 'WORLD'],
  SOUL: ['RNB', 'FUNK', 'JAZZ', 'GOSPEL', 'POP'],
  FUNK: ['SOUL', 'DISCO', 'RNB', 'JAZZ', 'HOUSE'],
  DISCO: ['FUNK', 'SOUL', 'HOUSE', 'POP'],
  LATIN: ['SALSA', 'SAMBA', 'BOSSA_NOVA', 'WORLD', 'REGGAE'],
  PHONK: ['HIPHOP', 'RAP', 'ELECTRONIC', 'DUBSTEP'],
  SALSA: ['LATIN', 'SAMBA', 'WORLD'],
  BOSSA_NOVA: ['LATIN', 'SAMBA', 'JAZZ', 'LO_FI'],
  SAMBA: ['LATIN', 'SALSA', 'BOSSA_NOVA', 'WORLD'],
  AFROBEAT: ['WORLD', 'LATIN', 'FUNK', 'SOUL'],
  K_POP: ['POP', 'J_POP', 'ANIME', 'RNB'],
  J_POP: ['POP', 'K_POP', 'ANIME', 'SOUNDTRACK'],
  ANIME: ['J_POP', 'SOUNDTRACK', 'K_POP', 'ORCHESTRAL'],
  SOUNDTRACK: ['ORCHESTRAL', 'ANIME', 'CLASSICAL', 'AMBIENT'],
  AMBIENT: ['CHILLOUT', 'LO_FI', 'NEW_AGE', 'ELECTRONIC'],
  CHILLOUT: ['AMBIENT', 'LO_FI', 'ELECTRONIC', 'POP'],
  LO_FI: ['CHILLOUT', 'AMBIENT', 'JAZZ', 'INDIE'],
  NEW_AGE: ['AMBIENT', 'CLASSICAL', 'SPIRITUAL', 'PIANO'],
  GOSPEL: ['SOUL', 'SPIRITUAL', 'RNB', 'POP'],
  SPIRITUAL: ['GOSPEL', 'NEW_AGE', 'WORLD', 'CLASSICAL'],
  WORLD: ['AFROBEAT', 'FOLK', 'CELTIC', 'REGGAE', 'LATIN'],
  CELTIC: ['FOLK', 'WORLD', 'FOLK_ROCK'],
  GUITAR: ['CLASSICAL', 'FOLK', 'ROCK', 'PIANO'],
  PIANO: ['CLASSICAL', 'NEW_AGE', 'AMBIENT', 'GUITAR'],
  EXPERIMENTAL: ['ELECTRONIC', 'AMBIENT', 'ALTERNATIVE', 'SPOKEN_WORD'],
  SPOKEN_WORD: ['EXPERIMENTAL', 'SOUNDTRACK', 'WORLD'],
};

export interface GenreWeight {
  genre: string;
  score: number;
}

export interface ArtistWeight {
  id: number;
  name: string;
  imageUrl: string | null;
  score: number;
}

export interface RecommendationProfile {
  hasData: boolean;
  topGenres: GenreWeight[];
  topArtists: ArtistWeight[];
  preferredGenres: string[];
  stats: {
    plays: number;
    likes: number;
    playlistTracks: number;
  };
}

interface InternalProfile extends RecommendationProfile {
  userId: number;
  genreScores: Map<string, number>;
  artistScores: Map<number, number>;
  trackWeights: Map<number, number>;
  played: Set<number>;
  liked: Set<number>;
  disliked: Set<number>;
  tracks: any[];
  albums: any[];
  trackMap: Map<number, any>;
  primaryArtist: Map<number, number>;
  trackArtists: Map<number, number[]>;
  albumArtists: Map<number, Array<{ id: number; name: string; role: string; order: number }>>;
}

interface AlbumSection {
  id: string;
  genres?: string[];
  albums: any[];
}

interface GenreMix {
  genre: string;
  trackCount: number;
}

interface DailyMix {
  date: string;
  tracks: any[];
}

export interface FavoriteArtistCard {
  id: number;
  name: string;
  imageUrl: string | null;
  trackTitle: string;
  albumId: number;
  albumTitle: string;
  coverUrl: string | null;
}

export interface HomeRecommendations {
  hasData: boolean;
  profile: RecommendationProfile;
  daily: DailyMix | null;
  genreMixes: GenreMix[];
  sections: AlbumSection[];
  favoriteArtists: FavoriteArtistCard[];
}

export interface MixPayload {
  id: string;
  kind: 'daily' | 'genre' | 'album-section';
  genre?: string;
  date?: string;
  tracks?: any[];
  albums?: any[];
}

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && 'epochMilliseconds' in value) {
    return (value as { epochMilliseconds: number }).epochMilliseconds;
  }
  return new Date(value as string).getTime();
}

function localDateKey(date = new Date()): string {
  return date.toLocaleDateString('sv-SE');
}

function jitter(seed: number, id: number): number {
  const x = Math.sin(seed * 12.9898 + id * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function addScore(map: Map<any, number>, key: any, amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return;
  map.set(key, (map.get(key) ?? 0) + amount);
}

function recencyDecay(timestamp: unknown): number {
  const ageDays = (Date.now() - toMillis(timestamp)) / DAY_MS;
  if (!Number.isFinite(ageDays) || ageDays > HISTORY_WINDOW_DAYS) return 0;
  return Math.pow(0.5, Math.max(0, ageDays) / 45);
}

function listenWeight(listenedSeconds: number, duration: number, completed: boolean): number {
  const ratio = duration > 0 ? listenedSeconds / duration : 0;
  if (completed || ratio >= 0.9) return W.completed;
  if (ratio >= 0.5) return W.half;
  if (ratio >= 0.2) return W.partial;
  return W.skip;
}

async function loadProfile(userId: number): Promise<InternalProfile> {
  const [allTracks, artists, links, albumRows, albumLinks, history, reactions, playlists, preferences] = await Promise.all([
    db.orm.public.Track.all(),
    db.orm.public.Artist.all(),
    db.orm.public.TrackArtist.all(),
    db.orm.public.Album.all(),
    db.orm.public.AlbumArtist.all(),
    db.orm.public.ListeningHistory.where({ userId }).all(),
    db.orm.public.TrackReaction.where({ userId }).all(),
    db.orm.public.Playlist.where({ userId }).all(),
    db.orm.public.UserGenrePreference.where({ userId }).all(),
  ]);

  const playlistIds = new Set(playlists.map((p) => p.id));
  const playlistLinks = playlistIds.size
    ? (await db.orm.public.PlaylistTrack.all()).filter((link) => playlistIds.has(link.playlistId))
    : [];

  const tracks = allTracks.filter((track) => track.isPublished);
  const albums = albumRows.filter((album) => album.isPublished);
  const trackMap = new Map<number, any>(tracks.map((track) => [track.id, track]));
  const artistMap = new Map<number, any>(artists.map((artist) => [artist.id, artist]));

  const primaryArtist = new Map<number, number>();
  const trackArtists = new Map<number, number[]>();
  for (const link of links) {
    if (link.role === 'PRIMARY' && !primaryArtist.has(link.trackId)) {
      primaryArtist.set(link.trackId, link.artistId);
    }
    const list = trackArtists.get(link.trackId) ?? [];
    if (!list.includes(link.artistId)) list.push(link.artistId);
    trackArtists.set(link.trackId, list);
  }

  const albumArtists = new Map<number, Array<{ id: number; name: string; role: string; order: number }>>();
  for (const link of albumLinks) {
    const artist = artistMap.get(link.artistId);
    if (!artist) continue;
    const list = albumArtists.get(link.albumId) ?? [];
    list.push({
      id: artist.id,
      name: artist.name,
      role: link.role,
      order: link.order,
    });
    albumArtists.set(link.albumId, list);
  }
  for (const list of albumArtists.values()) {
    list.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'PRIMARY' ? -1 : 1;
      return a.order - b.order;
    });
  }

  const genreScores = new Map<string, number>();
  const artistScores = new Map<number, number>();
  const trackWeights = new Map<number, number>();
  const played = new Set<number>();
  const liked = new Set<number>();
  const disliked = new Set<number>();

  let plays = 0;

  for (const entry of history) {
    const track = trackMap.get(entry.trackId);
    if (!track) continue;

    played.add(track.id);
    const listened = Number(entry.listenedSeconds ?? 0);
    if (listened >= 5 || entry.completed) plays++;

    const decay = recencyDecay(entry.listenedAt);
    if (decay <= 0) continue;

    // Старые записи до появления listenedSeconds не считаем скипами.
    const baseWeight =
      listened === 0 && !entry.completed
        ? 0
        : listenWeight(listened, track.duration, Boolean(entry.completed));
    const weight = baseWeight * decay;
    addScore(genreScores, track.genre, weight);
    addScore(trackWeights, track.id, weight);
    const artistId = primaryArtist.get(track.id);
    if (artistId !== undefined) addScore(artistScores, artistId, weight * 0.7);
  }

  for (const reaction of reactions) {
    const track = trackMap.get(reaction.trackId);
    if (!track) continue;

    if (reaction.type === 'LIKE') liked.add(track.id);
    else disliked.add(track.id);

    const decay = recencyDecay(reaction.updatedAt ?? reaction.createdAt);
    if (decay <= 0) continue;

    const weight = (reaction.type === 'LIKE' ? W.like : W.dislike) * decay;
    addScore(genreScores, track.genre, weight);
    addScore(trackWeights, track.id, weight);
    const artistId = primaryArtist.get(track.id);
    if (artistId !== undefined) addScore(artistScores, artistId, weight * 0.7);
  }

  for (const link of playlistLinks) {
    const track = trackMap.get(link.trackId);
    if (!track) continue;
    addScore(genreScores, track.genre, W.playlist);
    addScore(trackWeights, track.id, W.playlist);
    const artistId = primaryArtist.get(track.id);
    if (artistId !== undefined) addScore(artistScores, artistId, W.playlist * 0.7);
  }

  const preferredGenres: string[] = [];
  for (const preference of preferences) {
    if (!GENRE_SET.has(preference.genre)) continue;
    preferredGenres.push(preference.genre);
    addScore(genreScores, preference.genre, W.preferredGenre);
  }

  const topGenres = [...genreScores.entries()]
    .filter(([, score]) => score > 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, score]) => ({ genre, score: Math.round(score * 100) / 100 }));

  const topArtists = [...artistScores.entries()]
    .filter(([, score]) => score > 0.4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artistId, score]) => {
      const artist = artistMap.get(artistId);
      return {
        id: artistId,
        name: artist?.name ?? 'Неизвестный исполнитель',
        imageUrl: artist?.imageUrl ?? null,
        score: Math.round(score * 100) / 100,
      };
    });

  const likes = reactions.filter((r) => r.type === 'LIKE').length;
  const hasData = topGenres.length > 0;

  return {
    userId,
    hasData,
    topGenres,
    topArtists,
    preferredGenres,
    stats: {
      plays,
      likes,
      playlistTracks: playlistLinks.length,
    },
    genreScores,
    artistScores,
    trackWeights,
    played,
    liked,
    disliked,
    tracks,
    albums,
    trackMap,
    primaryArtist,
    trackArtists,
    albumArtists,
  };
}

function publicProfile(profile: InternalProfile): RecommendationProfile {
  return {
    hasData: profile.hasData,
    topGenres: profile.topGenres,
    topArtists: profile.topArtists,
    preferredGenres: profile.preferredGenres,
    stats: profile.stats,
  };
}

function scoreTrack(profile: InternalProfile, track: any): number {
  const genreScore = profile.genreScores.get(track.genre) ?? 0;
  const artistId = profile.primaryArtist.get(track.id);
  const artistScore = artistId !== undefined ? profile.artistScores.get(artistId) ?? 0 : 0;
  const popularity = Math.log1p(track.playCount ?? 0);
  return genreScore + artistScore * 0.7 + popularity * 0.6;
}

function sortByScore(profile: InternalProfile, tracks: any[], seed: number): any[] {
  return [...tracks].sort((a, b) => {
    const scoreA = scoreTrack(profile, a) + jitter(seed, a.id) * 1.5;
    const scoreB = scoreTrack(profile, b) + jitter(seed, b.id) * 1.5;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id - b.id;
  });
}

function popularFallback(profile: InternalProfile, count: number): any[] {
  return [...profile.tracks]
    .filter((track) => !profile.disliked.has(track.id))
    .sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0))
    .slice(0, count);
}

function dailyScore(profile: InternalProfile, track: any, seed: number): number {
  return scoreTrack(profile, track) + jitter(seed, track.id) * DAILY_JITTER;
}

function rankDaily(
  profile: InternalProfile,
  tracks: any[],
  seed: number,
  limit: number,
): any[] {
  if (tracks.length === 0 || limit <= 0) return [];

  const windowSize = Math.min(tracks.length, Math.max(limit * 3, 10));
  const window = [...tracks]
    .sort((a, b) => scoreTrack(profile, b) - scoreTrack(profile, a))
    .slice(0, windowSize);

  return window.sort((a, b) => {
    const diff = dailyScore(profile, b, seed) - dailyScore(profile, a, seed);
    return diff !== 0 ? diff : a.id - b.id;
  });
}

function buildDaily(profile: InternalProfile, count: number, dateKey: string): any[] {
  const seed = hashString(`daily:${profile.userId}:${dateKey}:${profile.preferredGenres.join(',')}`);
  const all = profile.tracks.filter((track) => !profile.disliked.has(track.id));
  const isFamiliar = (track: any) =>
    profile.played.has(track.id) || profile.liked.has(track.id);

  const selected: any[] = [];
  const selectedIds = new Set<number>();
  const artistCounts = new Map<number, number>();
  const albumCounts = new Map<number, number>();

  const canAdd = (track: any) => {
    if (selectedIds.has(track.id)) return false;
    if (
      track.albumId !== undefined &&
      (albumCounts.get(track.albumId) ?? 0) >= MAX_TRACKS_PER_ALBUM
    ) {
      return false;
    }
    for (const artistId of profile.trackArtists.get(track.id) ?? []) {
      if ((artistCounts.get(artistId) ?? 0) >= MAX_TRACKS_PER_ARTIST) {
        return false;
      }
    }
    return true;
  };

  const add = (track: any) => {
    selectedIds.add(track.id);
    selected.push(track);
    if (track.albumId !== undefined) {
      albumCounts.set(track.albumId, (albumCounts.get(track.albumId) ?? 0) + 1);
    }
    for (const artistId of profile.trackArtists.get(track.id) ?? []) {
      artistCounts.set(artistId, (artistCounts.get(artistId) ?? 0) + 1);
    }
  };

  // 1. Знакомые треки — не больше 30% плейлиста.
  const familiarTarget = Math.round(count * FAMILIAR_SHARE);
  const familiar = all.filter(isFamiliar);
  for (const track of rankDaily(profile, familiar, seed + 101, familiarTarget)) {
    if (selected.length >= familiarTarget) break;
    if (canAdd(track)) add(track);
  }

  // 2. Новые треки — с квотами по жанрам: 50% топ-жанр, 25% второй, 25% остальное.
  const remaining = count - selected.length;
  const fresh = all.filter((track) => !isFamiliar(track));
  const topGenres = profile.topGenres.map((item) => item.genre);
  const primary = topGenres[0] ?? null;
  const secondary = topGenres[1] ?? null;

  const primaryQuota = Math.round(remaining * 0.5);
  const secondaryQuota = secondary ? Math.round(remaining * 0.25) : 0;
  const restQuota = remaining - primaryQuota - secondaryQuota;

  const buckets = [
    {
      tracks: primary ? fresh.filter((track) => track.genre === primary) : [],
      quota: primaryQuota,
      seed: seed + 201,
    },
    {
      tracks: secondary ? fresh.filter((track) => track.genre === secondary) : [],
      quota: secondaryQuota,
      seed: seed + 202,
    },
    {
      tracks: fresh.filter(
        (track) => track.genre !== primary && (!secondary || track.genre !== secondary),
      ),
      quota: restQuota,
      seed: seed + 203,
    },
  ];

  for (const bucket of buckets) {
    if (bucket.quota <= 0) continue;
    let added = 0;
    for (const track of rankDaily(profile, bucket.tracks, bucket.seed, bucket.quota)) {
      if (added >= bucket.quota) break;
      if (canAdd(track)) {
        add(track);
        added++;
      }
    }
  }

  // 3. Добиваем остаток, если в каком-то жанре не хватило треков.
  if (selected.length < count) {
    for (const track of rankDaily(profile, fresh, seed + 301, count - selected.length)) {
      if (selected.length >= count) break;
      if (canAdd(track)) add(track);
    }
  }

  if (selected.length < count) {
    for (const track of rankDaily(profile, all, seed + 401, count - selected.length)) {
      if (selected.length >= count) break;
      if (canAdd(track)) add(track);
    }
  }

  return selected;
}

function relatedGenresFor(profile: InternalProfile): string[] {
  const top = profile.topGenres.map((genre) => genre.genre);
  const result: string[] = [];
  for (const genre of top.slice(0, 3)) {
    for (const related of RELATED_GENRES[genre] ?? []) {
      if (!top.includes(related) && !result.includes(related)) result.push(related);
    }
  }
  if (result.length === 0) {
    for (const genre of GENRES) {
      if (!top.includes(genre) && !result.includes(genre)) result.push(genre);
      if (result.length >= 6) break;
    }
  }
  return result.slice(0, 6);
}

function buildGenreTracks(profile: InternalProfile, genre: string, count: number): any[] {
  const seed = hashString(`genre:${profile.userId}:${genre}:${profile.preferredGenres.join(',')}`);
  const candidates = profile.tracks.filter(
    (track) => track.genre === genre && !profile.disliked.has(track.id),
  );
  const fresh = candidates.filter((track) => !profile.played.has(track.id));
  const pool = fresh.length >= 5 ? fresh : candidates;
  return sortByScore(profile, pool, seed).slice(0, count);
}

async function enrichTracks(tracks: any[]): Promise<any[]> {
  if (tracks.length === 0) return [];
  return withArtistsBatch(tracks);
}

function albumSummary(profile: InternalProfile, album: any): any {
  return {
    ...album,
    artists: profile.albumArtists.get(album.id) ?? [],
  };
}

function albumTracks(profile: InternalProfile, albumId: number): any[] {
  return profile.tracks.filter((track) => track.albumId === albumId);
}

function albumAffinity(profile: InternalProfile, album: any): number {
  const tracks = albumTracks(profile, album.id).filter((track) => !profile.disliked.has(track.id));
  if (tracks.length === 0) return Number.NEGATIVE_INFINITY;

  const scores = tracks.map((track) => scoreTrack(profile, track)).sort((a, b) => b - a);
  const top = scores.slice(0, 2).reduce((sum, score) => sum + score, 0) / Math.min(2, scores.length);
  const popularity = Math.log1p(tracks.reduce((sum, track) => sum + (track.playCount ?? 0), 0));
  const fresh = tracks.some((track) => !profile.played.has(track.id)) ? 1 : 0;
  return top + popularity * 0.5 + fresh * 0.8;
}

function takeAlbums(
  profile: InternalProfile,
  albums: any[],
  used: Set<number>,
  limit: number,
): any[] {
  return [...albums]
    .filter((album) => !used.has(album.id))
    .sort((a, b) => {
      const diff = albumAffinity(profile, b) - albumAffinity(profile, a);
      return diff !== 0 ? diff : a.id - b.id;
    })
    .slice(0, limit)
    .map((album) => {
      used.add(album.id);
      return albumSummary(profile, album);
    });
}

function buildAlbumForYou(profile: InternalProfile, used: Set<number>, limit: number): any[] {
  const candidates = profile.albums
    .map((album) => {
      const tracks = albumTracks(profile, album.id).filter((track) => !profile.disliked.has(track.id));
      return { album, tracks };
    })
    .filter(({ tracks }) => tracks.length > 0);

  const relevant = candidates.filter(({ tracks }) =>
    tracks.some((track) => {
      const genreScore = profile.genreScores.get(track.genre) ?? 0;
      const artistId = profile.primaryArtist.get(track.id);
      const artistScore = artistId !== undefined ? profile.artistScores.get(artistId) ?? 0 : 0;
      return genreScore > 0 || artistScore > 0;
    }),
  );

  const pool = (relevant.length >= 4 ? relevant : candidates)
    .filter(({ tracks }) => tracks.some((track) => !profile.played.has(track.id)))
    .map(({ album }) => album);

  const fallback = candidates.map(({ album }) => album);
  return takeAlbums(profile, pool.length > 0 ? pool : fallback, used, limit);
}

function buildAlbumFavoriteArtists(profile: InternalProfile, used: Set<number>, limit: number): any[] {
  const topArtistIds = new Set(profile.topArtists.slice(0, 5).map((artist) => artist.id));
  if (topArtistIds.size === 0) return [];

  const albumArtistScore = (album: any) =>
    Math.max(
      0,
      ...(profile.albumArtists.get(album.id) ?? []).map(
        (link) => profile.artistScores.get(link.id) ?? 0,
      ),
    );

  const candidates = profile.albums.filter((album) => {
    if (used.has(album.id)) return false;
    if (albumTracks(profile, album.id).length === 0) return false;
    return (profile.albumArtists.get(album.id) ?? []).some((link) => topArtistIds.has(link.id));
  });

  return [...candidates]
    .sort((a, b) => {
      const diff = albumArtistScore(b) - albumArtistScore(a);
      return diff !== 0 ? diff : albumAffinity(profile, b) - albumAffinity(profile, a);
    })
    .slice(0, limit)
    .map((album) => {
      used.add(album.id);
      return albumSummary(profile, album);
    });
}

function buildAlbumDiscovery(profile: InternalProfile, used: Set<number>, limit: number): any[] {
  const related = relatedGenresFor(profile);
  const topGenres = new Set(profile.topGenres.map((genre) => genre.genre));

  const candidates = profile.albums.filter((album) => {
    if (used.has(album.id)) return false;
    const tracks = albumTracks(profile, album.id);
    if (tracks.length === 0) return false;
    const hasRelated = tracks.some((track) => related.includes(track.genre));
    const allTop = tracks.every((track) => topGenres.has(track.genre));
    return hasRelated && !allTop;
  });

  const fallback = profile.albums.filter(
    (album) => !used.has(album.id) && albumTracks(profile, album.id).length > 0,
  );

  return takeAlbums(profile, candidates.length > 0 ? candidates : fallback, used, limit);
}

function buildFavoriteArtistCards(
  profile: InternalProfile,
  limit: number,
): FavoriteArtistCard[] {
  const cards: FavoriteArtistCard[] = [];

  for (const artist of profile.topArtists) {
    if (cards.length >= limit) break;

    const artistTracks = profile.tracks
      .filter(
        (track) =>
          profile.primaryArtist.get(track.id) === artist.id && !profile.disliked.has(track.id),
      )
      .sort((a, b) => {
        const weightDiff =
          (profile.trackWeights.get(b.id) ?? 0) - (profile.trackWeights.get(a.id) ?? 0);
        return weightDiff !== 0 ? weightDiff : (b.playCount ?? 0) - (a.playCount ?? 0);
      });

    const track = artistTracks[0];
    if (!track) continue;

    const album = profile.albums.find((item) => item.id === track.albumId);
    if (!album) continue;

    cards.push({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.imageUrl,
      trackTitle: track.title,
      albumId: album.id,
      albumTitle: album.title,
      coverUrl: album.coverUrl,
    });
  }

  return cards;
}

export async function getHomeRecommendations(userId: number): Promise<HomeRecommendations> {
  const profile = await loadProfile(userId);
  const dateKey = localDateKey();
  const hasData = profile.hasData;

  const dailyTracks = hasData ? buildDaily(profile, DAILY_TRACK_LIMIT, dateKey) : [];
  const enrichedDaily = dailyTracks.length > 0 ? await enrichTracks(dailyTracks) : null;

  const sections: AlbumSection[] = [];
  const favoriteArtists = hasData ? buildFavoriteArtistCards(profile, 3) : [];

  if (hasData) {
    const used = new Set<number>();

    const forYou = buildAlbumForYou(profile, used, 6);
    if (forYou.length > 0) {
      sections.push({ id: 'for-you', albums: forYou });
    }

    const favoriteAlbums = buildAlbumFavoriteArtists(profile, used, 6);
    if (favoriteAlbums.length > 0) {
      sections.push({ id: 'favorite-artists', albums: favoriteAlbums });
    }

    const related = relatedGenresFor(profile);
    const discovery = buildAlbumDiscovery(profile, used, 6);
    if (discovery.length > 0) {
      sections.push({ id: 'discover', genres: related, albums: discovery });
    }
  }

  const genreMixes: GenreMix[] = hasData
    ? profile.topGenres
        .slice(0, 3)
        .map(({ genre }) => ({
          genre,
          trackCount: buildGenreTracks(profile, genre, 60).length,
        }))
        .filter((mix) => mix.trackCount > 0)
    : [];

  return {
    hasData,
    profile: publicProfile(profile),
    daily: enrichedDaily ? { date: dateKey, tracks: enrichedDaily } : null,
    genreMixes,
    sections,
    favoriteArtists,
  };
}

export async function getRecommendationProfile(userId: number): Promise<RecommendationProfile> {
  const profile = await loadProfile(userId);
  return publicProfile(profile);
}

export async function getMix(userId: number, mixId: string): Promise<MixPayload | null> {
  const profile = await loadProfile(userId);
  const dateKey = localDateKey();

  let payload: MixPayload | null = null;

  if (mixId === 'daily') {
    payload = {
      id: mixId,
      kind: 'daily',
      date: dateKey,
      tracks: profile.hasData ? buildDaily(profile, DAILY_TRACK_LIMIT, dateKey) : popularFallback(profile, 20),
    };
  } else if (mixId === 'for-you') {
    payload = {
      id: mixId,
      kind: 'album-section',
      albums: buildAlbumForYou(profile, new Set(), 18),
    };
  } else if (mixId === 'favorite-artists') {
    payload = {
      id: mixId,
      kind: 'album-section',
      albums: buildAlbumFavoriteArtists(profile, new Set(), 18),
    };
  } else if (mixId === 'discover') {
    payload = {
      id: mixId,
      kind: 'album-section',
      albums: buildAlbumDiscovery(profile, new Set(), 18),
    };
  } else if (mixId.startsWith('genre-')) {
    const genre = mixId.slice('genre-'.length);
    if (!GENRE_SET.has(genre)) return null;
    payload = { id: mixId, kind: 'genre', genre, tracks: buildGenreTracks(profile, genre, 30) };
  }

  if (!payload) return null;
  if (payload.tracks) {
    payload.tracks = await enrichTracks(payload.tracks);
  }
  return payload;
}

export async function savePreferredGenres(userId: number, genres: unknown): Promise<RecommendationProfile> {
  if (!Array.isArray(genres)) {
    throw new Error('genres должен быть массивом');
  }

  const unique = [...new Set(genres.map((genre) => String(genre).toUpperCase()))];

  if (unique.length > 5) {
    throw new Error('Можно выбрать не больше 5 жанров');
  }
  for (const genre of unique) {
    if (!GENRE_SET.has(genre)) {
      throw new Error(`Неизвестный жанр: ${genre}`);
    }
  }

  const existing = await db.orm.public.UserGenrePreference.where({ userId }).all();
  await db.transaction(async (tx) => {
    for (const preference of existing) {
      await tx.orm.public.UserGenrePreference.where({ id: preference.id }).delete();
    }
    for (const genre of unique) {
      await tx.orm.public.UserGenrePreference.create({ userId, genre: genre as any });
    }
  });

  return getRecommendationProfile(userId);
}
