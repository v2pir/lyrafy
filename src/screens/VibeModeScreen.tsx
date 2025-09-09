// src/screens/VibeModeScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, Image, Dimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { PanGestureHandler, PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useRoute } from "@react-navigation/native";
import { useMusicStore } from "../state/musicStore";
import { VibeMode, SpotifyTrack } from "../types/music";
import { spotifyService } from "../services/spotifyService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function VibeModeScreen() {
  const route = useRoute();
  const vibeMode = (route.params as { vibeMode: VibeMode })?.vibeMode;
  const { setFeedTracks } = useMusicStore();

  const [feedTracks, setLocalTracks] = useState<SpotifyTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  // Fetch tracks for the given vibeMode
  useEffect(() => {
    (async () => {
      try {
        const userTopTracks = await spotifyService.getUserTopTracks();
        const tracks = await spotifyService.getRecommendationsForVibeMode(vibeMode, userTopTracks);
        setLocalTracks(tracks);
        setFeedTracks(tracks);
      } catch (err) {
        console.error("Failed to load vibe tracks:", err);
      }
    })();
  }, [vibeMode]);

  // Play the current track
  useEffect(() => {
    playCurrentTrack();
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [currentIndex, feedTracks]);

  const playCurrentTrack = async () => {
    const track = feedTracks[currentIndex];
    if (!track?.preview_url) return;
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { shouldPlay: true }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (err) {
      console.error("Error playing preview:", err);
    }
  };

  const swipeHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
      rotation.value = (translateX.value / SCREEN_WIDTH) * 20;
    },
    onEnd: () => {
      if (translateX.value > SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)("right");
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        runOnJS(handleSwipe)("left");
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotation.value = withSpring(0);
      }
    },
  });

  const handleSwipe = (direction: "left" | "right") => {
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    rotation.value = withSpring(0);

    setCurrentIndex(prev => {
      if (prev + 1 >= feedTracks.length) return prev; // end of deck
      return prev + 1;
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  if (!feedTracks.length) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">Loading tracks...</Text>
      </SafeAreaView>
    );
  }

  const track = feedTracks[currentIndex];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <PanGestureHandler onGestureEvent={swipeHandler}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <Image
              source={{ uri: track.album.images[0]?.url }}
              style={styles.albumArt}
            />
            <Text style={styles.title}>{track.name}</Text>
            <Text style={styles.artist}>{track.artists.map(a => a.name).join(", ")}</Text>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 1.1,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  albumArt: {
    width: "85%",
    height: "60%",
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  artist: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
    textAlign: "center",
  },
});
