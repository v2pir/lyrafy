import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, Dimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import PagerView from "react-native-pager-view";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { spotifyService } from "../services/spotifyService";
import { authService } from "../services/authService";
import MusicFeedCard from "../components/MusicFeedCard";
import { SpotifyTrack } from "../types/music";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const pagerRef = useRef<PagerView>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const { feedTracks, currentVibeMode, setFeedTracks, likeTrack, userPreferences } = useMusicStore();
  const { isAuthenticated } = useAuthStore();

  const handleVibeMode = () => navigation.navigate("VibeMode");

  const loadRecommendations = async () => {
    const token = await spotifyService.getAccessToken();
    if (!token) {
      console.warn("⚠️ No access token yet, forcing re-auth...");
      const success = await authService.authenticateWithSpotify();
      if (!success) return;
    }

    setIsLoading(true);
    try {
      let tracks: SpotifyTrack[] = [];

      if (currentVibeMode?.name) {
        console.log("🎛️ Loading recommendations for vibe mode:", currentVibeMode.name);
        tracks = await spotifyService.getRecommendationsForVibeMode(
          currentVibeMode,
          await spotifyService.getUserTopTracks()
        );
      } else if (userPreferences.favoriteGenres.length > 0) {
        console.log("🎛️ Loading recommendations based on favorite genres:", userPreferences.favoriteGenres);
        const query = userPreferences.favoriteGenres.join(" ");
        tracks = await spotifyService.getRecommendations({ query, limit: 50 });
      } else {
        console.log("⚠️ No vibe mode or genres — using top 50 tracks");
        tracks = (await spotifyService.getUserTopTracks()).slice(0, 50);
      }

      const tracksWithPreviews = tracks.filter(track => track.preview_url);
      setFeedTracks(tracksWithPreviews);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      Alert.alert("Error", "Unable to load music recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!isAuthenticated) return;
      const token = await spotifyService.getAccessToken();
      if (!token) return;
      if (feedTracks.length === 0) await loadRecommendations();
    };
    init();
  }, [isAuthenticated, currentVibeMode]);

  const handleAddToPlaylist = (track: SpotifyTrack) => {
    Alert.alert("Add to Playlist", `"${track.name}" will be added to your playlist.`);
  };

  const handlePageSelected = (e: any) => setCurrentIndex(e.nativeEvent.position);

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="musical-notes-outline" size={64} color="#4B5563" />
          <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
            Connect your music service
          </Text>
          <Text className="text-base text-gray-400 text-center mb-8">
            Sign in to Spotify to load your personalized tracks
          </Text>
          <Pressable
            onPress={async () => {
              const success = await authService.authenticateWithSpotify();
              if (success) await loadRecommendations();
              else Alert.alert("Error", "Spotify login failed. Please try again.");
            }}
            className="bg-green-500 px-8 py-4 rounded-2xl"
          >
            <Text className="text-black text-lg font-semibold">Connect Spotify</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if ((feedTracks.length === 0 && !isLoading) || isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          {isLoading ? (
            <>
              <Ionicons name="musical-notes" size={48} color="#1DB954" />
              <Text className="text-white text-lg mt-4">Loading your vibe...</Text>
            </>
          ) : (
            <>
              <Text className="text-xl text-gray-300 text-center mb-4">
                Ready to discover new music?
              </Text>
              <Text className="text-base text-gray-400 text-center mb-8">
                Choose your vibe and start swiping through personalized tracks
              </Text>
              <Pressable
                onPress={handleVibeMode}
                className="bg-green-500 px-8 py-4 rounded-2xl flex-row items-center"
              >
                <Ionicons name="musical-notes" size={24} color="#000000" />
                <Text className="text-black text-lg font-semibold ml-3">Start Vibing</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        orientation="vertical"
        onPageSelected={handlePageSelected}
        initialPage={0}
      >
        {feedTracks.map((track, index) => (
          <View key={track.id} style={{ height: SCREEN_HEIGHT }}>
            <MusicFeedCard
              track={track}
              isActive={index === currentIndex}
              onLike={() => likeTrack(track)}
              onSkip={() => {}}
              onAddToPlaylist={() => handleAddToPlaylist(track)}
            />
          </View>
        ))}
      </PagerView>

      <Pressable
        onPress={handleVibeMode}
        className="absolute top-16 right-6 w-12 h-12 bg-green-500 rounded-full items-center justify-center"
        style={{ zIndex: 10 }}
      >
        <Ionicons name="options" size={24} color="#000000" />
      </Pressable>
    </View>
  );
}
