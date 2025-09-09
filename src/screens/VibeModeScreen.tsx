// src/screens/VibeModeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Image, Dimensions, StyleSheet, Pressable, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
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
  const { setFeedTracks } = useMusicStore();

  const [feedTracks, setLocalTracks] = useState<SpotifyTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSwipe, setPendingSwipe] = useState<"left" | "right" | "exit" | null>(null);
  
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


  // Play the current track when index changes
  useEffect(() => {
    playCurrentTrack();
  }, [currentIndex, feedTracks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Component unmounting - cleaning up audio");
      isMountedRef.current = false;
      forceStopAudio();
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

  const playCurrentTrack = async () => {
    const track = feedTracks[currentIndex];
    if (!track?.preview_url) {
      console.log("No preview URL for track:", track?.name);
      return;
    }
    
    try {
      // Stop and clean up previous sound
      if (sound) {
        console.log("🔄 Stopping previous audio");
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        soundRef.current = null;
      }
      
      // Initialize audio mode for iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      console.log("🎵 Playing track:", track.name, "URL:", track.preview_url);
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: true, volume: 1.0 }
      );
      setSound(newSound);
      soundRef.current = newSound;
      
    } catch (err) {
      console.error("❌ Error playing preview:", err);
    }
  };

  const stopAllAudio = async () => {
    if (sound || soundRef.current) {
      try {
        console.log("🔄 Stopping all audio");
        const currentSound = sound || soundRef.current;
        if (currentSound) {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
        }
        setSound(null);
        soundRef.current = null;
      } catch (err) {
        console.error("Error stopping audio:", err);
      }
    }
  };

  const exitVibeMode = async () => {
    console.log("🚪 Exiting vibe mode");
    
    // Stop background processes
    isMountedRef.current = false;
    
    // Stop current audio immediately
    await stopAllAudio();
    
    // Navigate to home page (MainTabs)
    navigation.navigate("MainTabs");
  };

  const swipeHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, ctx: any) => {
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
            navigation.navigate("MainTabs");
          } catch (error) {
            console.error("Error during exit:", error);
            // Force navigation even if cleanup fails
            navigation.navigate("MainTabs");
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

  if (isLoading || !feedTracks.length) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">
          {isLoading ? "Loading tracks with previews..." : "No tracks available"}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      
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
            <Text style={styles.exitHint}>Swipe down to exit</Text>
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
          
          {/* Swipe Instructions */}
          <View style={styles.swipeInstructions}>
            <Text style={styles.swipeText}>Swipe left to skip • Swipe right to like</Text>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
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
  swipeInstructions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  swipeText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "500",
  },
});
