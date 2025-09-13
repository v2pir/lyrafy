import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Dimensions, Alert, ActivityIndicator } from "react-native";
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
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import ViewShot from "react-native-view-shot";
// Conditional import for react-native-share (not available in Expo Go)
let Share: any = null;
try {
  Share = require("react-native-share").default;
} catch (error) {
  console.log("react-native-share not available in Expo Go, using fallback");
}
import { musicDNAService, MusicDNAProfile } from "../services/musicDNAService";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * INSTAGRAM STORIES SHARING SETUP GUIDE:
 * 
 * To enable Instagram Stories sharing, you need to:
 * 
 * 1. Create a Facebook App:
 *    - Go to https://developers.facebook.com/apps/
 *    - Click "Create App" and select "Consumer" or "Business"
 *    - Fill in your app details
 * 
 * 2. Get your App ID:
 *    - In your Facebook App dashboard, find "App ID" in the App Settings
 *    - Copy this ID
 * 
 * 3. Update the code:
 *    - Replace "123456789" in the shareOptions with your real App ID
 *    - Example: appId: "1234567890123456"
 * 
 * 4. Configure Instagram:
 *    - In your Facebook App, go to "Products" → "Instagram Basic Display"
 *    - Add Instagram Basic Display product
 *    - Configure OAuth redirect URIs if needed
 * 
 * 5. Test the integration:
 *    - Make sure Instagram app is installed on test device
 *    - The sharing should now open Instagram Stories directly
 */

