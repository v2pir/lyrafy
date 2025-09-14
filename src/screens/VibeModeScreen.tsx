// src/screens/VibeModeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, Dimensions, StyleSheet, Pressable, AppState, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useMusicStore } from "../state/musicStore";
import { VibeMode, SpotifyTrack, SpotifyPlaylist } from "../types/music";
import { spotifyService } from "../services/spotifyService";
import { deezerService } from "../services/deezerService";
import { removeDuplicateTracksByName } from "../utils/deduplication";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 300;
const EXIT_SWIPE_THRESHOLD = SCREEN_HEIGHT * 0.15; // Swipe down 15% of screen height to exit

export default function VibeModeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const vibeMode = (route.params as { vibeMode: VibeMode })?.vibeMode;
  const { setFeedTracks, likeTrack, unlikeTrack, isTrackLiked } = useMusicStore();

  const [feedTracks, setLocalTracks] = useState<SpotifyTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSwipe, setPendingSwipe] = useState<"left" | "right" | "exit" | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  
  // Temporary playlist state
  const [tempPlaylist, setTempPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrack[]>([]);
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  
  // Enhanced animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);
  const albumArtScale = useSharedValue(1);
  const albumArtRotation = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const controlsOpacity = useSharedValue(0);
  
  // Audio cache to store pre-loaded sounds
  const audioCache = useRef<Map<string, Audio.Sound>>(new Map());
  
  // Use ref to store sound so we can access it from gesture handler
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Ref to track if component is mounted (to stop background processes)
  const isMountedRef = useRef(true);
  
  // Global audio cleanup function
  const forceStopAudio = () => {
    console.log("🔄 Force stopping audio globally");
    if (soundRef.current) {
      try {
        soundRef.current.stopAsync().catch(console.error);
        soundRef.current.unloadAsync().catch(console.error);
        soundRef.current = null;
        setSound(null);
        console.log("✅ Audio force stopped globally");
      } catch (err) {
        console.error("Error force stopping audio:", err);
      }
    }
    
    // Also try to stop all audio using Audio API
    try {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log("✅ Audio mode reset to stop all sounds");
    } catch (err) {
      console.error("Error resetting audio mode:", err);
    }
  };

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Like animation values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartTranslateY = useSharedValue(0);

  // Load initial Spotify tracks (show immediately, then find previews in background)
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        console.log("🎵 Loading Spotify tracks for vibe:", vibeMode?.name);
        
        // Check if this is an AI-generated vibe (has ai-vibe prefix)
        const isAIGeneratedVibe = vibeMode?.id?.startsWith('ai-vibe-');
        
        let spotifyTracks: SpotifyTrack[];
        
        if (isAIGeneratedVibe) {
          // For AI-generated vibes, use the tracks from the music store
          // (they were already set by the HomeScreen)
          const storeTracks = useMusicStore.getState().feedTracks;
          spotifyTracks = storeTracks || [];
          console.log(`🎵 Using ${spotifyTracks.length} pre-loaded AI tracks for ${vibeMode?.name}`);
        } else {
          // For regular vibes, search for tracks
          spotifyTracks = await spotifyService.getRecommendationsForVibeMode(vibeMode, []);
          console.log(`🎵 Found ${spotifyTracks.length} Spotify tracks for ${vibeMode?.name}`);
        }
        
        // Remove duplicate tracks by name
        const uniqueTracks = removeDuplicateTracksByName(spotifyTracks);
        
        // Show all unique Spotify tracks immediately (without previews initially)
        setLocalTracks(uniqueTracks);
        setFeedTracks(uniqueTracks);
        setIsLoading(false);
        
        // Now find Deezer previews in background
        console.log("🔍 Finding Deezer previews in background...");
        findDeezerPreviews(uniqueTracks);
        
      } catch (err) {
        console.error("Failed to load tracks:", err);
        setIsLoading(false);
      }
    })();
  }, [vibeMode]);

  // Background function to find Deezer previews
  const findDeezerPreviews = async (spotifyTracks: SpotifyTrack[]) => {
    const tracksWithPreviews: SpotifyTrack[] = [];
    
    for (let i = 0; i < spotifyTracks.length; i++) {
      // Check if component is still mounted before continuing
      if (!isMountedRef.current) {
        console.log("🛑 Component unmounted, stopping Deezer search");
        return;
      }
      
      // Add a small delay to allow for immediate exit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check again after delay
      if (!isMountedRef.current) {
        console.log("🛑 Component unmounted during delay, stopping Deezer search");
        return;
      }
      
      const spotifyTrack = spotifyTracks[i];
      try {
        // Search for this specific track on Deezer
        const deezerTracks = await deezerService.searchTracks(
          `${spotifyTrack.name} ${spotifyTrack.artists[0]?.name}`, 
          3
        );
        
        // Find the best match
        const bestMatch = deezerTracks.find(deezerTrack => 
          deezerTrack.title.toLowerCase().includes(spotifyTrack.name.toLowerCase()) ||
          spotifyTrack.name.toLowerCase().includes(deezerTrack.title.toLowerCase())
        );
        
        if (bestMatch && bestMatch.preview) {
          // Use Spotify track data but with Deezer preview
          const trackWithPreview = {
            ...spotifyTrack,
            preview_url: bestMatch.preview
          };
          tracksWithPreviews.push(trackWithPreview);
          console.log(`✅ Found preview for: ${spotifyTrack.name} (${tracksWithPreviews.length}/${spotifyTracks.length})`);
        } else {
          console.log(`❌ No preview found for: ${spotifyTrack.name}`);
        }
      } catch (err) {
        console.warn(`Failed to find preview for ${spotifyTrack.name}:`, err);
      }
      
      // Update the feed with tracks that have previews so far (only if still mounted)
      if (tracksWithPreviews.length > 0 && isMountedRef.current) {
        setLocalTracks(tracksWithPreviews);
        setFeedTracks(tracksWithPreviews);
      }
    }
    
    if (isMountedRef.current) {
      console.log(`🎵 Background search complete: Found ${tracksWithPreviews.length} tracks with previews out of ${spotifyTracks.length} total`);
    }
  };


  // Entrance animations
  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
    
    // Staggered animations for header and controls
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    controlsOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    
    // Continuous subtle animations - floating effect instead of spinning
    albumArtRotation.value = withRepeat(
      withTiming(5, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    
    pulseAnim.value = withRepeat(
      withTiming(1.05, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  // Preload sounds when tracks are loaded
  useEffect(() => {
    if (feedTracks.length > 0) {
      preloadAllSounds(feedTracks);
    }
  }, [feedTracks]);

  // Play the current track when index changes
  useEffect(() => {
    // Only play if we have tracks and we're not still loading
    if (feedTracks.length > 0 && !isLoading) {
      // Add a small delay for the first track to ensure pre-loading has started
      if (currentIndex === 0) {
        setTimeout(() => {
          playCurrentTrack();
        }, 500);
      } else {
    playCurrentTrack();
      }
    }
  }, [currentIndex, feedTracks, isLoading]);

  // Update like status when track changes
  useEffect(() => {
    const track = feedTracks[currentIndex];
    if (track) {
      const liked = isTrackLiked(track.id);
      setIsLiked(liked);
      
      // Show/hide heart based on like status
      if (liked) {
        setShowLikeAnimation(true);
        heartScale.value = 1;
        heartOpacity.value = 1;
        heartTranslateY.value = -20;
      } else {
        setShowLikeAnimation(false);
        heartScale.value = 0;
        heartOpacity.value = 0;
        heartTranslateY.value = 0;
      }
    }
  }, [currentIndex, feedTracks, isTrackLiked]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - cleaning up audio");
      isMountedRef.current = false;
      forceStopAudio();
      cleanupAudioCache();
    };
  }, []);

  // Stop audio when app goes to background or screen loses focus
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log("🧹 App going to background - stopping audio");
        forceStopAudio();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Cleanup audio instances when they change
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  // Pre-load all sounds when tracks are available
  const preloadAllSounds = async (tracks: SpotifyTrack[]) => {
    console.log("🎵 Pre-loading sounds for", tracks.length, "tracks");
    setIsPreloading(true);
    
    try {
      // Initialize audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load sounds in batches to avoid overwhelming the system
      const batchSize = 3; // Smaller batches for faster loading
      for (let i = 0; i < tracks.length; i += batchSize) {
        const batch = tracks.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (track) => {
            if (track.preview_url && !audioCache.current.has(track.id)) {
              try {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: track.preview_url },
                  { shouldPlay: false, volume: 0.0 }
                );
                audioCache.current.set(track.id, sound);
                console.log("✅ Pre-loaded:", track.name);
              } catch (err) {
                console.log("❌ Failed to pre-load:", track.name, err);
              }
            }
          })
        );
        
        // Smaller delay between batches
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log("🎵 Pre-loading complete! Loaded", audioCache.current.size, "sounds");
      
    } catch (err) {
      console.error("❌ Error pre-loading sounds:", err);
    } finally {
      setIsPreloading(false);
    }
  };

  const playCurrentTrack = async () => {
    const track = feedTracks[currentIndex];
    if (!track?.preview_url) {
      console.log("No preview URL for track:", track?.name);
      return;
    }
    
    try {
      console.log("🎵 Playing track:", track.name, "Index:", currentIndex);
      
      // Get pre-loaded sound from cache
      let cachedSound = audioCache.current.get(track.id);
      
      // If no cached sound, try to load it on-demand
      if (!cachedSound) {
        console.log("⚠️ No cached sound, loading on-demand:", track.name);
        try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
            { shouldPlay: false, volume: 0.0 }
          );
          audioCache.current.set(track.id, newSound);
          cachedSound = newSound;
          console.log("✅ Loaded on-demand:", track.name);
        } catch (err) {
          console.error("❌ Failed to load on-demand:", track.name, err);
          return;
        }
      }
      
      // If we have a current sound, crossfade to the new one
      if (sound && !isCrossfading) {
        await crossfadeToNewTrack(cachedSound);
      } else {
        // First track or no current sound - play immediately
        if (sound) {
          try {
            await sound.stopAsync();
          } catch (err) {
            console.log("Error stopping previous sound:", err);
          }
        }
        
        // Reset and play cached sound
        await cachedSound.setPositionAsync(0);
        await cachedSound.setVolumeAsync(1.0);
        await cachedSound.playAsync();
        
        setSound(cachedSound);
        soundRef.current = cachedSound;
      }
      
    } catch (err) {
      console.error("❌ Error playing preview:", err);
    }
  };

  const crossfadeToNewTrack = async (newSound: Audio.Sound) => {
    if (isCrossfading || !sound) return;
    
    setIsCrossfading(true);
    console.log("🎵 Starting crossfade to new track");
    
    try {
      // Reset new sound to beginning
      await newSound.setPositionAsync(0);
      await newSound.setVolumeAsync(0.0);
      await newSound.playAsync();
      
      // Crossfade duration (0.4 seconds - super fast!)
      const crossfadeDuration = 400;
      const steps = 20; // Fewer steps for faster transition
      const stepDuration = crossfadeDuration / steps;
      
      // Fade out current sound and fade in new sound
      for (let i = 0; i <= steps; i++) {
        if (!isMountedRef.current) break; // Stop if component unmounted
        
        const progress = i / steps;
        const currentVolume = 1.0 - progress; // Fade out
        const nextVolume = progress; // Fade in
        
        // Update volumes
        try {
          await sound.setVolumeAsync(currentVolume);
          await newSound.setVolumeAsync(nextVolume);
        } catch (err) {
          console.log("Error updating volumes:", err);
        }
        
        // Wait for next step
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
      
      // Stop old sound
      try {
        await sound.stopAsync();
      } catch (err) {
        console.log("Error stopping old sound:", err);
      }
      
      // Set new sound as current
      setSound(newSound);
      soundRef.current = newSound;
      
      console.log("✅ Crossfade completed");
      
    } catch (err) {
      console.error("❌ Error during crossfade:", err);
      // Fallback: just play the new track normally
      try {
        await sound.stopAsync();
        await newSound.setPositionAsync(0);
        await newSound.setVolumeAsync(1.0);
      await newSound.playAsync();
        setSound(newSound);
        soundRef.current = newSound;
      } catch (fallbackErr) {
        console.error("❌ Fallback also failed:", fallbackErr);
      }
    } finally {
      setIsCrossfading(false);
    }
  };


  const stopAllAudio = async () => {
    try {
      console.log("🔄 Stopping all audio");
      
      // Stop current sound
      if (sound) {
        await sound.stopAsync();
        setSound(null);
      }
      
      // Clear refs
      soundRef.current = null;
      
    } catch (err) {
      console.error("Error stopping audio:", err);
    }
  };

  // Clean up audio cache on unmount
  const cleanupAudioCache = async () => {
    console.log("🧹 Cleaning up audio cache");
    try {
      for (const [trackId, cachedSound] of audioCache.current) {
        try {
          await cachedSound.unloadAsync();
        } catch (err) {
          console.log("Error unloading cached sound:", err);
        }
      }
      audioCache.current.clear();
    } catch (err) {
      console.error("Error cleaning up audio cache:", err);
    }
  };

  const handleLike = async () => {
    const track = feedTracks[currentIndex];
    if (!track) return;

    try {
      if (isLiked) {
        // Unlike the track
        console.log("💔 Unliking track:", track.name);
        unlikeTrack(track.id);
        setIsLiked(false);
        
        // Hide heart with fade out animation
        heartOpacity.value = withTiming(0, { duration: 300 });
        heartTranslateY.value = withTiming(-40, { duration: 300 });
        setTimeout(() => {
          setShowLikeAnimation(false);
        }, 300);
        
        // Remove from Spotify liked songs
        try {
          await spotifyService.removeTrackFromLikedSongs(track.id);
          console.log("✅ Removed from Spotify liked songs");
        } catch (err) {
          console.error("❌ Failed to remove from Spotify:", err);
        }
      } else {
        // Like the track
        console.log("❤️ Liking track:", track.name);
        likeTrack(track, vibeMode?.name);
        setIsLiked(true);
        
        // Trigger like animation
        triggerLikeAnimation();
        
        // Add to Spotify liked songs
        try {
          await spotifyService.addTrackToLikedSongs(track.id);
          console.log("✅ Added to Spotify liked songs");
        } catch (err) {
          console.error("❌ Failed to add to Spotify:", err);
        }
      }
    } catch (err) {
      console.error("❌ Error handling like:", err);
    }
  };

  const triggerLikeAnimation = () => {
    setShowLikeAnimation(true);
    
    // Reset animation values
    heartScale.value = 0;
    heartOpacity.value = 0;
    heartTranslateY.value = 0;
    
    // Instagram-style heart animation - starts big in center, then moves to corner
    heartScale.value = withSequence(
      withTiming(1.5, { duration: 150 }), // Start big
      withTiming(0.8, { duration: 200 }), // Shrink slightly
      withTiming(0.6, { duration: 300 })  // Shrink more as it moves
    );
    heartOpacity.value = withSequence(
      withTiming(1, { duration: 150 }),   // Fade in quickly
      withTiming(0.8, { duration: 200 }), // Stay visible
      withTiming(0, { duration: 300 })    // Fade out
    );
    heartTranslateY.value = withSequence(
      withTiming(-30, { duration: 150 }), // Move up initially
      withTiming(-60, { duration: 200 }), // Move up more
      withTiming(-80, { duration: 300 })  // Move to corner
    );
    
    // Hide after animation completes
    setTimeout(() => {
      setShowLikeAnimation(false);
    }, 650);
  };

  // Create temporary playlist
  const createTempPlaylist = async (): Promise<SpotifyPlaylist | null> => {
    try {
      setIsCreatingPlaylist(true);
      console.log("🎵 Creating temporary playlist...");
      
      const playlist = await spotifyService.createPlaylist(
        "untitled",
        "Created by lyrafy - swipe right to add songs"
      );
      
      console.log("✅ Temporary playlist created:", playlist.id);
      setTempPlaylist(playlist);
      return playlist;
    } catch (error) {
      console.error("❌ Failed to create temporary playlist:", error);
      Alert.alert("Error", "Failed to create playlist. Please try again.");
      return null;
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Add track to temporary playlist
  const addTrackToTempPlaylist = async (track: SpotifyTrack) => {
    try {
      // Create playlist if it doesn't exist
      let playlist = tempPlaylist;
      if (!playlist) {
        playlist = await createTempPlaylist();
        if (!playlist) return;
      }

      // Add track to playlist
      await spotifyService.addTracksToPlaylist(playlist.id, [track.uri]);
      
      // Update local state
      setPlaylistTracks(prev => [...prev, track]);
      
      console.log("✅ Added track to playlist:", track.name);
    } catch (error) {
      console.error("❌ Failed to add track to playlist:", error);
      Alert.alert("Error", "Failed to add song to playlist.");
    }
  };

  // Delete temporary playlist
  const deleteTempPlaylist = async () => {
    if (!tempPlaylist) return;
    
    try {
      console.log("🗑️ Deleting temporary playlist...");
      await spotifyService.deletePlaylist(tempPlaylist.id);
      console.log("✅ Temporary playlist deleted");
    } catch (error) {
      console.error("❌ Failed to delete playlist:", error);
      // Don't show error to user since they chose to delete it
    }
  };

  // Show playlist confirmation dialog
  const showPlaylistConfirmation = () => {
    if (playlistTracks.length === 0) return;
    
    Alert.alert(
      "playlist created! 🎵",
      `you've added ${playlistTracks.length} songs to your playlist. do you want to keep it?`,
      [
        {
          text: "delete playlist",
          style: "destructive",
          onPress: async () => {
            await deleteTempPlaylist();
            setTempPlaylist(null);
            setPlaylistTracks([]);
          }
        },
        {
          text: "keep playlist",
          style: "default",
          onPress: () => {
            // Keep the playlist - do nothing, it stays on Spotify
            console.log("✅ Playlist kept on Spotify");
          }
        }
      ]
    );
  };

  const exitVibeMode = async () => {
    console.log("🚪 Exiting vibe mode");
    
    // Stop background processes
    isMountedRef.current = false;
    
    // Stop current audio immediately
    await stopAllAudio();
    
    // Reset navigation stack to ensure proper layout
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" as never }],
    });
  };

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      console.log("👆 Double tap detected - toggling like");
      runOnJS(handleLike)();
    });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      console.log("🔄 Gesture started");
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotation.value = (event.translationX / SCREEN_WIDTH) * 20;
    })
    .onEnd(() => {
      try {
        console.log("🔄 Gesture ended, translateX:", translateX.value, "translateY:", translateY.value);
        
        // Check for exit swipe (swipe down)
        const shouldExit = translateY.value > EXIT_SWIPE_THRESHOLD;
        const shouldSwipeRight = translateX.value > SWIPE_THRESHOLD && !shouldExit;
        const shouldSwipeLeft = translateX.value < -SWIPE_THRESHOLD && !shouldExit;
        
        console.log("🔄 Swipe decision:", { 
          shouldExit, 
          shouldSwipeRight, 
          shouldSwipeLeft, 
          horizontalThreshold: SWIPE_THRESHOLD,
          exitThreshold: EXIT_SWIPE_THRESHOLD 
        });
        
        if (shouldExit) {
          console.log("🚪 Swiping down - exit vibe mode");
          runOnJS(setPendingSwipe)("exit");
          translateY.value = withTiming(SCREEN_HEIGHT * 1.5, { duration: SWIPE_OUT_DURATION });
          translateX.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
        } else if (shouldSwipeRight) {
          console.log("🔄 Swiping right - like");
          translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION });
          translateY.value = withTiming(50, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(30, { duration: SWIPE_OUT_DURATION });
          runOnJS(setPendingSwipe)("right");
        } else if (shouldSwipeLeft) {
          console.log("🔄 Swiping left - dislike");
          translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION });
          translateY.value = withTiming(50, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(-30, { duration: SWIPE_OUT_DURATION });
          runOnJS(setPendingSwipe)("left");
        } else {
          console.log("🔄 Returning to center");
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotation.value = withSpring(0);
        }
      } catch (error) {
        console.error("❌ Error in gesture onEnd:", error);
        // Reset to center position safely
        try {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotation.value = withSpring(0);
        } catch (resetError) {
          console.error("❌ Error resetting gesture values:", resetError);
        }
      }
    });

  const composedGesture = Gesture.Simultaneous(doubleTapGesture, panGesture);

  const handleSwipe = async (direction: "left" | "right") => {
    console.log("🔄 handleSwipe called with direction:", direction);
    
    const currentTrack = feedTracks[currentIndex];
    
    // Handle swipe right - add to playlist
    if (direction === "right" && currentTrack) {
      console.log("🎵 Swiping right - adding to playlist:", currentTrack.name);
      await addTrackToTempPlaylist(currentTrack);
    }
    
    // Reset animation values for next card
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;

    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      console.log("🔄 Current index:", prev, "Next index:", nextIndex, "Total tracks:", feedTracks.length);
      
      if (nextIndex >= feedTracks.length) {
        // End of deck - show playlist confirmation if there are tracks in playlist
        console.log("🔄 End of deck reached");
        if (playlistTracks.length > 0) {
          setTimeout(() => {
            showPlaylistConfirmation();
          }, 500); // Small delay to let animations finish
        }
        return prev;
      }
      console.log("🔄 Moving to next track, index:", nextIndex);
      return nextIndex;
    });
  };

  // Handle pending swipe
  useEffect(() => {
    if (pendingSwipe) {
      console.log("🔄 Processing pending swipe:", pendingSwipe);
      if (pendingSwipe === "exit") {
        // Handle exit - stop everything and navigate
        console.log("🚪 Exiting vibe mode from useEffect");
        isMountedRef.current = false;
        
        // Use timeout to ensure cleanup happens
        setTimeout(async () => {
          try {
            await stopAllAudio();
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs" as never }],
            });
          } catch (error) {
            console.error("Error during exit:", error);
            // Force navigation even if cleanup fails
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs" as never }],
            });
          }
        }, 100);
      } else {
        // Handle regular swipe
        handleSwipe(pendingSwipe);
      }
      setPendingSwipe(null);
    }
  }, [pendingSwipe]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heartScale.value },
      { translateY: heartTranslateY.value },
      { translateX: interpolate(heartScale.value, [0, 1], [0, -50]) },
    ],
    opacity: heartOpacity.value,
  }));

  // Enhanced animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: scaleAnim.value },
      { translateY: slideAnim.value }
    ]
  }));

  const albumArtAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: albumArtScale.value * pulseAnim.value },
      { rotate: `${albumArtRotation.value}deg` },
      { translateY: Math.sin(albumArtRotation.value * Math.PI / 180) * 8 }
    ]
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: interpolate(headerOpacity.value, [0, 1], [20, 0]) }]
  }));

  const controlsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    transform: [{ translateY: interpolate(controlsOpacity.value, [0, 1], [30, 0]) }]
  }));

  if (isLoading || !feedTracks.length) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">
          {isLoading ? "Loading tracks with previews..." : 
           isPreloading ? "Pre-loading audio for smooth playback..." : 
           "No tracks available"}
        </Text>
      </SafeAreaView>
    );
  }

  const track = feedTracks[currentIndex];

  if (!track) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">No more tracks</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.fullScreen, containerStyle]}>
          <Animated.View style={[styles.fullScreen, animatedStyle]}>
              {/* Futuristic Background */}
              <LinearGradient
                colors={['#000000', '#0a0a0a', '#1a1a1a']}
                style={styles.gradientBackground}
              >
                {/* Background Image with Enhanced Blur */}
                <Image
                  source={{ uri: track.album.images[0]?.url }}
                  style={styles.backgroundImage}
                  blurRadius={25}
                />
                
                {/* Enhanced Overlay */}
                <View style={styles.overlay} />
                
                {/* Futuristic Header */}
                <Animated.View style={[styles.header, headerAnimatedStyle]}>
                  <BlurView intensity={20} style={styles.headerBlur}>
                    <Text style={styles.logo}>Lyrafy</Text>
                    <View style={styles.headerRight}>
                      <Text style={styles.exitHint}>Swipe down to exit</Text>
                    </View>
                  </BlurView>
                </Animated.View>
          
                {/* Main Content */}
                <View style={styles.content}>
                  {/* Enhanced Album Art */}
                  <Animated.View style={[styles.albumArtContainer, albumArtAnimatedStyle]}>
                    <BlurView intensity={10} style={styles.albumArtBlur}>
            <Image
              source={{ uri: track.album.images[0]?.url }}
              style={styles.albumArt}
            />
                      {/* Glow effect */}
                      <View style={styles.albumArtGlow} />
                    </BlurView>
                  </Animated.View>
                  
                  {/* Enhanced Track Info */}
                  <Animated.View style={[styles.trackInfo, controlsAnimatedStyle]}>
                    <BlurView intensity={15} style={styles.trackInfoBlur}>
                      <Text style={styles.songTitle} numberOfLines={2}>
                        {track.name}
                      </Text>
                      <Text style={styles.artistName} numberOfLines={1}>
                        {track.artists.map(a => a.name).join(", ")}
                      </Text>
                      <Text style={styles.albumName} numberOfLines={1}>
                        {track.album.name}
                      </Text>
                      <Text style={styles.releaseDate}>
                        Released: {new Date(track.album.release_date).getFullYear()}
                      </Text>
                    </BlurView>
                  </Animated.View>

                  {/* Playlist Status */}
                  {playlistTracks.length > 0 && (
                    <Animated.View style={[styles.playlistStatusCard, controlsAnimatedStyle]}>
                      <BlurView intensity={10} style={styles.playlistStatusBlur}>
                        <View style={styles.playlistStatusContent}>
                          <Ionicons name="list" size={20} color="#22c55e" />
                          <Text style={styles.playlistStatusText}>
                            {playlistTracks.length} song{playlistTracks.length !== 1 ? 's' : ''} in playlist
                          </Text>
                          {isCreatingPlaylist && (
                            <ActivityIndicator size="small" color="#22c55e" />
                          )}
                        </View>
                      </BlurView>
                    </Animated.View>
                  )}
          </View>
          
          {/* Instagram-style Animated Heart */}
          {showLikeAnimation && (
            <Animated.View style={[styles.likeHeart, heartAnimatedStyle]}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E', '#FFB3B3']}
                style={styles.heartGradient}
              >
                <Text style={styles.heartEmoji}>❤️</Text>
              </LinearGradient>
            </Animated.View>
          )}

                  {/* Enhanced Swipe Instructions */}
                  <Animated.View style={[styles.swipeInstructions, controlsAnimatedStyle]}>
                    <BlurView intensity={10} style={styles.swipeInstructionsBlur}>
                      <Text style={styles.swipeText}>Double tap to like • Swipe left to skip • Swipe right to add to playlist</Text>
                    </BlurView>
                  </Animated.View>
                </LinearGradient>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullScreen: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1DB954",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  crossfadeIndicator: {
    backgroundColor: "rgba(29, 185, 84, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  crossfadeText: {
    color: "#1DB954",
    fontSize: 12,
    fontWeight: "600",
  },
  exitHint: {
    color: "#999",
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  albumArtContainer: {
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  albumArt: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
  },
  trackInfo: {
    alignItems: "center",
    width: "100%",
  },
  songTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 34,
  },
  artistName: {
    fontSize: 20,
    color: "#fff",
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 6,
  },
  albumName: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 8,
  },
  releaseDate: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.6,
    textAlign: "center",
  },
  likeHeart: {
    position: "absolute",
    top: 80,
    right: 30,
    zIndex: 20,
  },
  heartGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  heartEmoji: {
    fontSize: 32,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  swipeInstructions: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  swipeInstructionsBlur: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  swipeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
    textAlign: "center",
  },
  // Enhanced styles
  headerBlur: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  albumArtBlur: {
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  albumArtGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  trackInfoBlur: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  playlistStatusCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  playlistStatusBlur: {
    padding: 12,
  },
  playlistStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistStatusText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
    marginLeft: 8,
  },
});
