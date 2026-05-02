import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  fullName: string;
  monthlyIncome: number;
  role?: string;
  businessRequestPending?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token: string) => {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user: User) => {
        set({ user });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated })
    }
  )
);

const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
