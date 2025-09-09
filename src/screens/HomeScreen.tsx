import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { authService } from "../services/authService";

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { currentVibeMode } = useMusicStore();
  const { isAuthenticated } = useAuthStore();

  const handleVibeMode = () => {
    navigation.navigate("GenrePreferences");
  };

  const handleCreatePlaylist = () => {
    navigation.navigate("VibeSelection");
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
