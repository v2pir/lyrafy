import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { spotifyService } from "../services/spotifyService";
import { deezerService } from "../services/deezerService";
import { SpotifyTrack, SpotifyPlaylist } from "../types/music";
import { Audio } from "expo-av";
import { removeDuplicateTracksByName } from "../utils/deduplication";

export default function PlaylistDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const playlist = (route.params as { playlist: SpotifyPlaylist })?.playlist;
  
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    if (playlist) {
      loadPlaylistTracks();
    }
  }, [playlist]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [sound]);

  const loadPlaylistTracks = async () => {
    if (!playlist?.id) return;
    
    setIsLoading(true);
    try {
      console.log("Loading tracks for playlist:", playlist.name);
      const playlistTracks = await spotifyService.getPlaylistTracks(playlist.id);
      console.log(`Found ${playlistTracks.length} tracks in playlist`);
      
      // Find Deezer previews for tracks that don't have Spotify previews
      const tracksWithPreviews = await Promise.all(
        playlistTracks.map(async (track) => {
          if (track.preview_url) {
            return track; // Already has preview
          }
          
          try {
            // Search for this track on Deezer
            const deezerTracks = await deezerService.searchTracks(
              `${track.name} ${track.artists[0]?.name}`, 
              1
            );
            
            const bestMatch = deezerTracks.find(deezerTrack => 
              deezerTrack.title.toLowerCase().includes(track.name.toLowerCase()) ||
              track.name.toLowerCase().includes(deezerTrack.title.toLowerCase())
            );
            
            if (bestMatch && bestMatch.preview) {
              console.log(`✅ Found Deezer preview for ${track.name}:`, bestMatch.preview);
              return {
                ...track,
                preview_url: bestMatch.preview
              };
            } else {
              console.log(`❌ No Deezer preview found for ${track.name}`);
            }
          } catch (err) {
            console.warn(`Failed to find preview for ${track.name}:`, err);
          }
          
          return track; // Return original track even without preview
        })
      );
      
      // Remove duplicate tracks by name
      const uniqueTracks = removeDuplicateTracksByName(tracksWithPreviews);
      
      setTracks(uniqueTracks);
    } catch (error) {
      console.error("Error loading playlist tracks:", error);
      Alert.alert("Error", "Failed to load playlist tracks");
    } finally {
      setIsLoading(false);
    }
  };

  const testAudioUrl = async (url: string) => {
    try {
      console.log("🧪 Testing audio URL:", url);
      const response = await fetch(url, { method: 'HEAD' });
      console.log("🧪 URL test response:", response.status, response.headers.get('content-type'));
      return response.ok;
    } catch (error) {
      console.error("🧪 URL test failed:", error);
      return false;
    }
  };

  const playTrackPreview = async (track: SpotifyTrack) => {
    if (!track.preview_url) {
      Alert.alert("No Preview", "This track doesn't have a preview available");
      return;
    }

    try {
      console.log("🎵 Attempting to play track:", track.name);
      console.log("🎵 Preview URL:", track.preview_url);

      // Test if the URL is accessible
      const urlAccessible = await testAudioUrl(track.preview_url);
      if (!urlAccessible) {
        Alert.alert("Audio Error", "The preview URL is not accessible");
        return;
      }

      // Initialize audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Stop current track if playing
      if (sound) {
        console.log("🔄 Stopping current track");
        await sound.unloadAsync();
        setSound(null);
      }

      console.log("🎵 Loading new track...");
      // Load and play new track
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.preview_url },
        { 
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        }
      );

      console.log("✅ Track loaded successfully");
      setSound(newSound);
      setCurrentPlayingTrack(track.id);

      // Set up status update callback to monitor playback
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          console.log("🎵 Playback status:", {
            isPlaying: status.isPlaying,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis,
          });
        }
      });

      // Auto-stop after 30 seconds (typical preview length)
      setTimeout(async () => {
        if (newSound) {
          console.log("⏰ Auto-stopping track after 30 seconds");
          await newSound.unloadAsync();
          setSound(null);
          setCurrentPlayingTrack(null);
        }
      }, 30000);

    } catch (error) {
      console.error("❌ Error playing track preview:", error);
      Alert.alert("Error", `Failed to play track preview: ${error.message}`);
    }
  };

  const stopPreview = async () => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
      setCurrentPlayingTrack(null);
    }
  };

  const renderTrackItem = (track: SpotifyTrack, index: number) => (
    <Pressable
      key={track.id}
      onPress={() => playTrackPreview(track)}
      className="bg-gray-900 p-4 rounded-xl mb-2 flex-row items-center"
    >
      <View className="w-12 h-12 bg-gray-800 rounded-lg mr-4 items-center justify-center">
        {track.album.images[0]?.url ? (
          <Image
            source={{ uri: track.album.images[0].url }}
            className="w-full h-full rounded-lg"
          />
        ) : (
          <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
        )}
      </View>
      
      <View className="flex-1">
        <Text className="text-white text-base font-semibold mb-1" numberOfLines={1}>
          {track.name}
        </Text>
        <Text className="text-gray-400 text-sm" numberOfLines={1}>
          {track.artists.map(a => a.name).join(", ")}
        </Text>
      </View>
      
      <View className="flex-row items-center">
        {currentPlayingTrack === track.id ? (
          <Pressable onPress={stopPreview} className="mr-2">
            <Ionicons name="stop" size={20} color="#1DB954" />
          </Pressable>
        ) : (
          <Pressable onPress={() => playTrackPreview(track)}>
            <Ionicons 
              name="play" 
              size={20} 
              color={track.preview_url ? "#1DB954" : "#666"} 
            />
          </Pressable>
        )}
        {track.preview_url ? (
          <Ionicons name="volume-high" size={16} color="#1DB954" className="ml-2" />
        ) : (
          <Ionicons name="volume-mute" size={16} color="#666" className="ml-2" />
        )}
      </View>
    </Pressable>
  );

  if (!playlist) {
    return (
      <SafeAreaView className="flex-1 bg-black">
        <StatusBar style="light" />
        <View className="flex-1 justify-center items-center px-6">
          <Text className="text-white text-lg">Playlist not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center px-6 py-4">
        <Pressable onPress={() => navigation.goBack()} className="mr-4">
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold" numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text className="text-gray-400 text-sm">
            {playlist.tracks?.total || 0} tracks
          </Text>
        </View>
      </View>

      {/* Playlist Info */}
      <View className="px-6 mb-6">
        <View className="bg-gray-900 p-4 rounded-xl">
          <Text className="text-gray-400 text-sm mb-2">Playlist Description</Text>
          <Text className="text-white text-base">
            {playlist.description || "No description available"}
          </Text>
        </View>
      </View>

      {/* Tracks List */}
      <ScrollView className="flex-1 px-6">
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-white text-lg">Loading tracks...</Text>
          </View>
        ) : tracks.length > 0 ? (
          <View>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-lg font-semibold">
                Tracks ({tracks.length})
              </Text>
              <Text className="text-gray-400 text-sm">
                {tracks.filter(t => t.preview_url).length} with previews
              </Text>
            </View>
            {tracks.map(renderTrackItem)}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <Ionicons name="musical-notes-outline" size={64} color="#4B5563" />
            <Text className="text-white text-lg mt-4 mb-2">No tracks found</Text>
            <Text className="text-gray-400 text-center">
              This playlist appears to be empty or the tracks couldn't be loaded.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
