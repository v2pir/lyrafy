import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { spotifyService } from "./spotifyService";
import { useAuthStore } from "../state/authStore";

WebBrowser.maybeCompleteAuthSession();

import { SPOTIFY_CONFIG } from "../config/spotify";

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = SPOTIFY_CONFIG.CLIENT_ID;
const SPOTIFY_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: "vibeswipe",
  path: "auth",
});

const SPOTIFY_SCOPES = SPOTIFY_CONFIG.SCOPES;

class AuthService {
  async authenticateWithSpotify(): Promise<boolean> {
    try {
      const discovery = await AuthSession.fetchDiscoveryAsync("https://accounts.spotify.com");
      
      const request = new AuthSession.AuthRequest({
        clientId: SPOTIFY_CLIENT_ID,
        scopes: SPOTIFY_SCOPES,
        usePKCE: true,
        redirectUri: SPOTIFY_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await request.promptAsync(discovery);

      if (result.type === "success" && result.params.code) {
        // Exchange code for tokens
        const tokenResponse = await AuthSession.exchangeCodeAsync(
          {
            clientId: SPOTIFY_CLIENT_ID,
            code: result.params.code,
            redirectUri: SPOTIFY_REDIRECT_URI,
            extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
          },
          discovery
        );

        if (tokenResponse.accessToken && tokenResponse.refreshToken) {
          // Save tokens securely
          await spotifyService.saveTokens(
            tokenResponse.accessToken,
            tokenResponse.refreshToken
          );

          // Get user info
          const user = await spotifyService.getCurrentUser();

          // Update auth store
          useAuthStore.getState().setSpotifyAuth(
            tokenResponse.accessToken,
            tokenResponse.refreshToken,
            user
          );

          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Spotify authentication error:", error);
      return false;
    }
  }

  async authenticateWithAppleMusic(): Promise<boolean> {
    try {
      // Apple Music authentication would require MusicKit setup
      // This is a placeholder implementation
      console.log("Apple Music authentication not yet implemented");
      
      // For demo purposes, we'll simulate success
      // In a real app, you'd implement MusicKit authentication here
      useAuthStore.getState().setAppleMusicAuth("demo_apple_token");
      
      return true;
    } catch (error) {
      console.error("Apple Music authentication error:", error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Clear tokens from secure storage
      await spotifyService.clearTokens();
      
      // Clear auth store
      useAuthStore.getState().logout();
      
      // Revoke tokens if needed
      await WebBrowser.dismissBrowser();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async refreshSpotifyToken(): Promise<boolean> {
    try {
      return await spotifyService.refreshAccessToken();
    } catch (error) {
      console.error("Token refresh error:", error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  getConnectedServices(): ("spotify" | "apple")[] {
    return useAuthStore.getState().connectedServices;
  }
}

export const authService = new AuthService();