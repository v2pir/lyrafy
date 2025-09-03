import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { spotifyService } from "../services/spotifyService";
import { SpotifyPlaylist } from "../types/music";

export default function PlaylistsScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { userPlaylists, addPlaylist } = useMusicStore();
  const { isAuthenticated } = useAuthStore();

  const loadPlaylists = async () => {
    if (!isAuthenticated) return;
    
    try {
      const playlists = await spotifyService.getUserPlaylists();
      playlists.forEach(playlist => addPlaylist(playlist));
    } catch (error) {
      console.error("Error loading playlists:", error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPlaylists();
    }
  }, [isAuthenticated]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    setIsLoading(true);
    try {
      const playlist = await spotifyService.createPlaylist(
        newPlaylistName.trim(),
        "Created with VibeSwipe"
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

  const renderPlaylistItem = (playlist: SpotifyPlaylist) => (
    <Pressable
      key={playlist.id}
      className="bg-gray-900 p-4 rounded-xl mb-3 flex-row items-center"
    >
      <View className="w-12 h-12 bg-gray-800 rounded-lg mr-4 items-center justify-center">
        {playlist.images[0]?.url ? (
          <View className="w-full h-full bg-gray-700 rounded-lg" />
        ) : (
          <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
        )}
      </View>
      
      <View className="flex-1">
        <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text className="text-gray-400 text-sm">
          {playlist.tracks.total} tracks
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );

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
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <Text className="text-2xl font-bold text-white">My Playlists</Text>
        <Pressable 
          onPress={() => setShowCreateModal(true)}
          className="w-10 h-10 bg-green-500 rounded-full items-center justify-center"
        >
          <Ionicons name="add" size={24} color="#000000" />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6">
        {userPlaylists.length > 0 ? (
          <View>
            {userPlaylists.map(renderPlaylistItem)}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center mt-32">
            <Ionicons name="musical-notes-outline" size={64} color="#4B5563" />
            <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
              No playlists yet
            </Text>
            <Text className="text-base text-gray-400 text-center">
              Create your first playlist to save your favorite tracks
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-gray-900 rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-white">Create Playlist</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            
            <TextInput
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Playlist name"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-800 text-white p-4 rounded-xl mb-6"
              autoFocus
            />
            
            <Pressable
              onPress={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || isLoading}
              className={`p-4 rounded-xl ${
                newPlaylistName.trim() && !isLoading ? "bg-green-500" : "bg-gray-700"
              }`}
            >
              <Text className={`text-center font-semibold ${
                newPlaylistName.trim() && !isLoading ? "text-black" : "text-gray-400"
              }`}>
                {isLoading ? "Creating..." : "Create Playlist"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}