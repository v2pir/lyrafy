import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, Pressable, ImageBackground, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withDelay,
  interpolate,
  Easing
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuthStore } from "../state/authStore";
import { useMusicStore } from "../state/musicStore";
import { spotifyService } from "../services/spotifyService";
import { SpotifyTrack } from "../types/music";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);
  const slideAnim = useSharedValue(50);
  const headerOpacity = useSharedValue(0);
  const searchOpacity = useSharedValue(0);
  
  const { isAuthenticated } = useAuthStore();
  const { likeTrack, isTrackLiked } = useMusicStore();

  // Entrance animations
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    searchOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: scaleAnim.value },
      { translateY: slideAnim.value }
    ]
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: interpolate(headerOpacity.value, [0, 1], [20, 0]) }]
  }));

  const searchStyle = useAnimatedStyle(() => ({
    opacity: searchOpacity.value,
    transform: [{ translateY: interpolate(searchOpacity.value, [0, 1], [30, 0]) }]
  }));

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
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        style={styles.gradientBackground}
      >
        <Animated.View style={[styles.mainContainer, containerStyle]}>
          {/* Futuristic Header */}
          <Animated.View style={[styles.header, headerStyle]}>
            <BlurView intensity={20} style={styles.headerBlur}>
              <Text style={styles.headerTitle}>Search</Text>
            </BlurView>
          </Animated.View>
          
          {/* Enhanced Search Bar */}
          <Animated.View style={[styles.searchContainer, searchStyle]}>
            <BlurView intensity={15} style={styles.searchBlur}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#8B5CF6" />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Artists, songs, or albums"
                  placeholderTextColor="#9CA3AF"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {isLoading && (
                  <Ionicons name="refresh" size={20} color="#8B5CF6" />
                )}
              </View>
            </BlurView>
          </Animated.View>

          {/* Enhanced Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {searchQuery ? (
              searchResults.length > 0 ? (
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>Search Results</Text>
                  {searchResults.map(renderTrackItem)}
                </View>
              ) : !isLoading ? (
                <View style={styles.emptyState}>
                  <BlurView intensity={10} style={styles.emptyStateBlur}>
                    <Ionicons name="search-outline" size={64} color="#8B5CF6" />
                    <Text style={styles.emptyStateTitle}>No results found</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Try searching with different keywords
                    </Text>
                  </BlurView>
                </View>
              ) : null
            ) : (
              <View style={styles.browseContainer}>
                <Text style={styles.browseTitle}>Browse Categories</Text>
                <View style={styles.emptyState}>
                  <BlurView intensity={10} style={styles.emptyStateBlur}>
                    <Ionicons name="search-outline" size={64} color="#8B5CF6" />
                    <Text style={styles.emptyStateTitle}>Discover new music</Text>
                    <Text style={styles.emptyStateSubtitle}>
                      Search for your favorite artists, songs, and albums
                    </Text>
                  </BlurView>
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradientBackground: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  searchBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  resultsContainer: {
    paddingBottom: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  browseContainer: {
    paddingBottom: 20,
  },
  browseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyStateBlur: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 24,
  },
});