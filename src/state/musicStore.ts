import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpotifyTrack, SpotifyPlaylist, LikedTrack, VibeMode, UserPreferences } from "../types/music";

interface MusicState {
  // User preferences
  userPreferences: UserPreferences;
  likedTracks: LikedTrack[];
  userPlaylists: SpotifyPlaylist[];
  
  // Current session
  currentVibeMode: VibeMode | null;
  feedTracks: SpotifyTrack[];
  currentTrackIndex: number;
  
  // Actions
  setUserPreferences: (preferences: UserPreferences) => void;
  likeTrack: (track: SpotifyTrack, vibeMode?: string) => void;
  unlikeTrack: (trackId: string) => void;
  setVibeMode: (mode: VibeMode | null) => void;
  setFeedTracks: (tracks: SpotifyTrack[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setCurrentTrackIndex: (index: number) => void;
  addPlaylist: (playlist: SpotifyPlaylist) => void;
  updatePlaylist: (playlistId: string, updates: Partial<SpotifyPlaylist>) => void;
  removePlaylist: (playlistId: string) => void;
  isTrackLiked: (trackId: string) => boolean;
}

const defaultPreferences: UserPreferences = {
  favoriteGenres: [],
  skipExplicit: false,
  preferredLanguage: "en",
  audioQuality: "normal",
};

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      userPreferences: defaultPreferences,
      likedTracks: [],
      userPlaylists: [],
      currentVibeMode: null,
      feedTracks: [],
      currentTrackIndex: 0,

      setUserPreferences: (preferences) => {
        set({ userPreferences: preferences });
      },

      likeTrack: (track, vibeMode) => {
        const likedTrack: LikedTrack = {
          track,
          likedAt: new Date().toISOString(),
          vibeMode,
        };
        set((state) => ({
          likedTracks: [...state.likedTracks.filter(lt => lt.track.id !== track.id), likedTrack],
        }));
      },

      unlikeTrack: (trackId) => {
        set((state) => ({
          likedTracks: state.likedTracks.filter(lt => lt.track.id !== trackId),
        }));
      },

      setVibeMode: (mode) => {
        set({ currentVibeMode: mode });
      },

      setFeedTracks: (tracks) => {
        set({ feedTracks: tracks, currentTrackIndex: 0 });
      },

      nextTrack: () => {
        set((state) => ({
          currentTrackIndex: Math.min(state.currentTrackIndex + 1, state.feedTracks.length - 1),
        }));
      },

      previousTrack: () => {
        set((state) => ({
          currentTrackIndex: Math.max(state.currentTrackIndex - 1, 0),
        }));
      },

      setCurrentTrackIndex: (index) => {
        set({ currentTrackIndex: index });
      },

      addPlaylist: (playlist) => {
        set((state) => ({
          userPlaylists: [...state.userPlaylists.filter(p => p.id !== playlist.id), playlist],
        }));
      },

      updatePlaylist: (playlistId, updates) => {
        set((state) => ({
          userPlaylists: state.userPlaylists.map(p => 
            p.id === playlistId ? { ...p, ...updates } : p
          ),
        }));
      },

      removePlaylist: (playlistId) => {
        set((state) => ({
          userPlaylists: state.userPlaylists.filter(p => p.id !== playlistId),
        }));
      },

      isTrackLiked: (trackId) => {
        return get().likedTracks.some(lt => lt.track.id === trackId);
      },
    }),
    {
      name: "music-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userPreferences: state.userPreferences,
        likedTracks: state.likedTracks,
        userPlaylists: state.userPlaylists,
        currentVibeMode: state.currentVibeMode, // ✅ add this
      }),

    }
  )
);