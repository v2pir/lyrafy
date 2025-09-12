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
import { spotifyService } from "../services/spotifyService";
import { aiMusicService, MusicTasteProfile } from "../services/aiMusicService";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { currentVibeMode, setVibeMode, setFeedTracks } = useMusicStore();
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
      Alert.alert("Authentication Required", "Please connect to Spotify first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      console.log("🤖 Starting AI music taste analysis...");
      
      // Get user's top tracks
      const topTracks = await spotifyService.getUserTopTracks("medium_term");
      if (topTracks.length === 0) {
        Alert.alert("No Data", "We need your top tracks to analyze your taste. Please listen to more music on Spotify first.");
        return;
      }

      console.log(`📊 Analyzing taste from ${topTracks.length} tracks`);

      // Analyze music taste using AI
      const tasteProfile = await aiMusicService.analyzeMusicTaste(topTracks);
      console.log("✅ Taste analysis complete:", tasteProfile);

      // Generate personalized vibe name
      const vibeName = aiMusicService.generateVibeModeName();
      console.log("🎵 Generated vibe name:", vibeName);

      // Get similar tracks using AI analysis (excludes user's top tracks automatically)
      const similarTracks = await aiMusicService.findSimilarTracks(
        topTracks.map(track => track.id), // Exclude user's top track IDs
        200 // Get up to 200 similar tracks
      );

      console.log(`🎯 Found ${similarTracks.length} similar tracks`);

      // Extract just the tracks from SimilarTrack objects
      const newRecommendations = similarTracks.map(similarTrack => similarTrack.track);

      console.log(`✅ Found ${newRecommendations.length} NEW similar songs (excluding ${topTracks.length} top tracks)`);

      // Check if we have enough new recommendations
      if (newRecommendations.length < 10) {
        Alert.alert(
          "Limited New Music",
          `We found ${newRecommendations.length} new tracks that match your taste. This might be because your music taste is very specific or you've already discovered most similar music. Try the regular vibe selection for more variety!`
        );
      }

      // Create a simple vibe mode with the generated name
      const personalizedVibe = {
        id: `ai-vibe-${Date.now()}`,
        name: vibeName,
        emoji: "🎵",
        description: `Personalized music based on your taste`,
        gradient: ["#8B5CF6", "#EC4899"] as [string, string] // Default gradient
      };

      // Set the vibe and tracks
      setVibeMode(personalizedVibe);
      setFeedTracks(newRecommendations);

      // Navigate to vibe mode
      navigation.navigate("VibeMode", { vibeMode: personalizedVibe });

      Alert.alert(
        "Your Personalized Vibe is Ready! 🎵",
        `"${personalizedVibe.name}" - ${personalizedVibe.description}\n\nFound ${newRecommendations.length} NEW tracks that match your taste!\n\n(Excluded ${topTracks.length} of your top tracks)`
      );

    } catch (error) {
      console.error("❌ Error in vibe from taste:", error);
      Alert.alert(
        "Analysis Failed", 
        "Sorry, we couldn't analyze your music taste. Please try again or use the regular vibe selection."
      );
    } finally {
      setIsAnalyzing(false);
    }
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
            Sign in to Spotify to load your personalized tracks
          </Text>
          <Pressable
            onPress={async () => {
              const success = await authService.authenticateWithSpotify();
              if (!success) {
                Alert.alert("Error", "Spotify login failed. Please try again.");
              }
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
          <Text className="text-gray-500 text-center text-sm mt-2">
            AI analyzes your top tracks to find similar NEW music you'll love
          </Text>
        </View>

        {/* Main Action Buttons */}
        <View className="flex-1 justify-center space-y-6">
          {/* Vibe from Taste Button */}
          <Pressable
            onPress={handleVibeFromTaste}
            disabled={isAnalyzing}
            className={`px-8 py-6 rounded-2xl flex-row items-center justify-center ${
              isAnalyzing ? "bg-gray-700" : "bg-gradient-to-r from-purple-500 to-pink-500"
            }`}
            style={{
              backgroundColor: isAnalyzing ? "#374151" : "#8B5CF6",
            }}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="bulb" size={28} color="#FFFFFF" />
            )}
            <Text className="text-white text-xl font-bold ml-4">
              {isAnalyzing ? "Analyzing Your Taste..." : "Vibe from Taste"}
            </Text>
            {!isAnalyzing && (
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" className="ml-2" />
            )}
          </Pressable>

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
