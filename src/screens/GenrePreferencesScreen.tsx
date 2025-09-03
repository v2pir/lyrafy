import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { useMusicStore } from "../state/musicStore";

type GenrePreferencesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "GenrePreferences">;

const GENRES = [
  { id: "pop", name: "Pop", emoji: "🎵" },
  { id: "rock", name: "Rock", emoji: "🎸" },
  { id: "hip-hop", name: "Hip Hop", emoji: "🎤" },
  { id: "electronic", name: "Electronic", emoji: "🎧" },
  { id: "jazz", name: "Jazz", emoji: "🎺" },
  { id: "classical", name: "Classical", emoji: "🎼" },
  { id: "country", name: "Country", emoji: "🤠" },
  { id: "r&b", name: "R&B", emoji: "💫" },
  { id: "indie", name: "Indie", emoji: "🌟" },
  { id: "latin", name: "Latin", emoji: "💃" },
  { id: "reggae", name: "Reggae", emoji: "🌴" },
  { id: "folk", name: "Folk", emoji: "🪕" },
];

export default function GenrePreferencesScreen() {
  const navigation = useNavigation<GenrePreferencesScreenNavigationProp>();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const { userPreferences, setUserPreferences } = useMusicStore();

  const toggleGenre = (genreId: string) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : prev.length < 5 ? [...prev, genreId] : prev
    );
  };

  const handleContinue = () => {
    // Save preferences to store
    setUserPreferences({
      ...userPreferences,
      favoriteGenres: selectedGenres,
    });
    navigation.navigate("MainTabs");
  };

  const handleSkip = () => {
    navigation.navigate("MainTabs");
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 px-6">
        <View className="items-center mt-8 mb-8">
          <Text className="text-3xl font-bold text-white mb-2">Pick your vibes</Text>
          <Text className="text-base text-gray-300 text-center">
            Choose up to 5 genres you love {selectedGenres.length}/5
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap justify-between">
            {GENRES.map((genre) => (
              <Pressable
                key={genre.id}
                onPress={() => toggleGenre(genre.id)}
                className={`w-[48%] p-4 rounded-2xl mb-4 border-2 ${
                  selectedGenres.includes(genre.id)
                    ? "bg-green-500 border-green-500"
                    : "bg-gray-900 border-gray-700"
                }`}
              >
                <Text className="text-3xl text-center mb-2">{genre.emoji}</Text>
                <Text className={`text-center font-medium ${
                  selectedGenres.includes(genre.id) ? "text-black" : "text-white"
                }`}>
                  {genre.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View className="pb-8 pt-4">
          <Pressable
            onPress={handleContinue}
            disabled={selectedGenres.length === 0}
            className={`px-6 py-4 rounded-2xl mb-4 ${
              selectedGenres.length > 0 ? "bg-green-500" : "bg-gray-700"
            }`}
          >
            <Text className={`text-center text-lg font-semibold ${
              selectedGenres.length > 0 ? "text-black" : "text-gray-400"
            }`}>
              Continue
            </Text>
          </Pressable>

          <Pressable onPress={handleSkip}>
            <Text className="text-gray-400 text-center text-base">Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}