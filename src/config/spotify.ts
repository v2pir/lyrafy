// src/config/spotify.ts
import * as AuthSession from "expo-auth-session";

// ✅ Read client ID from environment
const SPOTIFY_CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? "";

if (!SPOTIFY_CLIENT_ID) {
  console.error("❌ Missing EXPO_PUBLIC_SPOTIFY_CLIENT_ID in .env");
}

// ✅ Spotify OAuth scopes
export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-top-read",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-recently-played",
  "user-read-playback-state",
  "user-modify-playback-state",
];

// ✅ Generate redirect URI dynamically for Expo Go / tunnel
export const SPOTIFY_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "lyrafy",  // must match app.json scheme
  path: "redirect",
  useProxy: true,     // essential for Expo Go / tunnel
});

// ✅ Build full Spotify OAuth URL (PKCE flow)
export const getSpotifyAuthUrl = (codeChallenge: string) => {
  const scope = encodeURIComponent(SPOTIFY_SCOPES.join(" "));
  return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(
    SPOTIFY_REDIRECT_URI
  )}&scope=${scope}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
};

// ✅ Export config object
export const SPOTIFY_CONFIG = {
  CLIENT_ID: SPOTIFY_CLIENT_ID,
  REDIRECT_URI: SPOTIFY_REDIRECT_URI,
  SCOPES: SPOTIFY_SCOPES,
};

// Optional sanity check
if (!SPOTIFY_CONFIG.CLIENT_ID) console.error("❌ SPOTIFY_CONFIG.CLIENT_ID missing");
if (!SPOTIFY_CONFIG.REDIRECT_URI) console.error("❌ SPOTIFY_CONFIG.REDIRECT_URI missing");
