import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { StatusBar } from "expo-status-bar";

type WelcomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center mb-16">
          <Text className="text-6xl font-bold text-white mb-4">VibeSwipe</Text>
          <Text className="text-lg text-gray-300 text-center">
            Swipe. Discover. Vibe.
          </Text>
        </View>
        
        <Pressable
          onPress={() => navigation.navigate("Login")}
          className="bg-green-500 px-12 py-4 rounded-2xl w-full max-w-xs"
        >
          <Text className="text-black text-lg font-semibold text-center">
            Get Started
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}