import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { spotifyService } from "./spotifyService";
import { useAuthStore } from "../state/authStore";
import { SPOTIFY_CONFIG } from "../config/spotify";

WebBrowser.maybeCompleteAuthSession();

const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

class AuthService {
  async authenticateWithSpotify(): Promise<boolean> {
    try {
      if (!SPOTIFY_CONFIG.CLIENT_ID) {
        console.error("❌ Missing SPOTIFY_CLIENT_ID in .env");
        return false;
      }

      // ✅ Create Auth Request (Expo handles PKCE internally)
      const request = new AuthSession.AuthRequest({
        clientId: SPOTIFY_CONFIG.CLIENT_ID,
        scopes: SPOTIFY_CONFIG.SCOPES,
        redirectUri: SPOTIFY_CONFIG.REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true, // ✅ Crucial for code_verifier/code_challenge
      });

      await request.makeAuthUrlAsync(SPOTIFY_DISCOVERY);

      console.log("Generated request:", request);
      console.log("Generated code_verifier:", request.codeVerifier);
      console.log("Redirect URI →", SPOTIFY_CONFIG.REDIRECT_URI);

      // ✅ Launch Spotify Login
      const result = await request.promptAsync(SPOTIFY_DISCOVERY, {
        useProxy: true,
        preferEphemeralSession: true, // ✅ Forces a fresh login every time
      });

      if (result.type !== "success" || !result.params?.code) {
        console.error("❌ Spotify login failed:", result);
        return false;
      }

      // ✅ Exchange authorization code for tokens
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: SPOTIFY_CONFIG.CLIENT_ID,
          code: result.params.code,
          redirectUri: SPOTIFY_CONFIG.REDIRECT_URI,
          extraParams: {
            code_verifier: request.codeVerifier!,
          },
        },
        SPOTIFY_DISCOVERY
      );

      if (!tokenResponse?.accessToken) {
        console.error("❌ Failed to obtain Spotify tokens:", tokenResponse);
        return false;
      }

      // ✅ Save tokens securely
      await spotifyService.saveTokens(
        tokenResponse.accessToken,
        tokenResponse.refreshToken ?? ""
      );

      // ✅ Fetch user profile
      const user = await spotifyService.getCurrentUser();

      // ✅ Update global auth store
      useAuthStore.getState().setSpotifyAuth(
        tokenResponse.accessToken,
        tokenResponse.refreshToken ?? "",
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
      await spotifyService.clearTokens();
      useAuthStore.getState().logout();
      await WebBrowser.dismissBrowser();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async refreshSpotifyToken(): Promise<boolean> {
    try {
      const ok = await spotifyService.refreshAccessToken();
      if (!ok) console.warn("⚠️ Spotify token refresh failed");
      return ok;
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
