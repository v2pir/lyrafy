import React, { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, ActivityIndicator, Dimensions, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withTiming,
  interpolate,
  Easing
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useMusicStore } from "../state/musicStore";
import { useAuthStore } from "../state/authStore";
import { authService } from "../services/authService";
import { spotifyService } from "../services/spotifyService";
import { aiMusicService, MusicTasteProfile } from "../services/aiMusicService";
import { musicDNAService, MusicDNAProfile } from "../services/musicDNAService";
import EyeMusicLogo from "../components/EyeMusicLogo";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { currentVibeMode, setVibeMode, setFeedTracks } = useMusicStore();
  const { isAuthenticated } = useAuthStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [musicDNAProfile, setMusicDNAProfile] = useState<MusicDNAProfile | null>(null);
  const [isGeneratingDNA, setIsGeneratingDNA] = useState(false);

  // Animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.8);
  const rotateAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const slideAnim = useSharedValue(50);

  useEffect(() => {
    // Entrance animations
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
    
    // Continuous subtle animations
    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
    
    pulseAnim.value = withRepeat(
      withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: scaleAnim.value },
      { translateY: slideAnim.value }
    ]
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotateAnim.value}deg` },
      { scale: pulseAnim.value }
    ]
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }]
  }));

  const handleVibeMode = () => {
    navigation.navigate("GenrePreferences");
  };

  const handleCreatePlaylist = () => {
    navigation.navigate("VibeSelection");
  };

  const handleVibeFromTaste = async () => {
    if (!isAuthenticated) {
      Alert.alert("Authentication Required", "Please connect to Spotify first");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      console.log("🤖 Starting AI music taste analysis...");
      
      // Get user's top tracks
      const topTracks = await spotifyService.getUserTopTracks("medium_term");
      if (topTracks.length === 0) {
        Alert.alert("No Data", "We need your top tracks to analyze your taste. Please listen to more music on Spotify first.");
        return;
      }

      console.log(`📊 Analyzing taste from ${topTracks.length} tracks`);

      // Analyze music taste using AI
      const tasteProfile = await aiMusicService.analyzeMusicTaste(topTracks);
      console.log("✅ Taste analysis complete:", tasteProfile);

      // Generate personalized vibe name
      const vibeName = aiMusicService.generateVibeModeName();
      console.log("🎵 Generated vibe name:", vibeName);

      // Get similar tracks using AI analysis (excludes user's top tracks automatically)
      const similarTracks = await aiMusicService.findSimilarTracks(
        topTracks.map(track => track.id), // Exclude user's top track IDs
        200 // Get up to 200 similar tracks
      );

      console.log(`🎯 Found ${similarTracks.length} similar tracks`);

      // Extract just the tracks from SimilarTrack objects
      const newRecommendations = similarTracks.map(similarTrack => similarTrack.track);

      console.log(`✅ Found ${newRecommendations.length} NEW similar songs (excluding ${topTracks.length} top tracks)`);

      // Check if we have enough new recommendations
      if (newRecommendations.length < 10) {
        Alert.alert(
          "Limited New Music",
          `We found ${newRecommendations.length} new tracks that match your taste. This might be because your music taste is very specific or you've already discovered most similar music. Try the regular vibe selection for more variety!`
        );
      }

      // Create a simple vibe mode with the generated name
      const personalizedVibe = {
        id: `ai-vibe-${Date.now()}`,
        name: vibeName,
        emoji: "🎵",
        description: `Personalized music based on your taste`,
        gradient: ["#8B5CF6", "#EC4899"] as [string, string] // Default gradient
      };

      // Set the vibe and tracks
      setVibeMode(personalizedVibe);
      setFeedTracks(newRecommendations);

      // Navigate to vibe mode
      navigation.navigate("VibeMode", { vibeMode: personalizedVibe });

      Alert.alert(
        "Your Personalized Vibe is Ready! 🎵",
        `"${personalizedVibe.name}" - ${personalizedVibe.description}\n\nFound ${newRecommendations.length} NEW tracks that match your taste!\n\n(Excluded ${topTracks.length} of your top tracks)`
      );

    } catch (error) {
      console.error("❌ Error in vibe from taste:", error);
      Alert.alert(
        "Analysis Failed", 
        "Sorry, we couldn't analyze your music taste. Please try again or use the regular vibe selection."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateMusicDNA = async () => {
    if (!isAuthenticated) {
      Alert.alert("Authentication Required", "Please connect to Spotify first");
      return;
    }

    setIsGeneratingDNA(true);
    
    try {
      console.log("🧬 Generating Music DNA profile...");
      const profile = await musicDNAService.generateMusicDNAProfile("week");
      setMusicDNAProfile(profile);
    } catch (error) {
      console.error("❌ Error generating Music DNA:", error);
      Alert.alert(
        "Generation Failed", 
        "Sorry, we couldn't generate your Music DNA profile. Please try again."
      );
    } finally {
      setIsGeneratingDNA(false);
    }
  };

  const navigateToMusicDNA = () => {
    navigation.navigate("MusicDNA");
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#000000', '#0a0a0a', '#1a1a1a']}
          style={styles.gradientBackground}
        >
          <Animated.View style={[styles.authContainer, containerStyle]}>
            {/* Animated Logo */}
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <EyeMusicLogo size={80} />
            </Animated.View>

            <Text style={styles.appTitle}>lyrafy</Text>
            <Text style={styles.appSubtitle}>your ai music companion</Text>
            
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>connect your music</Text>
              <Text style={styles.authDescription}>
                sign in to spotify to unlock personalized music discovery powered by ai
          </Text>
              
              <Animated.View style={buttonStyle}>
          <Pressable
            onPress={async () => {
              const success = await authService.authenticateWithSpotify();
                    if (!success) {
                      Alert.alert("Error", "Spotify login failed. Please try again.");
                    }
                  }}
                  style={styles.connectButton}
                >
                  <LinearGradient
                    colors={['#1DB954', '#1ed760']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
                    <Text style={styles.buttonText}>connect spotify</Text>
                  </LinearGradient>
          </Pressable>
              </Animated.View>
        </View>
          </Animated.View>
        </LinearGradient>
        </View>
    );
  }

  // No loading state needed anymore

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        style={styles.gradientBackground}
      >
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <Animated.View style={[styles.mainContainer, containerStyle]}>
          {/* Futuristic Header */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
              <EyeMusicLogo size={80} />
            </Animated.View>
            
            <Text style={styles.appTitle}>lyrafy</Text>
            <Text style={styles.appSubtitle}>ai-powered music discovery</Text>
            
            {/* Floating particles effect */}
            <View style={styles.particlesContainer}>
              {[...Array(6)].map((_, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      left: Math.random() * SCREEN_WIDTH,
                    }
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Main Action Cards */}
          <View style={styles.actionsContainer}>
            {/* AI Vibe Card */}
            <Animated.View style={[styles.actionCard, buttonStyle]}>
              <BlurView intensity={10} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']}
                  style={styles.cardGradient}
                >
      <Pressable
                    onPress={handleVibeFromTaste}
                    disabled={isAnalyzing}
                    style={styles.cardPressable}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardIcon}>
                        {isAnalyzing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="bulb" size={28} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>
                          {isAnalyzing ? "analyzing..." : "vibe from taste"}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          ai learns your music taste
                        </Text>
                      </View>
                      {!isAnalyzing && (
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                      )}
                    </View>
                  </Pressable>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Music DNA Card */}
            <Animated.View style={[styles.actionCard, buttonStyle]}>
              <BlurView intensity={10} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(255, 107, 107, 0.3)', 'rgba(255, 142, 142, 0.3)']}
                  style={styles.cardGradient}
                >
                  <Pressable onPress={navigateToMusicDNA} style={styles.cardPressable}>
                    <View style={styles.cardContent}>
                      <View style={styles.cardIcon}>
                        <Ionicons name="finger-print" size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>music dna</Text>
                        <Text style={styles.cardSubtitle}>
                          your musical fingerprint
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </View>
                  </Pressable>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Choose Vibe Card */}
            <Animated.View style={[styles.actionCard, buttonStyle]}>
              <BlurView intensity={10} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(29, 185, 84, 0.3)', 'rgba(30, 215, 96, 0.3)']}
                  style={styles.cardGradient}
                >
                  <Pressable onPress={handleVibeMode} style={styles.cardPressable}>
                    <View style={styles.cardContent}>
                      <View style={styles.cardIcon}>
                        <Ionicons name="musical-notes" size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>choose vibe</Text>
                        <Text style={styles.cardSubtitle}>select your mood</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </View>
                  </Pressable>
                </LinearGradient>
              </BlurView>
            </Animated.View>

            {/* Create Playlist Card */}
            <Animated.View style={[styles.actionCard, buttonStyle]}>
              <BlurView intensity={10} style={styles.cardBlur}>
                <LinearGradient
                  colors={['rgba(6, 182, 212, 0.3)', 'rgba(14, 165, 233, 0.3)']}
                  style={styles.cardGradient}
                >
                  <Pressable onPress={handleCreatePlaylist} style={styles.cardPressable}>
                    <View style={styles.cardContent}>
                      <View style={styles.cardIcon}>
                        <Ionicons name="add-circle" size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>create playlist</Text>
                        <Text style={styles.cardSubtitle}>build your collection</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                    </View>
      </Pressable>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </View>

          {/* Current Vibe Display */}
          {currentVibeMode && (
            <View style={styles.currentVibeCard}>
              <BlurView intensity={10} style={styles.vibeBlur}>
                <Text style={styles.currentVibeLabel}>current vibe</Text>
                <Text style={styles.currentVibeText}>
                  {currentVibeMode.emoji} {currentVibeMode.name}
                </Text>
              </BlurView>
            </View>
          )}
          </Animated.View>
        </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  mainContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    minHeight: SCREEN_HEIGHT - 100,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '300',
  },
  authCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  authDescription: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  connectButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    position: 'relative',
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.6)',
    borderRadius: 2,
    top: Math.random() * 200,
  },
  actionsContainer: {
    gap: 20,
    paddingHorizontal: 8,
    paddingVertical: 20,
  },
  actionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  cardBlur: {
    borderRadius: 20,
  },
  cardGradient: {
    padding: 20,
  },
  cardPressable: {
    borderRadius: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '400',
  },
  currentVibeCard: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vibeBlur: {
    padding: 16,
    alignItems: 'center',
  },
  currentVibeLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    marginBottom: 4,
    fontWeight: '500',
  },
  currentVibeText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
