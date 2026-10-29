import { create } from 'zustand';
import { api } from '../api/client';
import type { Artist } from '../types';

interface ArtistState {
  artistsMap: Record<number, string>;
  fetchArtists: () => Promise<void>;
  isLoading: boolean;
}

export const useArtists = create<ArtistState>((set) => ({
  artistsMap: {},
  isLoading: false,
  
  fetchArtists: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<Artist[]>('/artists');
      const map: Record<number, string> = {};
      data.forEach((artist) => {
        map[artist.id] = artist.name;
      });
      set({ artistsMap: map });
    } catch (err) {
      console.error('Ошибка загрузки артистов:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));