import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { VibeMode } from "../types/music";
import { useMusicStore } from "../state/musicStore";
import { spotifyService } from "../services/spotifyService";

const VIBE_MODES: VibeMode[] = [
  {
    id: "gym",
    name: "Gym Mode",
    emoji: "🏋️",
    description: "High-energy, high BPM tracks",
    audioFeatures: {
      energy: [0.7, 1.0],
      tempo: [120, 180],
      danceability: [0.6, 1.0],
    },
    gradient: ["#1DB954", "#1ed760"],
  },
  {
    id: "chill",
    name: "Chill Mode",
    emoji: "🌙",
    description: "Lo-fi, slow BPM, relaxing",
    audioFeatures: {
      energy: [0.0, 0.5],
      valence: [0.3, 0.7],
      tempo: [60, 120],
    },
    gradient: ["#4A90E2", "#7BB3F0"],
  },
  {
    id: "breakup",
    name: "Breakup Mode",
    emoji: "💔",
    description: "Sad, emotional tracks",
    audioFeatures: {
      valence: [0.0, 0.4],
      energy: [0.2, 0.6],
    },
    gradient: ["#8E44AD", "#A569BD"],
  },
  {
    id: "study",
    name: "Study Mode",
    emoji: "📚",
    description: "Instrumental, lo-fi focus music",
    audioFeatures: {
      instrumentalness: [0.5, 1.0],
      energy: [0.2, 0.6],
      valence: [0.4, 0.8],
    },
    gradient: ["#F39C12", "#F7DC6F"],
  },
  {
    id: "party",
    name: "Party Mode",
    emoji: "🎉",
    description: "EDM, dance, rap",
    audioFeatures: {
      energy: [0.8, 1.0],
      danceability: [0.7, 1.0],
      valence: [0.6, 1.0],
    },
    gradient: ["#E74C3C", "#F1948A"],
  },
];

export default function VibeModeScreen() {
  const navigation = useNavigation();
  const [customVibe, setCustomVibe] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { setVibeMode, setFeedTracks } = useMusicStore();

  const handleModeSelect = async (modeId: string) => {
    const selectedMode = VIBE_MODES.find(mode => mode.id === modeId);
    if (!selectedMode) return;

    setIsLoading(true);
    try {
      // Set the vibe mode in store
      setVibeMode(selectedMode);
      
      // Load recommendations for this vibe mode
      const userTopTracks = await spotifyService.getUserTopTracks();
      const tracks = await spotifyService.getRecommendationsForVibeMode(selectedMode, userTopTracks);
      
      // Filter tracks with preview URLs
      const tracksWithPreviews = tracks.filter(track => track.preview_url);
      setFeedTracks(tracksWithPreviews);
      
      navigation.goBack();
    } catch (error) {
      console.error("Error loading vibe mode:", error);
      Alert.alert("Error", "Unable to load tracks for this vibe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomVibe = async () => {
    if (!customVibe.trim()) return;

    setIsLoading(true);
    try {
      // For now, use a general recommendation approach for custom vibes
      // In a full implementation, you'd use AI to interpret the custom vibe
      const tracks = await spotifyService.getRecommendations({
        limit: 50,
      });
      
      const tracksWithPreviews = tracks.filter(track => track.preview_url);
      setFeedTracks(tracksWithPreviews);
      
      // Create a custom vibe mode
      const customMode: VibeMode = {
        id: "custom",
        name: "Custom Vibe",
        emoji: "✨",
        description: customVibe,
        audioFeatures: {},
        gradient: ["#1DB954", "#1ed760"],
      };
      
      setVibeMode(customMode);
      navigation.goBack();
    } catch (error) {
      console.error("Error processing custom vibe:", error);
      Alert.alert("Error", "Unable to process your custom vibe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1 px-6">
        <View className="items-center mt-8 mb-8">
          <Text className="text-3xl font-bold text-white mb-2">
            What are you vibin' today?
          </Text>
          <Text className="text-base text-gray-300 text-center">
            Choose your mood to get personalized tracks
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            {VIBE_MODES.map((mode) => (
              <Pressable
                key={mode.id}
                onPress={() => handleModeSelect(mode.id)}
                disabled={isLoading}
                className="overflow-hidden rounded-2xl"
              >
                <LinearGradient
                  colors={mode.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="p-6"
                >
                  <View className="flex-row items-center">
                    <Text className="text-4xl mr-4">{mode.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-black mb-1">
                        {mode.name}
                      </Text>
                      <Text className="text-black opacity-80">
                        {isLoading ? "Loading..." : mode.description}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}

            {/* Custom Mode */}
            <Pressable
              onPress={() => setShowCustom(!showCustom)}
              className="bg-gray-900 p-6 rounded-2xl border-2 border-gray-700"
            >
              <View className="flex-row items-center">
                <Text className="text-4xl mr-4">✨</Text>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white mb-1">
                    Custom Mode
                  </Text>
                  <Text className="text-gray-300">
                    Describe your vibe in words
                  </Text>
                </View>
              </View>
            </Pressable>

            {showCustom && (
              <View className="bg-gray-900 p-6 rounded-2xl">
                <TextInput
                  value={customVibe}
                  onChangeText={setCustomVibe}
                  placeholder="Describe your vibe..."
                  placeholderTextColor="#9CA3AF"
                  className="text-white text-base mb-4 p-4 bg-gray-800 rounded-xl"
                  multiline
                />
                <Pressable
                  onPress={handleCustomVibe}
                  disabled={!customVibe.trim() || isLoading}
                  className={`px-6 py-3 rounded-xl ${
                    customVibe.trim() && !isLoading ? "bg-green-500" : "bg-gray-700"
                  }`}
                >
                  <Text className={`text-center font-semibold ${
                    customVibe.trim() && !isLoading ? "text-black" : "text-gray-400"
                  }`}>
                    {isLoading ? "Loading..." : "Start Vibing"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        <Pressable
          onPress={() => navigation.goBack()}
          className="py-4 mt-4"
        >
          <Text className="text-gray-400 text-center text-base">Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}