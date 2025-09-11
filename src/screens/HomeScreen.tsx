import React, { useState } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { authService } from "../services/authService";
import { aiMusicServiceBackend } from "../services/aiMusicServiceBackend";
import { spotifyServiceBackend } from "../services/spotifyServiceBackend";
import { backendService } from "../services/backendService";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { currentVibeMode, setFeedTracks } = useMusicStore();
  const { isAuthenticated } = useAuthStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleVibeMode = () => {
    navigation.navigate("GenrePreferences");
  };

  const handleCreatePlaylist = () => {
    navigation.navigate("VibeSelection");
  };

  const handleVibeFromTaste = async () => {
    if (!isAuthenticated) {
      Alert.alert("Authentication Required", "Please sign in to analyze your music taste.");
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log("🤖 Starting ML-powered music taste analysis...");
      
      // Check if backend is available
      const isBackendHealthy = await backendService.healthCheck();
      if (!isBackendHealthy) {
        console.log("⚠️ Backend not available, falling back to local AI service");
        await handleVibeFromTasteFallback();
        return;
      }
      
      // Get user's top tracks - try different time ranges
      let topTracks: any[] = [];
      const timeRanges = ["short_term", "medium_term", "long_term"] as const;
      
      for (const timeRange of timeRanges) {
        try {
          console.log(`🎯 Trying to fetch top tracks for ${timeRange}...`);
          const tracks = await spotifyServiceBackend.getUserTopTracks(timeRange);
          if (tracks.length >= 10) {
            topTracks = tracks;
            console.log(`📊 Retrieved ${tracks.length} top tracks from ${timeRange}`);
            break;
          }
        } catch (error) {
          console.warn(`Failed to fetch tracks for ${timeRange}:`, error);
          continue;
        }
      }
      
      if (topTracks.length < 10) {
        Alert.alert(
          "Not Enough Data", 
          "We need at least 10 tracks to analyze your taste. Keep listening to more music and try again later!"
        );
        return;
      }

      // Analyze music taste using backend
      const userId = "user_123"; // TODO: Get actual user ID from auth store
      const tasteProfile = await backendService.analyzeTaste(userId, topTracks);
      console.log("🎵 Backend taste profile created:", tasteProfile);

      // Get backend-powered recommendations
      const recommendations = await backendService.getRecommendations(
        userId,
        "ai-taste",
        100,
        []
      );
      console.log("🔍 Found", recommendations.recommendations.length, "Backend-powered recommendations");

      if (recommendations.recommendations.length === 0) {
        Alert.alert(
          "No Similar Tracks Found", 
          "We couldn't find similar tracks based on your taste. Try again later!"
        );
        return;
      }

      // Generate vibe mode name with confidence
      const vibeName = `AI Taste (${Math.round(tasteProfile.confidence * 100)}% match)`;
      console.log("🎯 Generated vibe name:", vibeName);

      // Set up the ML-powered vibe mode
      const aiVibeMode = {
        id: "ai-taste",
        name: vibeName,
        description: `ML-powered recommendations based on your music taste`,
        emoji: "🤖",
        color: "#1DB954"
      };

      // Set tracks and navigate to vibe mode
      setFeedTracks(recommendations.recommendations);
      navigation.navigate("VibeMode" as never, { vibeMode: aiVibeMode } as never);

    } catch (error) {
      console.error("Error in ML taste analysis:", error);
      // Fallback to local AI service
      await handleVibeFromTasteFallback();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVibeFromTasteFallback = async () => {
    try {
      console.log("🔄 Falling back to local AI service...");
      
      // Get user's top tracks
      let topTracks: any[] = [];
      const timeRanges = ["short_term", "medium_term", "long_term"] as const;
      
      for (const timeRange of timeRanges) {
        try {
          const tracks = await spotifyService.getUserTopTracks(timeRange);
          if (tracks.length >= 10) {
            topTracks = tracks;
            break;
          }
        } catch (error) {
          console.log(`Failed to fetch tracks for ${timeRange}:`, error);
        }
      }
      
      if (topTracks.length < 10) {
        Alert.alert(
          "Not Enough Data", 
          "We need at least 10 tracks to analyze your taste. Keep listening to more music and try again later!"
        );
        return;
      }

      // Use local AI service
      const tasteProfile = await aiMusicServiceBackend.analyzeMusicTaste(topTracks);
      const similarTracks = await aiMusicServiceBackend.findSimilarTracks(
        topTracks.map(t => t.id), 
        100
      );
      
      if (similarTracks.length === 0) {
        Alert.alert(
          "No Similar Tracks Found", 
          "We couldn't find similar tracks based on your taste. Try again later!"
        );
        return;
      }

      const vibeName = aiMusicServiceBackend.generateVibeModeName();
      const aiVibeMode = {
        id: "ai-taste",
        name: vibeName,
        description: `AI-generated vibe based on your music taste`,
        emoji: "🤖",
        color: "#1DB954"
      };

      setFeedTracks(similarTracks.map(st => st.track));
      navigation.navigate("VibeMode" as never, { vibeMode: aiVibeMode } as never);
      
    } catch (error) {
      console.error("❌ Error in fallback AI analysis:", error);
      Alert.alert(
        "Analysis Failed", 
        "We couldn't analyze your music taste right now. Please try again later."
      );
    }
  };

  // No need to load tracks on home screen anymore

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

  // No loading state needed anymore

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1 px-6 py-8">
        {/* Header */}
        <View className="items-center mb-12">
          <Ionicons name="musical-notes" size={64} color="#1DB954" />
          <Text className="text-4xl font-bold text-white text-center mt-4 mb-2">
            Lyrafy
          </Text>
          <Text className="text-gray-400 text-center text-lg">
            Discover your perfect music vibe
          </Text>
        </View>

        {/* Main Action Buttons */}
        <View className="flex-1 justify-center space-y-6">
          {/* Choose Vibe Button */}
          <Pressable
            onPress={handleVibeMode}
            className="bg-green-500 px-8 py-6 rounded-2xl flex-row items-center justify-center"
          >
            <Ionicons name="musical-notes" size={28} color="#000000" />
            <Text className="text-black text-xl font-bold ml-4">
              Choose Your Vibe
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#000000" className="ml-2" />
          </Pressable>

          {/* AI Vibe from Taste Button */}
          <Pressable
            onPress={handleVibeFromTaste}
            disabled={isAnalyzing}
            className={`px-8 py-6 rounded-2xl flex-row items-center justify-center border-2 ${
              isAnalyzing 
                ? "bg-gray-700 border-gray-600" 
                : "bg-gradient-to-r from-purple-600 to-pink-600 border-purple-500"
            }`}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            )}
            <Text className="text-white text-xl font-bold ml-4">
              {isAnalyzing ? "Analyzing Your Taste..." : "Vibe from Taste"}
            </Text>
            {!isAnalyzing && (
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" className="ml-2" />
            )}
          </Pressable>

          {/* Create Playlist Button */}
          <Pressable
            onPress={handleCreatePlaylist}
            className="bg-gray-800 px-8 py-6 rounded-2xl flex-row items-center justify-center border border-gray-600"
          >
            <Ionicons name="add-circle" size={28} color="#FFFFFF" />
            <Text className="text-white text-xl font-bold ml-4">
              Create Playlist
            </Text>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" className="ml-2" />
          </Pressable>

          {/* Quick Actions */}
          <View className="mt-8">
            <Text className="text-gray-400 text-center mb-4">Quick Actions</Text>
            <View className="flex-row justify-center space-x-4">
              <Pressable className="bg-gray-800 px-6 py-4 rounded-xl items-center">
                <Ionicons name="heart" size={24} color="#FFFFFF" />
                <Text className="text-white text-sm mt-2">Liked Songs</Text>
              </Pressable>
              <Pressable className="bg-gray-800 px-6 py-4 rounded-xl items-center">
                <Ionicons name="time" size={24} color="#FFFFFF" />
                <Text className="text-white text-sm mt-2">Recently Played</Text>
              </Pressable>
              <Pressable className="bg-gray-800 px-6 py-4 rounded-xl items-center">
                <Ionicons name="trending-up" size={24} color="#FFFFFF" />
                <Text className="text-white text-sm mt-2">Trending</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Current Vibe Display */}
        {currentVibeMode && (
          <View className="bg-gray-900 px-4 py-3 rounded-xl mb-4">
            <Text className="text-gray-400 text-center text-sm mb-1">Current Vibe</Text>
            <Text className="text-white text-center text-lg font-semibold">
              {currentVibeMode.emoji} {currentVibeMode.name}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
