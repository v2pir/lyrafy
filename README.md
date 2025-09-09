# Lyrafy - Music Discovery App

**Tagline:** "Swipe. Discover. Vibe."

A TikTok-style music discovery app that lets users swipe through personalized song snippets, create playlists, and discover new music through AI-powered recommendations.

## Features

### ✨ Core Features
- **TikTok-style Feed**: Vertical scrolling through 30-second song previews
- **Vibe Modes**: Curated mood-based music discovery (Gym, Chill, Breakup, Study, Party)
- **Custom Vibes**: AI-powered personalization based on text descriptions
- **Smart Recommendations**: Spotify API integration with audio feature analysis
- **Playlist Management**: Create and manage playlists directly in Spotify
- **Music Search**: Search for tracks, artists, and albums
- **Like System**: Save favorite tracks with heart animations

### 🎨 Design
- **Minimalist UI**: Clean, modern interface with smooth animations
- **Dark Theme**: Pure black background with Spotify green accents
- **Immersive Experience**: Full-screen album art with blur effects
- **Smooth Animations**: React Native Reanimated v3 for fluid interactions

### 🔐 Authentication
- **Spotify OAuth**: Secure login with Spotify accounts
- **Apple Music**: Placeholder implementation for future integration
- **Secure Storage**: Encrypted token storage with Expo SecureStore

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator
- Spotify Developer Account

### 1. Spotify Developer Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `exp://localhost:8081/--/auth` (for development)
4. Note your Client ID and Client Secret

### 2. Configure Spotify Credentials
Edit `src/config/spotify.ts`:
```typescript
export const SPOTIFY_CONFIG = {
  CLIENT_ID: "your_actual_spotify_client_id",
  REDIRECT_URI: "exp://localhost:8081/--/auth",
  // ... rest of config
};
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Start Development Server
```bash
bun start
```

### 5. Run on Device/Simulator
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app for physical device

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── MusicFeedCard.tsx
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # Screen components
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── GenrePreferencesScreen.tsx
│   ├── HomeScreen.tsx
│   ├── VibeModeScreen.tsx
│   ├── PlaylistsScreen.tsx
│   ├── SearchScreen.tsx
│   └── ProfileScreen.tsx
├── services/           # API and external services
│   ├── spotifyService.ts
│   ├── authService.ts
│   └── audioService.ts
├── state/              # Zustand stores
│   ├── authStore.ts
│   ├── musicStore.ts
│   └── playerStore.ts
├── types/              # TypeScript interfaces
│   └── music.ts
├── config/             # Configuration files
│   └── spotify.ts
└── utils/              # Utility functions
    └── cn.ts
```

## Key Technologies

- **React Native 0.76.7** with Expo SDK 53
- **TypeScript** for type safety
- **Zustand** for state management with AsyncStorage persistence
- **React Navigation v7** for navigation
- **NativeWind** (Tailwind CSS) for styling
- **React Native Reanimated v3** for animations
- **Expo AV** for audio playback
- **Expo Auth Session** for OAuth flows
- **Expo Secure Store** for token storage

## App Flow

1. **Welcome Screen**: App introduction with "Get Started" button
2. **Login Screen**: Spotify/Apple Music OAuth authentication
3. **Genre Preferences**: Select up to 5 favorite genres (optional)
4. **Main App**: Bottom tab navigation with 4 screens:
   - **Home**: TikTok-style music feed with vibe mode selector
   - **Search**: Search for tracks, artists, albums
   - **Playlists**: View and manage Spotify playlists
   - **Profile**: User info, liked songs, settings

## Vibe Modes

- **🏋️ Gym Mode**: High-energy, high BPM tracks
- **🌙 Chill Mode**: Lo-fi, relaxing music
- **💔 Breakup Mode**: Sad, emotional tracks
- **📚 Study Mode**: Instrumental, focus music
- **🎉 Party Mode**: EDM, dance, rap
- **✨ Custom Mode**: AI-powered custom vibe descriptions

## Audio Features Integration

The app uses Spotify's audio features API to match tracks to vibe modes:
- **Energy**: Overall energy level (0.0 - 1.0)
- **Valence**: Musical positivity (0.0 - 1.0)
- **Danceability**: How suitable for dancing (0.0 - 1.0)
- **Tempo**: BPM of the track
- **Instrumentalness**: Likelihood of no vocals (0.0 - 1.0)

## Production Considerations

### Security
- Move Spotify Client Secret to backend service
- Implement proper token refresh mechanisms
- Add rate limiting and error handling

### Features to Add
- Social features (follow friends, share tracks)
- Offline mode with cached tracks
- Apple Music full integration
- Advanced AI recommendations with OpenAI
- Push notifications for new music
- Analytics and user insights

### Performance
- Implement track preloading
- Add image caching
- Optimize bundle size
- Add error boundaries

## Contributing

This is a demo implementation. For production use:
1. Set up proper backend authentication
2. Implement comprehensive error handling
3. Add unit and integration tests
4. Set up CI/CD pipeline
5. Add analytics and crash reporting

## License

This project is for educational purposes. Spotify and Apple Music are trademarks of their respective owners.