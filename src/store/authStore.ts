import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
  user: any | null; // We can store serialized Firebase user or local user
  userData: any | null; // Firestore user data including role
  setUser: (user: any | null) => void;
  setUserData: (data: any | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userData: null,
      setUser: (user) => set({ user }),
      setUserData: (userData) => set({ userData }),
      logout: () => set({ user: null, userData: null }),
    }),
    {
      name: 'lynko-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
