export type Genre =
  | 'POP' | 'ROCK' | 'HIPHOP' | 'RNB' | 'ELECTRONIC' | 'HOUSE' | 'TECHNO' | 'TRANCE'
  | 'DUBSTEP' | 'DRUM_AND_BASS' | 'RAP' | 'JAZZ' | 'BLUES' | 'CLASSICAL' | 'ORCHESTRAL'
  | 'OPERA' | 'COUNTRY' | 'FOLK' | 'FOLK_ROCK' | 'INDIE' | 'ALTERNATIVE' | 'METAL'
  | 'HEAVY_METAL' | 'PUNK' | 'HARDCORE' | 'REGGAE' | 'SKA' | 'SOUL' | 'FUNK' | 'DISCO'
  | 'LATIN' | 'PHONK' | 'SALSA' | 'BOSSA_NOVA' | 'SAMBA' | 'AFROBEAT' | 'K_POP' | 'J_POP'
  | 'ANIME' | 'SOUNDTRACK' | 'AMBIENT' | 'CHILLOUT' | 'LO_FI' | 'NEW_AGE' | 'GOSPEL'
  | 'SPIRITUAL' | 'WORLD' | 'CELTIC' | 'GUITAR' | 'PIANO' | 'EXPERIMENTAL' | 'SPOKEN_WORD';

export type AlbumType = 'SINGLE' | 'EP' | 'ALBUM';

export type TrackArtistRole = 'PRIMARY' | 'FEATURED';

export interface TrackArtistInfo {
  id: number;
  name: string;
  role: TrackArtistRole;
  order: number;
}

export interface TrackAlbumInfo {
  id: number;
  title: string;
  coverUrl: string | null;
  type: AlbumType;
}

export interface Artist {
  id: number;
  name: string;
  nameNormalized: string;
  bio: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  countryCode: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: number | null;
  trackCount?: number;
}

export interface Album {
  id: number;
  title: string;
  artists: TrackArtistInfo[];
  year: number | null;
  coverUrl: string | null;
  type: AlbumType;
  labelId: number;
  createdAt: string;
}

export interface Track {
  id: number;
  title: string;
  duration: number;
  fileUrl: string;
  genre: Genre;
  order: number;
  albumId: number;
  labelId: number;
  playCount: number;
  likeCount: number;
  dislikeCount: number;
  lyrics: string | null;
  syncedLyrics: string | null;
  artists: TrackArtistInfo[];
  album: TrackAlbumInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'LABEL' | 'ADMIN';
  labelName?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LyricsResponse {
  lyrics: string | null;
  syncedLyrics: string | null;
  hasLyrics: boolean;
  hasSyncedLyrics: boolean;
  found: boolean;
}

export interface LrcLine {
  time: number;
  text: string;
}