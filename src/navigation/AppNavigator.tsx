import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

// Screens
import WelcomeScreen from "../screens/WelcomeScreen";
import LoginScreen from "../screens/LoginScreen";
import GenrePreferencesScreen from "../screens/GenrePreferencesScreen";
import HomeScreen from "../screens/HomeScreen";
import VibeSelectionScreen from "../screens/VibeSelectionScreen";
import VibeModeScreen from "../screens/VibeModeScreen";
import PlaylistsScreen from "../screens/PlaylistsScreen";
import PlaylistDetailScreen from "../screens/PlaylistDetailScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MusicDNAScreen from "../screens/MusicDNAScreen";
import { VibeMode, SpotifyPlaylist } from "../types/music";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  GenrePreferences: undefined;
  MainTabs: undefined;
  VibeSelection: undefined;
  VibeMode: { vibeMode: VibeMode };
  PlaylistDetail: { playlist: SpotifyPlaylist };
  MusicDNA: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Playlists: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Playlists") {
            iconName = focused ? "musical-notes" : "musical-notes-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else {
            iconName = "home-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#1DB954",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "#333333",
          borderTopWidth: 1,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Playlists" component={PlaylistsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#000000" },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="GenrePreferences" component={GenrePreferencesScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen 
        name="VibeSelection" 
        component={VibeSelectionScreen}
        options={{
          presentation: "modal",
          gestureEnabled: true,
        }}
      />
      <Stack.Screen 
        name="VibeMode" 
        component={VibeModeScreen}
        options={{
          presentation: "fullScreenModal",
          gestureEnabled: true,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen 
        name="PlaylistDetail" 
        component={PlaylistDetailScreen}
        options={{
          presentation: "modal",
          gestureEnabled: true,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen 
        name="MusicDNA" 
        component={MusicDNAScreen}
        options={{
          presentation: "modal",
          gestureEnabled: true,
          animation: "slide_from_bottom",
        }}
      />
    </Stack.Navigator>
  );
}