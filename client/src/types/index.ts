export interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'USER' | 'LABEL' | 'ADMIN';
  labelName?: string | null;
}

export interface Artist {
  id: number;
  name: string;
  nameNormalized: string;
  bio: string | null;
  imageUrl: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Track {
  id: number;
  title: string;
  duration: number;
  fileUrl: string;
  genre: string | null;
  artistId: number;
  albumId: number | null;
  labelId: number;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}