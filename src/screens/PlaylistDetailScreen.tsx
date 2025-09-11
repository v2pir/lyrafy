import React, { useEffect, useState, useRef } from "react";
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { spotifyServiceBackend } from "../services/spotifyServiceBackend";
import { deezerServiceBackend } from "../services/deezerServiceBackend";
import { SpotifyTrack, SpotifyPlaylist } from "../types/music";

type PlaylistDetailRouteParams = {
  playlist: SpotifyPlaylist;
};

export default function PlaylistDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { playlist } = route.params as PlaylistDetailRouteParams;
  
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<string | null>(null);
  
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadPlaylistTracks = async () => {
    if (!playlist?.id) return;
    
    try {
      setIsLoading(true);
      const playlistTracks = await spotifyServiceBackend.getPlaylistTracks(playlist.id);
      setTracks(playlistTracks);
    } catch (error) {
      console.error("Error loading playlist tracks:", error);
      Alert.alert("Error", "Failed to load playlist tracks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylistTracks();
  }, [playlist?.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      // Use a more gentle cleanup approach
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {
          console.log("Unmount cleanup completed");
        });
        soundRef.current = null;
      }
    };
  }, []);

  // Stop audio when screen loses focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      stopCurrentAudio();
    });

    return unsubscribe;
  }, [navigation]);

  const stopCurrentAudio = async () => {
    if (soundRef.current) {
      try {
        // Check if sound is still loaded before trying to stop
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.stopAsync();
        }
        await soundRef.current.unloadAsync();
      } catch (error) {
        // Ignore "Seeking interrupted" and other cleanup errors
        console.log("Audio cleanup completed (ignoring cleanup errors)");
      } finally {
        soundRef.current = null;
        setCurrentSound(null);
        setPlayingTrackId(null);
      }
    }
  };

  const playTrackPreview = async (track: SpotifyTrack) => {
    try {
      // Stop current audio if playing
      await stopCurrentAudio();
      
      // If clicking the same track, just stop it
      if (playingTrackId === track.id) {
        setPlayingTrackId(null);
        return;
      }

      setIsLoadingPreview(track.id);
      setPlayingTrackId(track.id);

      // Try to find Deezer preview first
      let previewUrl = track.preview_url;
      
      if (!previewUrl) {
        console.log("No Spotify preview, searching Deezer for:", track.name);
        const deezerTracks = await deezerServiceBackend.searchTracks(
          `${track.name} ${track.artists[0]?.name}`, 
          3
        );
        
        const bestMatch = deezerTracks.find(deezerTrack => 
          deezerTrack.title.toLowerCase().includes(track.name.toLowerCase()) ||
          track.name.toLowerCase().includes(deezerTrack.title.toLowerCase())
        );
        
        if (bestMatch?.preview) {
          previewUrl = bestMatch.preview;
          console.log("Found Deezer preview for:", track.name);
        }
      }

      if (!previewUrl) {
        Alert.alert("No Preview", "No preview available for this track");
        setPlayingTrackId(null);
        return;
      }

      // Initialize audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: previewUrl },
        { shouldPlay: true, volume: 1.0 }
      );

      soundRef.current = sound;
      setCurrentSound(sound);

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingTrackId(null);
          // Clean up sound without throwing errors
          sound.unloadAsync().catch(() => {
            console.log("Playback finished, sound cleaned up");
          });
          soundRef.current = null;
          setCurrentSound(null);
        }
      });

      console.log("Playing preview for:", track.name);
    } catch (error) {
      console.error("Error playing preview:", error);
      Alert.alert("Error", "Failed to play preview. Please try again.");
      setPlayingTrackId(null);
    } finally {
      setIsLoadingPreview(null);
    }
  };

  const renderTrackItem = (track: SpotifyTrack, index: number) => {
    const isPlaying = playingTrackId === track.id;
    const isLoading = isLoadingPreview === track.id;
    
    return (
      <Pressable
        key={track.id}
        onPress={() => playTrackPreview(track)}
        className={`p-4 rounded-xl mb-2 flex-row items-center ${
          isPlaying ? "bg-green-900" : "bg-gray-900"
        }`}
      >
        <View className="w-10 h-10 bg-gray-800 rounded-lg mr-4 items-center justify-center">
          {isLoading ? (
            <ActivityIndicator size="small" color="#1DB954" />
          ) : isPlaying ? (
            <Ionicons name="pause" size={16} color="#1DB954" />
          ) : (
            <Text className="text-white text-sm font-bold">
              {index + 1}
            </Text>
          )}
        </View>
        
        <View className="flex-1">
          <Text className={`text-base font-semibold mb-1 ${isPlaying ? "text-green-400" : "text-white"}`} numberOfLines={1}>
            {track.name}
          </Text>
          <Text className="text-gray-400 text-sm" numberOfLines={1}>
            {track.artists.map(artist => artist.name).join(", ")}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Text className="text-gray-400 text-xs mr-2">
            {Math.floor(track.duration_ms / 60000)}:{(track.duration_ms % 60000 / 1000).toFixed(0).padStart(2, '0')}
          </Text>
          {isPlaying ? (
            <Ionicons name="pause" size={16} color="#1DB954" />
          ) : (
            <Ionicons name="play" size={16} color="#9CA3AF" />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 border-b border-gray-800">
        <Pressable 
          onPress={() => navigation.goBack()}
          className="mr-4"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        
        <View className="flex-1">
          <Text className="text-xl font-bold text-white" numberOfLines={1}>
            {playlist?.name || "Playlist"}
          </Text>
          <Text className="text-gray-400 text-sm">
            {playlist?.tracks?.total || 0} tracks
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 px-6 py-4">
        {isLoading ? (
          <View className="flex-1 justify-center items-center mt-32">
            <ActivityIndicator size="large" color="#1DB954" />
            <Text className="text-gray-400 text-center mt-4">
              Loading tracks...
            </Text>
          </View>
        ) : tracks.length > 0 ? (
          <View>
            {tracks.map((track, index) => renderTrackItem(track, index))}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center mt-32">
            <Ionicons name="musical-notes-outline" size={64} color="#4B5563" />
            <Text className="text-xl text-gray-300 text-center mt-4 mb-2">
              No tracks in this playlist
            </Text>
            <Text className="text-base text-gray-400 text-center">
              This playlist appears to be empty
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
