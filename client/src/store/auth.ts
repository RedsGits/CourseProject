import { create } from 'zustand';
import { api } from '../api/client';
import type { AuthResponse, User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  errorField: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string) => Promise<boolean>;
  logout: () => void;
  loadFromStorage: () => void;
  clearError: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  errorField: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null, errorField: null });
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return true;
    } catch (e: any) {
      const message = e.response?.data?.error ?? 'Ошибка входа';
      const field = e.response?.data?.field ?? null;
      set({ error: message, errorField: field, isLoading: false });
      return false;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null, errorField: null });
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return true;
    } catch (e: any) {
      const message = e.response?.data?.error ?? 'Ошибка регистрации';
      const field = e.response?.data?.field ?? null;
      set({ error: message, errorField: field, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null, errorField: null });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token');
    const userRaw = localStorage.getItem('user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        set({ user, token });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  },

  clearError: () => set({ error: null, errorField: null }),
}));