import { SpotifyTrack, SpotifyPlaylist, VibeMode } from "../types/music";
import { spotifyService } from './spotifyService';
import { backendService } from './backendService';

const BACKEND_URL = 'https://lyrafy-backend.loca.lt';

class SpotifyServiceBackend {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  // Token management
  async getAccessToken(): Promise<string | null> {
    return this.accessToken;
  }

  async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
  }

  async getRefreshToken(): Promise<string | null> {
    return this.refreshToken;
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
  }

  async isTokenValid(): Promise<boolean> {
    if (!this.accessToken) return false;
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) return false;
    return true;
  }

  // Authentication
  async getAuthUrl(): Promise<string> {
    const result = await backendService.getAuthorizationUrl();
    if (!result.auth_url) {
      throw new Error("Failed to get Spotify auth URL");
    }
    return result.auth_url;
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    // Generate a session ID for this request
    const sessionId = Math.random().toString(36).substring(7);
    const result = await backendService.exchangeCodeForTokens(code, sessionId);
    if (result.access_token) {
      this.accessToken = result.access_token;
      this.refreshToken = result.refresh_token;
      this.tokenExpiry = Date.now() + (result.expires_in * 1000);
    }
    return result;
  }

  // API calls
  async getUserTopTracks(timeRange: string = "medium_term", limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/user-top-tracks?time_range=${timeRange}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks || [];
    } catch (error) {
      console.error("Error getting user top tracks:", error);
      return [];
    }
  }

  async getRecommendationsForVibeMode(vibeMode: VibeMode, topTracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
    try {
      // First test basic connectivity
      console.log("🔗 Testing connectivity to:", `${BACKEND_URL}/health`);
      try {
        const healthResponse = await fetch(`${BACKEND_URL}/health`);
        console.log("🏥 Health check status:", healthResponse.status);
        const healthData = await healthResponse.json();
        console.log("🏥 Health check data:", healthData);
      } catch (healthError) {
        console.error("🏥 Health check failed:", healthError);
      }

      console.log("🔗 Making request to:", `${BACKEND_URL}/spotify/recommendations-for-vibe`);
      console.log("📤 Request body:", { vibe_mode: vibeMode.name, user_top_tracks: topTracks });
      
      const response = await fetch(`${BACKEND_URL}/spotify/recommendations-for-vibe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vibe_mode: vibeMode.name,
          user_top_tracks: topTracks
        }),
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 Response data:", data);
      return data.tracks || [];
    } catch (error) {
      console.error("Error getting recommendations for vibe mode:", error);
      console.error("Error details:", (error as Error).message);
      console.error("Error stack:", (error as Error).stack);
      return [];
    }
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      // Get access token from the original spotify service
      const accessToken = await spotifyService.getAccessToken();
      if (!accessToken) {
        console.error("No access token available for getting playlists");
        return [];
      }

      const response = await fetch(`${BACKEND_URL}/spotify/playlists?access_token=${accessToken}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.playlists || [];
    } catch (error) {
      console.error("Error getting playlists:", error);
      return [];
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    try {
      // Get access token from the original spotify service
      const accessToken = await spotifyService.getAccessToken();
      if (!accessToken) {
        console.error("No access token available for getting playlist tracks");
        return [];
      }

      const response = await fetch(`${BACKEND_URL}/spotify/playlist/${playlistId}/tracks?access_token=${accessToken}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks || [];
    } catch (error) {
      console.error("Error getting playlist tracks:", error);
      return [];
    }
  }

  async likeTrack(trackId: string): Promise<boolean> {
    try {
      // Get access token from the original spotify service
      let accessToken = await spotifyService.getAccessToken();
      if (!accessToken) {
        console.error("No access token available for liking track");
        return false;
      }

      console.log("🔍 Initial access token:", accessToken?.substring(0, 20) + "...");

      // Try to like the track
      let response = await fetch(`${BACKEND_URL}/spotify/like-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          track_id: trackId,
          access_token: accessToken
        }),
      });

      // If token expired, try to refresh it
      if (response.status === 401) {
        console.log("🔄 Access token expired, attempting refresh...");
        console.log("🔍 Current access token:", accessToken?.substring(0, 20) + "...");
        
        // Check if we have a refresh token
        const refreshToken = await spotifyService.getRefreshToken();
        if (!refreshToken) {
          console.error("❌ No refresh token available - user needs to re-authenticate");
          return false;
        }
        
        const refreshSuccess = await spotifyService.refreshAccessToken();
        console.log("🔄 Refresh result:", refreshSuccess);
        
        if (refreshSuccess) {
          accessToken = await spotifyService.getAccessToken();
          console.log("🔄 New access token:", accessToken?.substring(0, 20) + "...");
          
          if (accessToken) {
            console.log("🔄 Retrying with new token...");
            // Retry with new token
            response = await fetch(`${BACKEND_URL}/spotify/like-track`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                track_id: trackId,
                access_token: accessToken
              }),
            });
            console.log("🔄 Retry response:", response.status);
          } else {
            console.log("❌ No new access token after refresh");
          }
        } else {
          console.log("❌ Token refresh failed");
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error("Error liking track:", error);
      return false;
    }
  }

  async unlikeTrack(trackId: string): Promise<boolean> {
    try {
      // Get access token from the original spotify service
      let accessToken = await spotifyService.getAccessToken();
      if (!accessToken) {
        console.error("No access token available for unliking track");
        return false;
      }

      // Try to unlike the track
      let response = await fetch(`${BACKEND_URL}/spotify/unlike-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          track_id: trackId,
          access_token: accessToken
        }),
      });

      // If token expired, try to refresh it
      if (response.status === 401) {
        console.log("🔄 Access token expired, attempting refresh...");
        console.log("🔍 Current access token:", accessToken?.substring(0, 20) + "...");
        
        // Check if we have a refresh token
        const refreshToken = await spotifyService.getRefreshToken();
        if (!refreshToken) {
          console.error("❌ No refresh token available - user needs to re-authenticate");
          return false;
        }
        
        const refreshSuccess = await spotifyService.refreshAccessToken();
        console.log("🔄 Refresh result:", refreshSuccess);
        
        if (refreshSuccess) {
          accessToken = await spotifyService.getAccessToken();
          console.log("🔄 New access token:", accessToken?.substring(0, 20) + "...");
          
          if (accessToken) {
            console.log("🔄 Retrying with new token...");
            // Retry with new token
            response = await fetch(`${BACKEND_URL}/spotify/unlike-track`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                track_id: trackId,
                access_token: accessToken
              }),
            });
            console.log("🔄 Retry response:", response.status);
          } else {
            console.log("❌ No new access token after refresh");
          }
        } else {
          console.log("❌ Token refresh failed");
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error("Error unliking track:", error);
      return false;
    }
  }

  async getAudioFeatures(trackIds: string[]): Promise<any[]> {
    try {
      // This would need to be implemented in the backend
      // For now, return empty array
      return [];
    } catch (error) {
      console.error("Error getting audio features:", error);
      return [];
    }
  }
}

export const spotifyServiceBackend = new SpotifyServiceBackend();
