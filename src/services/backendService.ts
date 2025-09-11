import { SpotifyTrack } from '../types/music';

const BACKEND_URL = 'https://lyrafy-backend.loca.lt';

export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class BackendService {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<BackendResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`Backend request failed for ${endpoint}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    const response = await this.makeRequest('/health');
    return response.success;
  }

  // Spotify API endpoints




  // Deezer API endpoints
  async searchDeezerTracks(query: string, limit: number = 20): Promise<any[]> {
    const response = await this.makeRequest<{ tracks: any[] }>(
      `/deezer/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    return response.data?.tracks || [];
  }

  async getDeezerTrack(trackId: string): Promise<any | null> {
    const response = await this.makeRequest<{ track: any }>(`/deezer/track/${trackId}`);
    return response.data?.track || null;
  }

  async getDeezerPreview(trackId: string): Promise<string | null> {
    const response = await this.makeRequest<{ preview_url: string }>(`/deezer/preview/${trackId}`);
    return response.data?.preview_url || null;
  }

  // AI Music Service endpoints

  async getRecommendations(
    userId: string,
    vibeMode: string,
    limit: number = 50,
    excludeTrackIds: string[] = []
  ): Promise<any> {
    const response = await this.makeRequest('/get-recommendations', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        vibe_mode: vibeMode,
        limit,
        exclude_track_ids: excludeTrackIds,
      }),
    });
    return response.data;
  }

  async recordInteraction(
    userId: string,
    trackId: string,
    action: 'like' | 'dislike' | 'skip',
    timestamp?: number
  ): Promise<void> {
    await this.makeRequest('/record-interaction', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        track_id: trackId,
        action,
        timestamp: timestamp || Date.now() / 1000,
      }),
    });
  }

  async getUserProfileById(userId: string): Promise<any | null> {
    const response = await this.makeRequest(`/user-profile/${userId}`);
    return response.data || null;
  }

  async retrainModel(userId: string): Promise<boolean> {
    const response = await this.makeRequest<{ retrained: boolean }>(`/retrain-model/${userId}`, {
      method: 'POST',
    });
    return response.data?.retrained || false;
  }

  // Authentication methods
  async getAuthorizationUrl(): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/authorize`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting authorization URL:", error);
      throw error;
    }
  }

  async exchangeCodeForTokens(code: string, sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, session_id: sessionId }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error refreshing access token:", error);
      throw error;
    }
  }

  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/profile?access_token=${accessToken}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return data.valid;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }

  // Spotify methods
  async getSpotifyUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/user-profile?access_token=${accessToken}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error getting Spotify user profile:", error);
      throw error;
    }
  }

  async getSpotifyUserTopTracks(accessToken: string, timeRange: string = "medium_term", limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/user-top-tracks?access_token=${accessToken}&time_range=${timeRange}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error("Error getting user top tracks:", error);
      return [];
    }
  }

  async getSpotifyUserTopArtists(accessToken: string, timeRange: string = "medium_term", limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/user-top-artists?access_token=${accessToken}&time_range=${timeRange}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.artists;
    } catch (error) {
      console.error("Error getting user top artists:", error);
      return [];
    }
  }

  async getSpotifyUserPlaylists(accessToken: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/user-playlists?access_token=${accessToken}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.playlists;
    } catch (error) {
      console.error("Error getting user playlists:", error);
      return [];
    }
  }

  async getSpotifyPlaylistTracks(accessToken: string, playlistId: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/playlist-tracks?access_token=${accessToken}&playlist_id=${playlistId}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error("Error getting playlist tracks:", error);
      return [];
    }
  }

  async createSpotifyPlaylist(accessToken: string, name: string, description: string = "", isPublic: boolean = false): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/create-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          name,
          description,
          public: isPublic
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating playlist:", error);
      throw error;
    }
  }

  async addTracksToSpotifyPlaylist(accessToken: string, playlistId: string, trackUris: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/add-tracks-to-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          playlist_id: playlistId,
          track_uris: trackUris
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error adding tracks to playlist:", error);
      return false;
    }
  }

  async removeTracksFromSpotifyPlaylist(accessToken: string, playlistId: string, trackUris: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/remove-tracks-from-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          playlist_id: playlistId,
          track_uris: trackUris
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error removing tracks from playlist:", error);
      return false;
    }
  }

  async searchSpotifyTracks(query: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/search?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks;
    } catch (error) {
      console.error("Error searching tracks:", error);
      return [];
    }
  }

  async getSpotifyAudioFeatures(trackIds: string[]): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/spotify/audio-features`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ track_ids: trackIds }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.features;
    } catch (error) {
      console.error("Error getting audio features:", error);
      return [];
    }
  }

  // AI Music Analysis methods
  async analyzeMusicTaste(userId: string, topTracks: any[]): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/ai/analyze-taste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          top_tracks: topTracks
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error analyzing music taste:", error);
      throw error;
    }
  }

  async findSimilarTracksAI(userId: string, availableTracks: any[], excludeTrackIds: string[] = [], limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/ai/find-similar-tracks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          available_tracks: availableTracks,
          exclude_track_ids: excludeTrackIds,
          limit
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.similar_tracks;
    } catch (error) {
      console.error("Error finding similar tracks:", error);
      return [];
    }
  }

  async generateAIVibeName(userId: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/ai/generate-vibe-name?user_id=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.name;
    } catch (error) {
      console.error("Error generating vibe name:", error);
      return "Your Vibe";
    }
  }

  async getTasteProfile(userId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/ai/taste-profile?user_id=${userId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.profile;
    } catch (error) {
      console.error("Error getting taste profile:", error);
      return null;
    }
  }
}

export const backendService = new BackendService();
