import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../state/authStore";
import { useMusicStore } from "../state/musicStore";
import { spotifyService } from "../services/spotifyService";
import { SpotifyTrack } from "../types/music";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { isAuthenticated } = useAuthStore();
  const { likeTrack, isTrackLiked } = useMusicStore();

  const performSearch = async (query: string) => {
    if (!query.trim() || !isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const tracks = await spotifyService.searchTracks(query.trim(), 20);
      setSearchResults(tracks);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleLikeTrack = (track: SpotifyTrack) => {
    likeTrack(track);
  };

  const renderTrackItem = (track: SpotifyTrack) => {
    const albumArt = track.album.images[0]?.url;
    const liked = isTrackLiked(track.id);

    return (
      <Pressable
        key={track.id}
        className="bg-gray-900 p-4 rounded-xl mb-3 flex-row items-center"
      >
        <View className="w-12 h-12 bg-gray-800 rounded-lg mr-4 overflow-hidden">
          {albumArt ? (
            <ImageBackground
              source={{ uri: albumArt }}
              style={{ flex: 1 }}
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <View className="flex-1">
          <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
            {track.name}
          </Text>
          <Text className="text-gray-400 text-sm" numberOfLines={1}>
            {track.artists.map(artist => artist.name).join(", ")}
          </Text>
        </View>
        
        <Pressable
          onPress={() => handleLikeTrack(track)}
          className="ml-4 p-2"
        >
          <Ionicons 
            name={liked ? "heart" : "heart-outline"} 
            size={20} 
            color={liked ? "#1DB954" : "#9CA3AF"} 
          />
        </Pressable>
      </Pressable>
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="search-outline" size={64} color="#4B5563" />
          <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
            Connect your music service
          </Text>
          <Text className="text-base text-gray-400 text-center">
            Sign in to search for your favorite music
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="px-6 py-4">
        <Text className="text-2xl font-bold text-white mb-4">Search</Text>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-900 rounded-xl px-4 py-3">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Artists, songs, or albums"
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-white text-base ml-3"
            returnKeyType="search"
          />
          {isLoading && (
            <Ionicons name="refresh" size={20} color="#1DB954" />
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6">
        {searchQuery ? (
          searchResults.length > 0 ? (
            <View>
              <Text className="text-lg font-semibold text-white mb-4">
                Search Results
              </Text>
              {searchResults.map(renderTrackItem)}
            </View>
          ) : !isLoading ? (
            <View className="flex-1 justify-center items-center mt-16">
              <Ionicons name="search-outline" size={64} color="#4B5563" />
              <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
                No results found
              </Text>
              <Text className="text-base text-gray-400 text-center">
                Try searching with different keywords
              </Text>
            </View>
          ) : null
        ) : (
          <View>
            <Text className="text-lg font-semibold text-white mb-4">
              Browse Categories
            </Text>
            <View className="flex-1 justify-center items-center mt-16">
              <Ionicons name="search-outline" size={64} color="#4B5563" />
              <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
                Discover new music
              </Text>
              <Text className="text-base text-gray-400 text-center">
                Search for your favorite artists, songs, and albums
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}