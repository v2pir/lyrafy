import React, { useEffect, useState } from "react";
import { View, Text, Pressable, ImageBackground, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SpotifyTrack } from "../types/music";
import { useMusicStore } from "../state/musicStore";
import { audioService } from "../services/audioService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MusicFeedCardProps {
  track: SpotifyTrack;
  isActive: boolean;
  onLike: () => void;
  onSkip: () => void;
  onAddToPlaylist: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function MusicFeedCard({ 
  track, 
  isActive, 
  onLike, 
  onSkip, 
  onAddToPlaylist 
}: MusicFeedCardProps) {
  const [isLiked, setIsLiked] = useState(false);
  const { isTrackLiked } = useMusicStore();
  
  // Animation values
  const likeScale = useSharedValue(1);
  const likeOpacity = useSharedValue(1);
  const heartScale = useSharedValue(1);

  useEffect(() => {
    setIsLiked(isTrackLiked(track.id));
  }, [track.id, isTrackLiked]);

  useEffect(() => {
    if (isActive && track.preview_url) {
      // Auto-play when card becomes active
      audioService.loadTrack(track).then((success) => {
        if (success) {
          audioService.play();
        }
      });
    } else if (!isActive) {
      // Pause when card becomes inactive
      audioService.pause();
    }
  }, [isActive, track]);

  const handleLike = () => {
    // Animate heart
    heartScale.value = withSequence(
      withSpring(1.3),
      withSpring(1)
    );
    
    onLike();
    setIsLiked(!isLiked);
  };

  const handleSkip = () => {
    // Animate skip
    likeScale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    onSkip();
  };

  const handleAddToPlaylist = () => {
    // Animate add button
    likeOpacity.value = withSequence(
      withTiming(0.5, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    onAddToPlaylist();
  };

  const likeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
    opacity: likeOpacity.value,
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const albumArt = track.album.images[0]?.url || "";

  return (
    <View className="flex-1" style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      <ImageBackground
        source={{ uri: albumArt }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          {/* Gradient overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 pt-16 pb-4">
              <Text className="text-2xl font-bold text-white">VibeSwipe</Text>
              <Pressable className="w-10 h-10 bg-black/30 rounded-full items-center justify-center">
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Main content area */}
            <View className="flex-1 justify-end">
              {/* Track info */}
              <View className="px-6 pb-8">
                <Text className="text-2xl font-bold text-white mb-2" numberOfLines={2}>
                  {track.name}
                </Text>
                <Text className="text-lg text-gray-300 mb-4" numberOfLines={1}>
                  {track.artists.map(artist => artist.name).join(", ")}
                </Text>
                
                {/* Album info */}
                <View className="flex-row items-center mb-6">
                  <View className="w-12 h-12 bg-gray-800 rounded-lg mr-3 overflow-hidden">
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
                  <Text className="text-base text-gray-400" numberOfLines={1}>
                    {track.album.name}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View className="flex-row justify-center items-center pb-12 space-x-8">
                {/* Skip button */}
                <AnimatedPressable
                  onPress={handleSkip}
                  style={likeAnimatedStyle}
                  className="w-16 h-16 bg-gray-800/80 rounded-full items-center justify-center"
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </AnimatedPressable>

                {/* Like button */}
                <AnimatedPressable
                  onPress={handleLike}
                  style={heartAnimatedStyle}
                  className={`w-20 h-20 rounded-full items-center justify-center ${
                    isLiked ? "bg-green-500" : "bg-gray-800/80"
                  }`}
                >
                  <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={32} 
                    color={isLiked ? "#000000" : "#FFFFFF"} 
                  />
                </AnimatedPressable>

                {/* Add to playlist button */}
                <AnimatedPressable
                  onPress={handleAddToPlaylist}
                  style={likeAnimatedStyle}
                  className="w-16 h-16 bg-gray-800/80 rounded-full items-center justify-center"
                >
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </AnimatedPressable>
              </View>
            </View>
          </LinearGradient>
        </BlurView>
      </ImageBackground>
    </View>
  );
}