import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../services/authService";
import { useAuthStore } from "../state/authStore";

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    try {
      const success = await authService.authenticateWithSpotify();
      if (success) {
        navigation.navigate("GenrePreferences");
      } else {
        Alert.alert("Authentication Failed", "Unable to connect to Spotify. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleMusicLogin = async () => {
    setIsLoading(true);
    try {
      const success = await authService.authenticateWithAppleMusic();
      if (success) {
        navigation.navigate("GenrePreferences");
      } else {
        Alert.alert("Authentication Failed", "Unable to connect to Apple Music. Please try again.");
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, skip to preferences
  React.useEffect(() => {
    if (isAuthenticated) {
      navigation.navigate("GenrePreferences");
    }
  }, [isAuthenticated, navigation]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center mb-16">
          <Text className="text-4xl font-bold text-white mb-4">Connect Your Music</Text>
          <Text className="text-base text-gray-300 text-center">
            Choose your preferred music service to get started
          </Text>
        </View>
        
        <View className="w-full max-w-xs space-y-4">
          <Pressable
            onPress={handleSpotifyLogin}
            disabled={isLoading}
            className={`px-6 py-4 rounded-2xl flex-row items-center justify-center ${
              isLoading ? "bg-gray-600" : "bg-green-500"
            }`}
          >
            <Ionicons name="musical-notes" size={24} color="#000000" />
            <Text className="text-black text-lg font-semibold ml-3">
              {isLoading ? "Connecting..." : "Continue with Spotify"}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleAppleMusicLogin}
            disabled={isLoading}
            className={`px-6 py-4 rounded-2xl flex-row items-center justify-center ${
              isLoading ? "bg-gray-600" : "bg-white"
            }`}
          >
            <Ionicons name="logo-apple" size={24} color="#000000" />
            <Text className="text-black text-lg font-semibold ml-3">
              {isLoading ? "Connecting..." : "Continue with Apple Music"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-8"
        >
          <Text className="text-gray-400 text-base">Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}