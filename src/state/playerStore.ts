import { create } from "zustand";
import { SpotifyTrack, PlaybackState } from "../types/music";

interface PlayerState extends PlaybackState {
  // Actions
  setCurrentTrack: (track: SpotifyTrack | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  reset: () => void;
}

const initialState: PlaybackState = {
  isPlaying: false,
  currentTrack: null,
  position: 0,
  duration: 0,
  volume: 1.0,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,

  setCurrentTrack: (track) => {
    set({ currentTrack: track, position: 0 });
  },

  setIsPlaying: (isPlaying) => {
    set({ isPlaying });
  },

  setPosition: (position) => {
    set({ position });
  },

  setDuration: (duration) => {
    set({ duration });
  },

  setVolume: (volume) => {
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },

  reset: () => {
    set(initialState);
  },
}));