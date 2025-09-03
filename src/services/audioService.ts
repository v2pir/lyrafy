import { Audio } from "expo-av";
import { SpotifyTrack } from "../types/music";
import { usePlayerStore } from "../state/playerStore";

class AudioService {
  private sound: Audio.Sound | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  async loadTrack(track: SpotifyTrack): Promise<boolean> {
    try {
      await this.initialize();
      
      // Stop and unload current sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      if (!track.preview_url) {
        console.warn("No preview URL available for track:", track.name);
        return false;
      }

      // Create new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { 
          shouldPlay: false,
          isLooping: false,
          volume: usePlayerStore.getState().volume,
        }
      );

      this.sound = sound;

      // Set up status update callback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          const playerStore = usePlayerStore.getState();
          
          if (status.positionMillis !== undefined) {
            playerStore.setPosition(status.positionMillis);
          }
          
          if (status.durationMillis !== undefined) {
            playerStore.setDuration(status.durationMillis);
          }
          
          playerStore.setIsPlaying(status.isPlaying || false);

          // Auto-advance when track ends
          if (status.didJustFinish) {
            this.onTrackEnd();
          }
        }
      });

      // Update player store
      usePlayerStore.getState().setCurrentTrack(track);
      
      return true;
    } catch (error) {
      console.error("Error loading track:", error);
      return false;
    }
  }

  async play(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
    } catch (error) {
      console.error("Error playing track:", error);
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
    } catch (error) {
      console.error("Error pausing track:", error);
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
      }
    } catch (error) {
      console.error("Error stopping track:", error);
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.setPositionAsync(positionMillis);
      }
    } catch (error) {
      console.error("Error seeking:", error);
    }
  }

  async setVolume(volume: number): Promise<void> {
    try {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      
      if (this.sound) {
        await this.sound.setVolumeAsync(clampedVolume);
      }
      
      usePlayerStore.getState().setVolume(clampedVolume);
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  }

  async togglePlayPause(): Promise<void> {
    const isPlaying = usePlayerStore.getState().isPlaying;
    
    if (isPlaying) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  private onTrackEnd(): void {
    // This will be called when a track finishes
    // You can implement auto-advance logic here
    console.log("Track ended");
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      usePlayerStore.getState().reset();
    } catch (error) {
      console.error("Error cleaning up audio:", error);
    }
  }

  getPlaybackStatus(): {
    isPlaying: boolean;
    position: number;
    duration: number;
    currentTrack: SpotifyTrack | null;
  } {
    const state = usePlayerStore.getState();
    return {
      isPlaying: state.isPlaying,
      position: state.position,
      duration: state.duration,
      currentTrack: state.currentTrack,
    };
  }
}

export const audioService = new AudioService();