export default function MusicDNAScreen() {
  const [profile, setProfile] = useState<MusicDNAProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"day" | "week">("week");
  const viewShotRef = React.useRef<ViewShot>(null);

  // Helper function to check if Instagram is installed
  const checkInstagramInstalled = async (): Promise<boolean> => {
    try {
      // Primary check: instagram:// URL scheme (most reliable)
      const canOpenInstagram = await Linking.canOpenURL('instagram://');
      
      if (canOpenInstagram) {
        console.log("✅ Instagram detected via instagram://");
        return true;
      }
      
      // Secondary checks for different Instagram deep links
      const instagramUrls = [
        "instagram://story-camera",
        "instagram://camera",
        "instagram://app"
      ];
      
      for (const url of instagramUrls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            console.log(`✅ Instagram detected via: ${url}`);
            return true;
          }
        } catch (urlError) {
          console.log(`❌ Failed to check ${url}:`, urlError);
        }
      }
      
      console.log("❌ Instagram not detected via any URL scheme");
      return false;
    } catch (error) {
      console.error("Error checking Instagram installation:", error);
      // In Expo Go, assume Instagram might be available and let the user try
      return true;
    }
  };

  // Animation values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);
  const slideAnim = useSharedValue(50);
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);

  // Entrance animations
  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    scaleAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    slideAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
    
    // Staggered card animation
    cardScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 100 }));
    cardOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { scale: scaleAnim.value },
      { translateY: slideAnim.value }
    ]
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }]
  }));

  const generateProfile = async () => {
    setIsLoading(true);
    try {
      const newProfile = await musicDNAService.generateMusicDNAProfile(timeRange);
      setProfile(newProfile);
    } catch (error) {
      console.error("Error generating profile:", error);
      Alert.alert("Error", "Failed to generate Music DNA profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shareToInstagram = async () => {
    console.log("📱 Instagram share button pressed");
    if (!profile) {
      console.log("❌ Missing profile");
      return;
    }

    try {
      // Skip ViewShot capture and use text-based sharing instead
      console.log("📱 Using text-based sharing (ViewShot not working in Expo Go)");
      
      const shareText = `🧬 My Music DNA: ${profile.vibe} ${profile.emoji}\n\n${profile.description}\n\n📊 Stats:\n• ${profile.stats.totalTracks} tracks\n• Top Genre: ${profile.stats.topGenre}\n• Top Artist: ${profile.stats.topArtist}\n• Mood: ${profile.mood}\n• Energy: ${profile.energy}\n\nGenerated by Lyrafy 🎵`;
      
      console.log("📤 Sharing text content to Instagram...");
      
      // Check if Instagram is installed first
      console.log("🔍 Checking if Instagram is installed...");
      const isInstagramInstalled = await checkInstagramInstalled();
      
      if (!isInstagramInstalled) {
        console.log("⚠️ Instagram not detected, but proceeding with fallback sharing");
        // Don't block the user - proceed with general sharing
      }
      
      // Use text-based sharing instead of image capture
      console.log("📤 Attempting text-based Instagram sharing...");
      
      // Always try general sharing first - this is more reliable
      if (Share) {
        try {
          const shareOptions = {
            title: "My Music DNA",
            message: shareText,
          };

          console.log("🚀 Using general share options:", shareOptions);
          await Share.open(shareOptions);
          
          Alert.alert(
            "Share Options", 
            "Choose Instagram from the share options to post to Stories!",
            [{ text: "OK" }]
          );
        } catch (shareError) {
          console.log("General sharing failed:", shareError);
          
          // Try Instagram deep link as fallback
          try {
            const instagramUrl = `instagram://story-camera`;
            const canOpen = await Linking.canOpenURL(instagramUrl);
            
            if (canOpen) {
              await Linking.openURL(instagramUrl);
              Alert.alert(
                "Instagram Stories", 
                "Opening Instagram Stories! You can copy your Music DNA text and paste it.",
                [{ text: "OK" }]
              );
            } else {
              throw new Error("Instagram not available");
            }
          } catch (instagramError) {
            console.log("Instagram fallback failed:", instagramError);
            Alert.alert(
              "Share Options", 
              "Please use the share button to copy your Music DNA text and share it manually.",
              [{ text: "OK" }]
            );
          }
        }
      } else {
        // For Expo Go, use clipboard-only sharing (most reliable)
        console.log("📱 Using Expo Go fallback - clipboard-only sharing");
        try {
          // Copy to clipboard first
          await Clipboard.setStringAsync(shareText);
          
          // Show success message with instructions
          Alert.alert(
            "Music DNA Copied! 📋", 
            "Your Music DNA has been copied to clipboard!\n\nTo share on Instagram:\n1. Open Instagram\n2. Go to Stories\n3. Paste your Music DNA text\n4. Add it to your story!",
            [
              { text: "OK", style: "default" },
              { 
                text: "Try Share Sheet", 
                onPress: async () => {
                  try {
                    // Try a different approach - use a simple text share
                    const simpleShareUrl = `sms:?body=${encodeURIComponent("Check out my Music DNA!")}`;
                    const canOpenSMS = await Linking.canOpenURL(simpleShareUrl);
                    
                    if (canOpenSMS) {
                      await Linking.openURL(simpleShareUrl);
                    } else {
                      Alert.alert("Share Options", "Please manually share your Music DNA from Instagram Stories!");
                    }
                  } catch (error) {
                    console.log("SMS share failed:", error);
                    Alert.alert("Share Options", "Please manually share your Music DNA from Instagram Stories!");
                  }
                }
              }
            ]
          );
        } catch (expoError) {
          console.log("Clipboard sharing failed:", expoError);
          
          // Final fallback: Show text in alert
          Alert.alert(
            "Share Your Music DNA", 
            `Please copy this text and share it on Instagram:\n\n${shareText}`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error sharing to Instagram:", error);
      
      // Final fallback to native share sheet with text
      try {
        console.log("🔄 Attempting final fallback...");
        const shareText = `🧬 My Music DNA: ${profile.vibe} ${profile.emoji}\n\n${profile.description}\n\nGenerated by Lyrafy 🎵`;
        await shareViaNativeSheet(shareText);
      } catch (fallbackError) {
        console.error("Fallback sharing failed:", fallbackError);
        Alert.alert("Error", "Failed to share. Please try again.");
      }
    }
  };

  const shareImageViaNativeSheet = async (imageUri: string) => {
    try {
      if (Share) {
        // Use react-native-share for image sharing as fallback
        await Share.open({
          title: "My Music DNA",
          url: imageUri,
        });
      } else {
        // Fallback for Expo Go - use expo-sharing
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Share your Music DNA',
        });
      }
    } catch (error) {
      console.error("Error sharing image:", error);
      Alert.alert("Error", "Failed to share image. Please try again.");
    }
  };

  const shareToTikTok = async () => {
    if (!profile) return;

    try {
      // Use text-based sharing instead of image capture
      console.log("📱 Using text-based sharing for TikTok");
      
      const shareText = `🧬 My Music DNA: ${profile.vibe} ${profile.emoji}\n\n${profile.description}\n\n📊 Stats:\n• ${profile.stats.totalTracks} tracks\n• Top Genre: ${profile.stats.topGenre}\n• Top Artist: ${profile.stats.topArtist}\n• Mood: ${profile.mood}\n• Energy: ${profile.energy}\n\nGenerated by Lyrafy 🎵`;
      
      if (Share) {
        // Use react-native-share for general sharing (TikTok will be available in share sheet)
        const shareOptions = {
          title: "My Music DNA",
          message: shareText,
        };

        await Share.open(shareOptions);
        
        Alert.alert(
          "TikTok", 
          "Opening TikTok with your Music DNA card!",
          [{ text: "OK" }]
        );
      } else {
        // Fallback for Expo Go - use clipboard-only sharing
        try {
          // Copy to clipboard first
          await Clipboard.setStringAsync(shareText);
          
          // Show success message with instructions
          Alert.alert(
            "Music DNA Copied! 📋", 
            "Your Music DNA has been copied to clipboard!\n\nTo share on TikTok:\n1. Open TikTok\n2. Create a new video\n3. Paste your Music DNA text\n4. Add it to your video!",
            [
              { text: "OK", style: "default" },
              { 
                text: "Try Share Sheet", 
                onPress: async () => {
                  try {
                    // Try SMS as alternative share method
                    const simpleShareUrl = `sms:?body=${encodeURIComponent("Check out my Music DNA!")}`;
                    const canOpenSMS = await Linking.canOpenURL(simpleShareUrl);
                    
                    if (canOpenSMS) {
                      await Linking.openURL(simpleShareUrl);
                    } else {
                      Alert.alert("Share Options", "Please manually share your Music DNA from TikTok!");
                    }
                  } catch (error) {
                    console.log("SMS share failed:", error);
                    Alert.alert("Share Options", "Please manually share your Music DNA from TikTok!");
                  }
                }
              }
            ]
          );
        } catch (error) {
          console.log("TikTok sharing failed:", error);
          
          // Final fallback: Show text in alert
          Alert.alert(
            "Share Your Music DNA", 
            `Please copy this text and share it on TikTok:\n\n${shareText}`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error sharing to TikTok:", error);
      // Fallback to native share sheet with image
      try {
        const captureMethod = viewShotRef.current?.capture;
        if (captureMethod) {
          const imageUri = await captureMethod();
          await shareImageViaNativeSheet(imageUri);
        } else {
          const shareText = `🧬 My Music DNA: ${profile.vibe} ${profile.emoji}\n\n${profile.description}\n\nGenerated by Lyrafy 🎵`;
          await shareViaNativeSheet(shareText);
        }
      } catch (fallbackError) {
        console.error("Fallback sharing failed:", fallbackError);
        Alert.alert("Error", "Failed to share. Please try again.");
      }
    }
  };

  const shareViaNativeSheet = async (shareText: string) => {
    try {
      if (Share) {
        // Use react-native-share for text sharing as fallback
        await Share.open({
          title: "My Music DNA",
          message: shareText,
        });
      } else {
        // Fallback for Expo Go - use expo-sharing with text
        await Sharing.shareAsync(shareText, {
          mimeType: 'text/plain',
          dialogTitle: 'Share your Music DNA',
        });
      }
    } catch (error) {
      console.error("Error in native share:", error);
      Alert.alert("Error", "Failed to share. Please try again.");
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        style={styles.gradientBackground}
      >
        <Animated.View style={[styles.mainContainer, containerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <BlurView intensity={20} style={styles.headerBlur}>
              <Text style={styles.headerTitle}>Music DNA</Text>
              <Text style={styles.headerSubtitle}>Your musical fingerprint</Text>
            </BlurView>
          </View>

          {/* Time Range Selector */}
          <View style={styles.timeRangeContainer}>
            <BlurView intensity={15} style={styles.timeRangeBlur}>
              <Pressable
                style={[styles.timeRangeButton, timeRange === "day" && styles.timeRangeButtonActive]}
                onPress={() => setTimeRange("day")}
              >
                <Text style={[styles.timeRangeText, timeRange === "day" && styles.timeRangeTextActive]}>
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={[styles.timeRangeButton, timeRange === "week" && styles.timeRangeButtonActive]}
                onPress={() => setTimeRange("week")}
              >
                <Text style={[styles.timeRangeText, timeRange === "week" && styles.timeRangeTextActive]}>
                  This Week
                </Text>
              </Pressable>
            </BlurView>
          </View>

          {/* Generate Button */}
          <View style={styles.generateContainer}>
            <Pressable
              onPress={generateProfile}
              disabled={isLoading}
              style={styles.generateButton}
            >
              <LinearGradient
                colors={isLoading ? ['#374151', '#4B5563'] : ['#8B5CF6', '#EC4899']}
                style={styles.generateButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.generateButtonText}>
                  {isLoading ? "Analyzing..." : "Generate My DNA"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Music DNA Card */}
          {profile && (
            <ViewShot 
              ref={viewShotRef} 
              options={{ 
                format: "png", 
                quality: 0.8,
                result: "tmpfile"
              }}
            >
              {/* Simplified card for ViewShot capture - no BlurView, LinearGradient, or Animated components */}
              <View style={[styles.cardContainer, styles.simpleCard]}>
                <View style={[styles.cardGradient, { backgroundColor: profile.color }]}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>{profile.emoji}</Text>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardVibe}>{profile.vibe}</Text>
                      <Text style={styles.cardDescription}>{profile.description}</Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.totalTracks}</Text>
                      <Text style={styles.statLabel}>Tracks</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.topGenre}</Text>
                      <Text style={styles.statLabel}>Top Genre</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.topArtist}</Text>
                      <Text style={styles.statLabel}>Top Artist</Text>
                    </View>
                  </View>

                  {/* Mood & Energy */}
                  <View style={styles.moodEnergyContainer}>
                    <View style={styles.moodEnergyItem}>
                      <Text style={styles.moodEnergyLabel}>Mood</Text>
                      <Text style={styles.moodEnergyValue}>{profile.mood}</Text>
                    </View>
                    <View style={styles.moodEnergyItem}>
                      <Text style={styles.moodEnergyLabel}>Energy</Text>
                      <Text style={styles.moodEnergyValue}>{profile.energy}</Text>
                    </View>
                  </View>

                  {/* Share Buttons */}
                  <View style={styles.shareButtonsContainer}>
                    <Pressable onPress={shareToInstagram} style={styles.shareButton}>
                      <LinearGradient
                        colors={['#E1306C', '#F56040', '#F77737']}
                        style={styles.shareButtonGradient}
                      >
                        <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>Instagram</Text>
                      </LinearGradient>
                    </Pressable>
                    
                    <Pressable onPress={shareToTikTok} style={styles.shareButton}>
                      <LinearGradient
                        colors={['#000000', '#FF0050', '#00F2EA']}
                        style={styles.shareButtonGradient}
                      >
                        <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>TikTok</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ViewShot>
          )}

          {/* Display Card (with animations and effects) */}
          {profile && (
            <Animated.View style={[styles.cardContainer, cardStyle, styles.displayCard]}>
              <BlurView intensity={20} style={styles.cardBlur}>
                <LinearGradient
                  colors={[profile.color, `${profile.color}80`]}
                  style={styles.cardGradient}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardEmoji}>{profile.emoji}</Text>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardVibe}>{profile.vibe}</Text>
                      <Text style={styles.cardDescription}>{profile.description}</Text>
                    </View>
                  </View>

                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.totalTracks}</Text>
                      <Text style={styles.statLabel}>Tracks</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.topGenre}</Text>
                      <Text style={styles.statLabel}>Top Genre</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{profile.stats.topArtist}</Text>
                      <Text style={styles.statLabel}>Top Artist</Text>
                    </View>
                  </View>

                  {/* Mood & Energy */}
                  <View style={styles.moodEnergyContainer}>
                    <View style={styles.moodEnergyItem}>
                      <Text style={styles.moodEnergyLabel}>Mood</Text>
                      <Text style={styles.moodEnergyValue}>{profile.mood}</Text>
                    </View>
                    <View style={styles.moodEnergyItem}>
                      <Text style={styles.moodEnergyLabel}>Energy</Text>
                      <Text style={styles.moodEnergyValue}>{profile.energy}</Text>
                    </View>
                  </View>

                  {/* Share Buttons */}
                  <View style={styles.shareButtonsContainer}>
                    <Pressable onPress={shareToInstagram} style={styles.shareButton}>
                      <LinearGradient
                        colors={['#E1306C', '#F56040', '#F77737']}
                        style={styles.shareButtonGradient}
                      >
                        <Ionicons name="logo-instagram" size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>Instagram</Text>
                      </LinearGradient>
                    </Pressable>
                    
                    <Pressable onPress={shareToTikTok} style={styles.shareButton}>
                      <LinearGradient
                        colors={['#000000', '#FF0050', '#00F2EA']}
                        style={styles.shareButtonGradient}
                      >
                        <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
                        <Text style={styles.shareButtonText}>TikTok</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          )}

          {/* Empty State */}
          {!profile && !isLoading && (
            <View style={styles.emptyState}>
              <BlurView intensity={10} style={styles.emptyStateBlur}>
                <Ionicons name="musical-notes-outline" size={64} color="#8B5CF6" />
                <Text style={styles.emptyStateTitle}>Discover Your Music DNA</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Generate a personalized music profile based on your listening habits
                </Text>
              </BlurView>
            </View>
          )}
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
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    marginTop: 4,
  },
  timeRangeContainer: {
    marginBottom: 30,
  },
  timeRangeBlur: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  timeRangeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0A0A0',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  generateContainer: {
    marginBottom: 30,
  },
  generateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  cardContainer: {
    marginBottom: 30,
  },
  cardBlur: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardVibe: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  moodEnergyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodEnergyItem: {
    alignItems: 'center',
    flex: 1,
  },
  moodEnergyLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  moodEnergyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shareButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Simplified card styles for ViewShot capture
  simpleCard: {
    position: 'absolute',
    left: -9999, // Hide off-screen
    opacity: 0,
  },
  displayCard: {
    // This is the visible card with animations
  },
});
