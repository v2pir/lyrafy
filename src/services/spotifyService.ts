import * as SecureStore from "expo-secure-store";
import { 
  SpotifyTrack, 
  SpotifyUser, 
  SpotifyPlaylist, 
  SpotifyAudioFeatures,
  VibeMode 
} from "../types/music";

const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com/api/token";

class SpotifyService {
  private async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync("spotify_access_token");
    } catch (error) {
      console.error("Error getting Spotify access token:", error);
      return null;
    }
  }

  private async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync("spotify_access_token", token);
    } catch (error) {
      console.error("Error setting Spotify access token:", error);
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync("spotify_refresh_token");
    } catch (error) {
      console.error("Error getting Spotify refresh token:", error);
      return null;
    }
  }

  private async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync("spotify_refresh_token", token);
    } catch (error) {
      console.error("Error setting Spotify refresh token:", error);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    
    if (!accessToken) {
      throw new Error("No access token available");
    }

    const response = await fetch(`${SPOTIFY_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        return this.makeRequest(endpoint, options);
      }
      throw new Error("Authentication failed");
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      // Note: In production, you'd need your Spotify client credentials
      // For now, this is a placeholder implementation
      const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          // client_id: YOUR_CLIENT_ID,
          // client_secret: YOUR_CLIENT_SECRET,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await this.setAccessToken(data.access_token);
        if (data.refresh_token) {
          await this.setRefreshToken(data.refresh_token);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    }
  }

  async getCurrentUser(): Promise<SpotifyUser> {
    return this.makeRequest<SpotifyUser>("/me");
  }

  async getUserTopTracks(timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"): Promise<SpotifyTrack[]> {
    const response = await this.makeRequest<{ items: SpotifyTrack[] }>(`/me/top/tracks?time_range=${timeRange}&limit=50`);
    return response.items;
  }

  async getUserTopArtists(timeRange: "short_term" | "medium_term" | "long_term" = "medium_term") {
    const response = await this.makeRequest<{ items: any[] }>(`/me/top/artists?time_range=${timeRange}&limit=50`);
    return response.items;
  }

  async getRecommendations(params: {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    targetAudioFeatures?: Partial<SpotifyAudioFeatures>;
    limit?: number;
  }): Promise<SpotifyTrack[]> {
    const queryParams = new URLSearchParams();
    
    if (params.seedTracks?.length) {
      queryParams.append("seed_tracks", params.seedTracks.slice(0, 5).join(","));
    }
    if (params.seedArtists?.length) {
      queryParams.append("seed_artists", params.seedArtists.slice(0, 5).join(","));
    }
    if (params.seedGenres?.length) {
      queryParams.append("seed_genres", params.seedGenres.slice(0, 5).join(","));
    }
    
    // Add target audio features
    if (params.targetAudioFeatures) {
      Object.entries(params.targetAudioFeatures).forEach(([key, value]) => {
        if (value !== undefined && key !== "id" && key !== "duration_ms" && key !== "time_signature") {
          queryParams.append(`target_${key}`, value.toString());
        }
      });
    }
    
    queryParams.append("limit", (params.limit || 20).toString());
    
    const response = await this.makeRequest<{ tracks: SpotifyTrack[] }>(`/recommendations?${queryParams}`);
    return response.tracks;
  }

  async getRecommendationsForVibeMode(vibeMode: VibeMode, userTopTracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
    const seedTracks = userTopTracks.slice(0, 3).map(t => t.id);
    const targetFeatures: Partial<SpotifyAudioFeatures> = {};
    
    // Convert vibe mode audio features to target values
    if (vibeMode.audioFeatures.energy) {
      const [min, max] = vibeMode.audioFeatures.energy;
      targetFeatures.energy = (min + max) / 2;
    }
    if (vibeMode.audioFeatures.valence) {
      const [min, max] = vibeMode.audioFeatures.valence;
      targetFeatures.valence = (min + max) / 2;
    }
    if (vibeMode.audioFeatures.danceability) {
      const [min, max] = vibeMode.audioFeatures.danceability;
      targetFeatures.danceability = (min + max) / 2;
    }
    if (vibeMode.audioFeatures.tempo) {
      const [min, max] = vibeMode.audioFeatures.tempo;
      targetFeatures.tempo = (min + max) / 2;
    }
    
    return this.getRecommendations({
      seedTracks,
      targetAudioFeatures: targetFeatures,
      limit: 50,
    });
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    const response = await this.makeRequest<{ items: SpotifyPlaylist[] }>("/me/playlists?limit=50");
    return response.items;
  }

  async createPlaylist(name: string, description?: string): Promise<SpotifyPlaylist> {
    const user = await this.getCurrentUser();
    return this.makeRequest<SpotifyPlaylist>(`/users/${user.id}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description: description || "",
        public: false,
      }),
    });
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({
        uris: trackUris,
      }),
    });
  }

  async searchTracks(query: string, limit: number = 20): Promise<SpotifyTrack[]> {
    const response = await this.makeRequest<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
    );
    return response.tracks.items;
  }

  async getAudioFeatures(trackIds: string[]): Promise<SpotifyAudioFeatures[]> {
    const response = await this.makeRequest<{ audio_features: SpotifyAudioFeatures[] }>(
      `/audio-features?ids=${trackIds.join(",")}`
    );
    return response.audio_features;
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setAccessToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync("spotify_access_token");
      await SecureStore.deleteItemAsync("spotify_refresh_token");
    } catch (error) {
      console.error("Error clearing Spotify tokens:", error);
    }
  }
}

export const spotifyService = new SpotifyService();