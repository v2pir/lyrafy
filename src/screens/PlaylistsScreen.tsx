import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal, StyleSheet, Dimensions } from "react-native";
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
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { spotifyService } from "../services/spotifyService";
import { SpotifyPlaylist } from "../types/music";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type PlaylistsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlaylistsScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);
  const slideAnim = useSharedValue(50);
  const headerOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0);
  const modalOpacity = useSharedValue(0);
  
  const navigation = useNavigation<PlaylistsScreenNavigationProp>();
  const { userPlaylists, addPlaylist } = useMusicStore();
  const { isAuthenticated } = useAuthStore();

  const loadPlaylists = async () => {
    if (!isAuthenticated) return;
    
    try {
      const playlists = await spotifyService.getUserPlaylists();
      if (playlists && Array.isArray(playlists)) {
        playlists.forEach(playlist => {
          if (playlist) {
            addPlaylist(playlist);
          }
        });
      }
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated]);

  // Entrance animations
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
    headerOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
  }, []);

  // Modal animations
  useEffect(() => {
    if (showCreateModal) {
      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      modalOpacity.value = withTiming(1, { duration: 300 });
    } else {
      modalScale.value = withSpring(0, { damping: 15, stiffness: 150 });
      modalOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [showCreateModal]);

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

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }]
  }));

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    setIsLoading(true);
    try {
      const playlist = await spotifyService.createPlaylist(
        newPlaylistName.trim(),
        "Created with Lyrafy"
      );
      
      addPlaylist(playlist);
      setNewPlaylistName("");
      setShowCreateModal(false);
      
      Alert.alert("Success", `Playlist "${playlist.name}" created successfully!`);
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Unable to create playlist. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaylistPress = (playlist: SpotifyPlaylist) => {
    if (!playlist) {
      console.error("Playlist is null or undefined");
      return;
    }
    
    console.log("Opening playlist:", playlist.name);
    navigation.navigate("PlaylistDetail", { playlist });
  };

  const renderPlaylistItem = (playlist: SpotifyPlaylist) => {
    if (!playlist) {
      console.error("Playlist is null or undefined in renderPlaylistItem");
      return null;
    }
    
    return (
      <Pressable
        key={playlist.id}
        onPress={() => handlePlaylistPress(playlist)}
        className="bg-gray-900 p-4 rounded-xl mb-3 flex-row items-center"
      >
        <View className="w-12 h-12 bg-gray-800 rounded-lg mr-4 items-center justify-center">
          {playlist.images?.[0]?.url ? (
            <View className="w-full h-full bg-gray-700 rounded-lg" />
          ) : (
            <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
          )}
        </View>
        
        <View className="flex-1">
          <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
            {playlist.name || "Untitled Playlist"}
          </Text>
          <Text className="text-gray-400 text-sm">
            {playlist.tracks?.total || 0} tracks
          </Text>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </Pressable>
    );
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
          <Text className="text-base text-gray-400 text-center">
            Sign in to view and manage your playlists
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
              <Text style={styles.headerTitle}>My Playlists</Text>
              <Pressable 
                onPress={() => setShowCreateModal(true)}
                style={styles.createButton}
              >
                <LinearGradient
                  colors={['#1DB954', '#1ed760']}
                  style={styles.createButtonGradient}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </BlurView>
          </Animated.View>

          {/* Enhanced Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {userPlaylists.length > 0 ? (
              <View style={styles.playlistsContainer}>
                {userPlaylists.map(renderPlaylistItem)}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <BlurView intensity={10} style={styles.emptyStateBlur}>
                  <Ionicons name="musical-notes-outline" size={64} color="#8B5CF6" />
                  <Text style={styles.emptyStateTitle}>No playlists yet</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Create your first playlist to save your favorite tracks
                  </Text>
                </BlurView>
              </View>
            )}
          </ScrollView>

          {/* Enhanced Create Playlist Modal */}
          <Modal
            visible={showCreateModal}
            transparent
            animationType="none"
            onRequestClose={() => setShowCreateModal(false)}
          >
            <Animated.View style={[styles.modalOverlay, modalStyle]}>
              <Animated.View style={[styles.modalContent, modalStyle]}>
                <BlurView intensity={20} style={styles.modalBlur}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create Playlist</Text>
                    <Pressable onPress={() => setShowCreateModal(false)}>
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <TextInput
                      value={newPlaylistName}
                      onChangeText={setNewPlaylistName}
                      placeholder="Playlist name"
                      placeholderTextColor="#9CA3AF"
                      style={styles.textInput}
                      autoFocus
                    />
                  </View>
                  
                  <Pressable
                    onPress={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim() || isLoading}
                    style={styles.createPlaylistButton}
                  >
                    <LinearGradient
                      colors={!newPlaylistName.trim() || isLoading 
                        ? ['#374151', '#4B5563'] 
                        : ['#1DB954', '#1ed760']
                      }
                      style={styles.createPlaylistGradient}
                    >
                      <Text style={styles.createPlaylistText}>
                        {isLoading ? "Creating..." : "Create Playlist"}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </BlurView>
              </Animated.View>
            </Animated.View>
          </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  createButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  playlistsContainer: {
    paddingBottom: 20,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputContainer: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  createPlaylistButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createPlaylistGradient: {
    padding: 16,
    alignItems: 'center',
  },
  createPlaylistText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});