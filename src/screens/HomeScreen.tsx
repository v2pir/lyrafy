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
import MusicFeedCard from "../components/MusicFeedCard";
import { SpotifyTrack } from "../types/music";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const pagerRef = useRef<PagerView>(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    feedTracks, 
    currentVibeMode, 
    setFeedTracks, 
    likeTrack, 
    userPreferences 
  } = useMusicStore();
  
  const { isAuthenticated } = useAuthStore();

  const handleVibeMode = () => {
    navigation.navigate("VibeMode");
  };

  const loadRecommendations = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      let tracks: SpotifyTrack[] = [];
      
      if (currentVibeMode) {
        // Get recommendations based on vibe mode
        const userTopTracks = await spotifyService.getUserTopTracks();
        tracks = await spotifyService.getRecommendationsForVibeMode(currentVibeMode, userTopTracks);
      } else {
        // Get general recommendations based on user preferences
        const seedGenres = userPreferences.favoriteGenres.slice(0, 5);
        tracks = await spotifyService.getRecommendations({
          seedGenres,
          limit: 50,
        });
      }
      
      // Filter out tracks without preview URLs
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
    if (isAuthenticated && feedTracks.length === 0) {
      loadRecommendations();
    }
  }, [isAuthenticated, currentVibeMode]);

  const handleLike = (track: SpotifyTrack) => {
    likeTrack(track, currentVibeMode?.id);
  };

  const handleSkip = () => {
    if (currentIndex < feedTracks.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      pagerRef.current?.setPage(nextIndex);
    } else {
      // Load more tracks when reaching the end
      loadRecommendations();
    }
  };

  const handleAddToPlaylist = (track: SpotifyTrack) => {
    // TODO: Implement add to playlist modal
    Alert.alert("Add to Playlist", `"${track.name}" will be added to your playlist.`);
  };

  const handlePageSelected = (e: any) => {
    setCurrentIndex(e.nativeEvent.position);
  };

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
            Sign in to start discovering personalized music
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            className="bg-green-500 px-8 py-4 rounded-2xl"
          >
            <Text className="text-black text-lg font-semibold">Get Started</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (feedTracks.length === 0 && !isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          <View className="items-center mb-8">
            <Text className="text-xl text-gray-300 text-center mb-4">
              Ready to discover new music?
            </Text>
            <Text className="text-base text-gray-400 text-center">
              Choose your vibe and start swiping through personalized tracks
            </Text>
          </View>

          <Pressable
            onPress={handleVibeMode}
            className="bg-green-500 px-8 py-4 rounded-2xl flex-row items-center"
          >
            <Ionicons name="musical-notes" size={24} color="#000000" />
            <Text className="text-black text-lg font-semibold ml-3">
              Start Vibing
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center">
          <Ionicons name="musical-notes" size={48} color="#1DB954" />
          <Text className="text-white text-lg mt-4">Loading your vibe...</Text>
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
              onLike={() => handleLike(track)}
              onSkip={handleSkip}
              onAddToPlaylist={() => handleAddToPlaylist(track)}
            />
          </View>
        ))}
      </PagerView>

      {/* Floating vibe mode button */}
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