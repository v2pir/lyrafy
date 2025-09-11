import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "../state/authStore";
import { SPOTIFY_CONFIG } from "../config/spotify";
import { backendService } from "./backendService";

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

class AuthServiceBackend {
  async authenticateWithSpotify(): Promise<boolean> {
    try {
      if (!SPOTIFY_CONFIG.CLIENT_ID) {
        console.error("❌ Missing SPOTIFY_CLIENT_ID in .env");
        return false;
      }

      // Get authorization URL from backend
      const authData = await backendService.getAuthorizationUrl();
      const authUrl = authData.auth_url;
      const sessionId = authData.session_id;

      console.log("Generated auth URL:", authUrl);
      console.log("Session ID:", sessionId);

      // Launch Spotify Login using the backend-generated URL
      const result = await AuthSession.startAsync({
        authUrl: authUrl,
        returnUrl: SPOTIFY_CONFIG.REDIRECT_URI,
      });

      if (result.type !== "success" || !result.params?.code) {
        console.error("❌ Spotify login failed:", result);
        return false;
      }

      // Exchange authorization code for tokens via backend
      const tokenResponse = await backendService.exchangeCodeForTokens(
        result.params.code,
        sessionId
      );

      if (!tokenResponse?.access_token) {
        console.error("❌ Failed to obtain Spotify tokens:", tokenResponse);
        return false;
      }

      // Save tokens locally
      await this.saveTokens(
        tokenResponse.access_token,
        tokenResponse.refresh_token ?? ""
      );

      // Fetch user profile via backend
      const user = await backendService.getUserProfile(tokenResponse.access_token);

      // Update global auth store
      useAuthStore.getState().setSpotifyAuth(
        tokenResponse.access_token,
        tokenResponse.refresh_token ?? "",
        user
      );

      console.log("🎧 Spotify Auth Success:", user.display_name);
      return true;
    } catch (error) {
      console.error("Spotify authentication error:", error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.clearTokens();
      useAuthStore.getState().logout();
      await WebBrowser.dismissBrowser();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async refreshSpotifyToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.warn("⚠️ No refresh token found");
        return false;
      }

      const tokenResponse = await backendService.refreshAccessToken(refreshToken);
      
      if (tokenResponse?.access_token) {
        await this.setAccessToken(tokenResponse.access_token);
        
        // Some refresh responses also return a new refresh token
        if (tokenResponse.refresh_token) {
          await this.setRefreshToken(tokenResponse.refresh_token);
        }

        console.log("✅ Spotify token refreshed successfully");
        return true;
      }

      console.error("❌ Failed to refresh token, no access token returned:", tokenResponse);
      return false;
    } catch (err) {
      console.error("Error refreshing token:", err);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  }

  getConnectedServices(): ("spotify" | "apple")[] {
    return useAuthStore.getState().connectedServices;
  }

  // Token storage helpers
  async getAccessToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem("spotify_access_token").catch(() => null);
    return token;
  }

  async setAccessToken(token: string): Promise<void> {
    await AsyncStorage.setItem("spotify_access_token", token).catch(console.error);
  }

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem("spotify_refresh_token").catch(() => null);
  }

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem("spotify_refresh_token", token).catch(console.error);
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    console.log("💾 Saving tokens:", { accessToken, refreshToken });
    await this.setAccessToken(accessToken);
    if (refreshToken) await this.setRefreshToken(refreshToken);
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem("spotify_access_token").catch(console.error);
    await AsyncStorage.removeItem("spotify_refresh_token").catch(console.error);
  }
}

export const authServiceBackend = new AuthServiceBackend();
