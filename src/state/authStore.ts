import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpotifyUser } from "../types/music";

interface AuthState {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  connectedServices: ("spotify")[];
  
  // Actions
  setSpotifyAuth: (accessToken: string, refreshToken: string, user: SpotifyUser) => void;
  logout: () => void;
  updateUser: (user: SpotifyUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      connectedServices: [],

      setSpotifyAuth: (accessToken, refreshToken, user) => {
        set({
          isAuthenticated: true,
          spotifyAccessToken: accessToken,
          spotifyRefreshToken: refreshToken,
          user,
          connectedServices: [...get().connectedServices.filter(s => s !== "spotify"), "spotify"],
        });
      },


      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          spotifyAccessToken: null,
          spotifyRefreshToken: null,
          connectedServices: [],
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        connectedServices: state.connectedServices,
        // Don't persist tokens for security - they'll be stored in SecureStore
      }),
    }
  )
);