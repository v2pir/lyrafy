// src/screens/VibeModeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, Dimensions, StyleSheet, Pressable, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { PanGestureHandler, TapGestureHandler, PanGestureHandlerGestureEvent, TapGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useMusicStore } from "../state/musicStore";
import { VibeMode, SpotifyTrack } from "../types/music";
import { spotifyService } from "../services/spotifyService";
import { deezerService } from "../services/deezerService";

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
        
        // Get ONLY vibe-based recommendations (no user top tracks mixed in)
        const spotifyTracks = await spotifyService.getRecommendationsForVibeMode(vibeMode, []);
        
        console.log(`🎵 Found ${spotifyTracks.length} Spotify tracks for ${vibeMode?.name}`);
        
        // Show all Spotify tracks immediately (without previews initially)
        setLocalTracks(spotifyTracks);
        setFeedTracks(spotifyTracks);
        setIsLoading(false);
        
        // Now find Deezer previews in background
        console.log("🔍 Finding Deezer previews in background...");
        findDeezerPreviews(spotifyTracks);
        
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
    
    // Animate heart appearing
    heartScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 100 })
    );
    heartOpacity.value = withTiming(1, { duration: 200 });
    heartTranslateY.value = withTiming(-20, { duration: 200 });
    
    // Keep heart visible - don't auto-hide
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

  const doubleTapHandler = useAnimatedGestureHandler<TapGestureHandlerGestureEvent>({
    onEnd: () => {
      console.log("👆 Double tap detected - toggling like");
      runOnJS(handleLike)();
    },
  });

  const swipeHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, { startX: number; startY: number }>({
    onStart: (_, ctx) => {
      try {
        console.log("🔄 Gesture started");
        ctx.startX = translateX.value;
        ctx.startY = translateY.value;
      } catch (error) {
        console.error("❌ Error in gesture onStart:", error);
      }
    },
    onActive: (event, ctx) => {
      try {
        translateX.value = ctx.startX + event.translationX;
        translateY.value = ctx.startY + event.translationY;
        rotation.value = (translateX.value / SCREEN_WIDTH) * 20;
      } catch (error) {
        console.error("❌ Error in gesture onActive:", error);
      }
    },
    onEnd: () => {
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
          // Just set a flag and animate - handle everything in useEffect
          runOnJS(setPendingSwipe)("exit");
          // Animate card down and out
          translateY.value = withTiming(SCREEN_HEIGHT * 1.5, { duration: SWIPE_OUT_DURATION });
          translateX.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(0, { duration: SWIPE_OUT_DURATION });
        } else if (shouldSwipeRight) {
          console.log("🔄 Swiping right - like");
          // Use simpler animation
          translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION });
          translateY.value = withTiming(50, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(30, { duration: SWIPE_OUT_DURATION });
          // Set pending swipe to trigger in useEffect
          runOnJS(setPendingSwipe)("right");
        } else if (shouldSwipeLeft) {
          console.log("🔄 Swiping left - dislike");
          // Use simpler animation
          translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: SWIPE_OUT_DURATION });
          translateY.value = withTiming(50, { duration: SWIPE_OUT_DURATION });
          rotation.value = withTiming(-30, { duration: SWIPE_OUT_DURATION });
          // Set pending swipe to trigger in useEffect
          runOnJS(setPendingSwipe)("left");
        } else {
          console.log("🔄 Returning to center");
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
          rotation.value = withSpring(0);
        }
      } catch (error) {
        console.error("❌ Error in gesture onEnd:", error);
        // Fallback: just reset to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    },
  });

  const handleSwipe = (direction: "left" | "right") => {
    console.log("🔄 handleSwipe called with direction:", direction);
    
    // Reset animation values for next card
    translateX.value = 0;
    translateY.value = 0;
    rotation.value = 0;

    setCurrentIndex(prev => {
      const nextIndex = prev + 1;
      console.log("🔄 Current index:", prev, "Next index:", nextIndex, "Total tracks:", feedTracks.length);
      
      if (nextIndex >= feedTracks.length) {
        // End of deck - could show a message or reset
        console.log("🔄 End of deck reached");
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
    ],
    opacity: heartOpacity.value,
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
    <View style={{ flex: 1, backgroundColor: "#000", paddingTop: 44 }}>
      <StatusBar style="light" />
      
      <TapGestureHandler
        numberOfTaps={2}
        onGestureEvent={doubleTapHandler}
      >
        <Animated.View style={styles.fullScreen}>
          <PanGestureHandler 
            onGestureEvent={swipeHandler}
            onHandlerStateChange={(event) => {
              console.log("🔄 Gesture state change:", event.nativeEvent.state);
            }}
          >
            <Animated.View style={[styles.fullScreen, animatedStyle]}>
          {/* Background Image */}
          <Image
            source={{ uri: track.album.images[0]?.url }}
            style={styles.backgroundImage}
            blurRadius={20}
          />
          
          {/* Dark Overlay */}
          <View style={styles.overlay} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>Lyrafy</Text>
            <View style={styles.headerRight}>
              {isCrossfading && (
                <View style={styles.crossfadeIndicator}>
                  <Text style={styles.crossfadeText}>🎵 Blending...</Text>
                </View>
              )}
              <Text style={styles.exitHint}>Swipe down to exit</Text>
            </View>
          </View>
          
          {/* Main Content */}
          <View style={styles.content}>
            {/* Album Art */}
            <View style={styles.albumArtContainer}>
              <Image
                source={{ uri: track.album.images[0]?.url }}
                style={styles.albumArt}
              />
            </View>
            
            {/* Track Info */}
            <View style={styles.trackInfo}>
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
            </View>
          </View>
          
          {/* Animated Like Heart */}
          {showLikeAnimation && (
            <Animated.View style={[styles.likeHeart, heartAnimatedStyle]}>
              <Text style={styles.heartEmoji}>❤️</Text>
            </Animated.View>
          )}

          {/* Swipe Instructions */}
          <View style={styles.swipeInstructions}>
            <Text style={styles.swipeText}>Double tap to like • Swipe left to skip • Swipe right to like</Text>
          </View>
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </TapGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
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
  heartEmoji: {
    fontSize: 40,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
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
  swipeText: {
    color: "#333",
    fontSize: 10,
    fontWeight: "400",
    opacity: 0.6,
  },
});
