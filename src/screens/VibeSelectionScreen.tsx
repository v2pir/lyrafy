import React from "react";
import { View, Text, Pressable, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { VibeMode } from "../types/music";
import { VIBE_PRESETS } from "../utils/vibePresets";

type VibeSelectionNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function VibeSelectionScreen() {
  const navigation = useNavigation<VibeSelectionNavigationProp>();

  const handleVibeSelect = (vibeMode: VibeMode) => {
    navigation.navigate("VibeMode", { vibeMode });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      <View className="flex-1 px-6 py-8">
        <Text className="text-3xl font-bold text-white text-center mb-2">
          Choose Your Vibe
        </Text>
        <Text className="text-gray-400 text-center mb-8">
          What kind of music are you feeling?
        </Text>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="flex-1"
        >
          <View className="flex-row flex-wrap justify-between">
            {VIBE_PRESETS.map((vibe) => (
              <Pressable
                key={vibe.id}
                onPress={() => handleVibeSelect(vibe)}
                className="w-[48%] mb-6 rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: vibe.gradient[0],
                  background: `linear-gradient(135deg, ${vibe.gradient[0]}, ${vibe.gradient[1]})`,
                }}
              >
                <View 
                  className="p-6 items-center justify-center min-h-[140px]"
                  style={{
                    backgroundColor: vibe.gradient[0],
                    background: `linear-gradient(135deg, ${vibe.gradient[0]}, ${vibe.gradient[1]})`,
                  }}
                >
                  <Text className="text-4xl mb-2">{vibe.emoji}</Text>
                  <Text className="text-white text-xl font-bold text-center mb-1">
                    {vibe.name}
                  </Text>
                  <Text className="text-white text-sm text-center opacity-90">
                    {vibe.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
