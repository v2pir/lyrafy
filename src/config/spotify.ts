// Spotify Configuration
// To use this app with Spotify, you need to:
// 1. Go to https://developer.spotify.com/dashboard
// 2. Create a new app
// 3. Add your redirect URI (for development: exp://localhost:8081/--/auth)
// 4. Copy your Client ID and Client Secret
// 5. Replace the values below

export const SPOTIFY_CONFIG = {
  CLIENT_ID: "your_spotify_client_id_here", // Replace with your Spotify Client ID
  REDIRECT_URI: "exp://localhost:8081/--/auth", // Update for production
  SCOPES: [
    "user-read-private",
    "user-read-email",
    "user-top-read",
    "user-library-read",
    "user-library-modify",
    "playlist-read-private",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-recently-played",
  ],
};

// For production, you'll also need to handle the Client Secret securely
// Consider using a backend service for token exchange in production