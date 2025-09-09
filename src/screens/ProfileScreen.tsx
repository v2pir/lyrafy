import React from "react";
import { View, Text, Pressable, ScrollView, Alert, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useMusicStore } from "../state/musicStore";
import { authService } from "../services/authService";
import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, connectedServices } = useAuthStore();
  const { likedTracks } = useMusicStore();

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await authService.logout();
            navigation.navigate("Welcome" as never);
          },
        },
      ]
    );
  };

  const handleLikedSongs = () => {
    Alert.alert("Liked Songs", `You have ${likedTracks.length} liked songs.`);
  };

  const handleSettings = () => {
    Alert.alert("Settings", "Settings screen coming soon!");
  };

  const handleConnectedAccounts = () => {
    const services = connectedServices.join(", ");
    Alert.alert("Connected Accounts", `Connected services: ${services || "None"}`);
  };

  const handleHelp = () => {
    Alert.alert("Help & Support", "For support, please contact us at support@lyrafy.com");
  };

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="person-outline" size={64} color="#4B5563" />
          <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
            Not signed in
          </Text>
          <Text className="text-base text-gray-400 text-center mb-8">
            Connect your music service to view your profile
          </Text>
          <Pressable
            onPress={() => navigation.navigate("Login" as never)}
            className="bg-green-500 px-8 py-4 rounded-2xl"
          >
            <Text className="text-black text-lg font-semibold">Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const profileImage = user.images?.[0]?.url;

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="items-center px-6 py-8">
        <View className="w-24 h-24 bg-gray-800 rounded-full items-center justify-center mb-4 overflow-hidden">
          {profileImage ? (
            <ImageBackground
              source={{ uri: profileImage }}
              style={{ flex: 1, width: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="person" size={40} color="#FFFFFF" />
          )}
        </View>
        <Text className="text-2xl font-bold text-white mb-1">
          {user.display_name || "Music Lover"}
        </Text>
        <Text className="text-base text-gray-400">
          {connectedServices.includes("spotify") ? "Connected via Spotify" : "Connected"}
        </Text>
        {user.followers && (
          <Text className="text-sm text-gray-500 mt-1">
            {user.followers.total} followers
          </Text>
        )}
      </View>

      {/* Stats */}
      <View className="flex-row justify-around px-6 py-4 mb-6">
        <View className="items-center">
          <Text className="text-2xl font-bold text-white">{likedTracks.length}</Text>
          <Text className="text-gray-400 text-sm">Liked Songs</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-white">{connectedServices.length}</Text>
          <Text className="text-gray-400 text-sm">Connected</Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-white">
            {user.product === "premium" ? "Premium" : "Free"}
          </Text>
          <Text className="text-gray-400 text-sm">Account</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6">
        <View className="space-y-4">
          <Pressable 
            onPress={handleLikedSongs}
            className="flex-row items-center justify-between bg-gray-900 p-4 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="heart" size={24} color="#1DB954" />
              <Text className="text-white text-base ml-3">Liked Songs</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-sm mr-2">{likedTracks.length}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          <Pressable 
            onPress={handleSettings}
            className="flex-row items-center justify-between bg-gray-900 p-4 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="settings" size={24} color="#FFFFFF" />
              <Text className="text-white text-base ml-3">Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          <Pressable 
            onPress={handleConnectedAccounts}
            className="flex-row items-center justify-between bg-gray-900 p-4 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="link" size={24} color="#FFFFFF" />
              <Text className="text-white text-base ml-3">Connected Accounts</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-400 text-sm mr-2">{connectedServices.length}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Pressable>

          <Pressable 
            onPress={handleHelp}
            className="flex-row items-center justify-between bg-gray-900 p-4 rounded-xl"
          >
            <View className="flex-row items-center">
              <Ionicons name="help-circle" size={24} color="#FFFFFF" />
              <Text className="text-white text-base ml-3">Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        </View>

        <View className="mt-8 pt-8 border-t border-gray-800">
          <Pressable 
            onPress={handleSignOut}
            className="bg-red-600 p-4 rounded-xl"
          >
            <Text className="text-white text-center font-semibold">Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}