// src/services/spotifyService.ts
import * as SecureStore from "expo-secure-store";
import {
  SpotifyTrack,
  SpotifyUser,
  SpotifyPlaylist,
  VibeMode,
} from "../types/music";
import { SPOTIFY_CONFIG } from "../config/spotify";

const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com/api/token";

class SpotifyService {
  /** --------------------------
   * TOKEN STORAGE HELPERS
   * ------------------------- */
  public async getAccessToken(): Promise<string | null> {
    const token = await SecureStore.getItemAsync("spotify_access_token").catch(() => null);
    console.log("🔑 Retrieved token:", token);
    return token;
  }

  public async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync("spotify_access_token", token).catch(console.error);
    console.log("🔑 Set Access token:", token);
  }

  public async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync("spotify_refresh_token").catch(() => null);
  }

  public async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync("spotify_refresh_token", token).catch(console.error);
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    console.log("💾 Saving tokens:", { accessToken, refreshToken });
    await this.setAccessToken(accessToken);
    if (refreshToken) await this.setRefreshToken(refreshToken);
    console.log("🔑 Refresh Token:", refreshToken);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync("spotify_access_token").catch(console.error);
    await SecureStore.deleteItemAsync("spotify_refresh_token").catch(console.error);
  }

  /** --------------------------
   * GENERIC API CALL
   * ------------------------- */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error("No access token available");

    const url = endpoint.startsWith("http") ? endpoint : `${SPOTIFY_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Handle expired token
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) return this.makeRequest<T>(endpoint, options);
      throw new Error("Authentication failed");
    }

    // Handle other API errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Spotify API error ${response.status}:`, errorText);
      throw new Error(`Spotify API error: ${response.status}`);
    }

    // Handle empty responses (like 204 No Content for DELETE requests)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return {} as T;
    }

    // Check if response has content before trying to parse JSON
    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  /** --------------------------
   * TOKEN REFRESH (PKCE SAFE)
   * ------------------------- */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      console.error("⚠️ No refresh token found");
      return false;
    }

    try {
      const response = await fetch(SPOTIFY_ACCOUNTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token", // ✅ required for PKCE
          refresh_token: refreshToken,
          client_id: SPOTIFY_CONFIG.CLIENT_ID, // ✅ PKCE needs client_id, not secret
        }).toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("❌ Failed to refresh token:", data);
        return false;
      }

      if (data.access_token) {
        await this.setAccessToken(data.access_token);

        // Some refresh responses also return a new refresh token
        if (data.refresh_token) {
          await this.setRefreshToken(data.refresh_token);
        }

        console.log("✅ Spotify token refreshed successfully");
        return true;
      }

      console.error("❌ Failed to refresh token, no access token returned:", data);
      return false;
    } catch (err) {
      console.error("Error refreshing token:", err);
      return false;
    }
  }


  /** --------------------------
   * SPOTIFY API METHODS
   * ------------------------- */
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.makeRequest<SpotifyUser>("/me");
  }

  async getUserTopTracks(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"
  ): Promise<SpotifyTrack[]> {
    const endpoint = `/me/top/tracks?time_range=${timeRange}&limit=50`;
    console.log("🎯 Fetching user top tracks from endpoint:", endpoint);

    try {
      const res = await this.makeRequest<{ items: SpotifyTrack[] }>(endpoint);
      console.log("✅ Top tracks response items:", res.items?.length);
      return res.items ?? [];
    } catch (err: any) {
      console.error("❌ Failed to fetch top tracks:", err);
      // Return empty array to prevent breaking recommendations
      return [];
    }
  }

  async getUserTopArtists(
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term"
  ) {
    const res = await this.makeRequest<{ items: any[] }>(
      `/me/top/artists?time_range=${timeRange}&limit=50`
    );
    return res.items;
  }

  async getRecommendations(params: { query?: string; limit?: number }): Promise<SpotifyTrack[]> {
    const query = params.query || "pop"; // fallback
    const limit = params.limit || 50;

    console.log("🎯 Searching Spotify for:", query);

    try {
      const tracks = await this.searchTracks(query, limit);
      console.log(`✅ Found ${tracks.length} tracks for query "${query}"`);
      return tracks;
    } catch (err: any) {
      console.error("❌ Spotify search failed:", err.message);
      return [];
    }
  }

  async getRecommendationsBasedOnTracks(userTopTracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
    console.log("🎯 Finding songs similar to your top tracks using metadata analysis");
    
    const allTracks: SpotifyTrack[] = [];
    
    // Extract characteristics from your top tracks (no audio features needed)
    const characteristics = this.analyzeTrackCharacteristics(userTopTracks);
    console.log("🎵 Your music characteristics:", characteristics);
    
    // Search for similar artists from your top tracks
    const topArtists = [...new Set(userTopTracks.slice(0, 20).map(t => t.artists[0]?.name).filter(Boolean))];
    
    for (const artist of topArtists.slice(0, 10)) { // Top 10 artists
      try {
        const tracks = await this.searchTracks(`artist:"${artist}"`, 30);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} tracks by "${artist}"`);
      } catch (err) {
        console.warn(`Failed to search for artist "${artist}":`, err);
      }
    }
    
    // Search for similar genres based on your top tracks
    const genreTerms = this.extractGenreTerms(userTopTracks);
    for (const genre of genreTerms.slice(0, 6)) {
      try {
        const tracks = await this.searchTracks(genre, 25);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} tracks for genre "${genre}"`);
      } catch (err) {
        console.warn(`Failed to search for genre "${genre}":`, err);
      }
    }
    
    // Search for tracks with similar popularity ranges
    const popularityRanges = this.getPopularityRanges(userTopTracks);
    for (const range of popularityRanges) {
      try {
        const tracks = await this.searchTracks(`year:${range.year}`, 20);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} tracks from ${range.year}`);
      } catch (err) {
        console.warn(`Failed to search for year ${range.year}:`, err);
      }
    }
    
    // Search for tracks with similar popularity levels
    const avgPopularity = userTopTracks.reduce((sum, track) => sum + track.popularity, 0) / userTopTracks.length;
    if (avgPopularity > 70) {
      // High popularity - search for popular tracks
      try {
        const tracks = await this.searchTracks("popular", 20);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} popular tracks`);
      } catch (err) {
        console.warn(`Failed to search for popular tracks:`, err);
      }
    } else if (avgPopularity < 30) {
      // Low popularity - search for indie/underground tracks
      try {
        const tracks = await this.searchTracks("indie", 20);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} indie tracks`);
      } catch (err) {
        console.warn(`Failed to search for indie tracks:`, err);
      }
    }
    
    // Remove duplicates and return up to 300 tracks
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    
    console.log(`Found ${uniqueTracks.length} unique similar tracks`);
    return uniqueTracks.slice(0, 300);
  }

  async getRecommendationsForVibeMode(
    vibeMode: VibeMode | null,
    userTopTracks: SpotifyTrack[]
  ): Promise<SpotifyTrack[]> {
    if (!vibeMode) {
      console.log("⚠️ No vibe mode provided — returning user's top tracks");
      return userTopTracks.slice(0, 50);
    }

    console.log("🎯 Getting tracks for vibe mode:", vibeMode.name);
    
    // Start with empty array - only vibe-specific tracks
    const allTracks: SpotifyTrack[] = [];
    
    // Add vibe-specific searches
    const vibeSearches = [
      `${vibeMode.name} music`,
      `popular ${vibeMode.name}`,
      `${vibeMode.name} hits`,
      `trending ${vibeMode.name}`,
      `best ${vibeMode.name} songs`,
      `${vibeMode.name} 2024`,
      `${vibeMode.name} 2023`,
      `top ${vibeMode.name} artists`
    ];
    
    // Search for vibe-specific tracks
    for (const searchTerm of vibeSearches) {
      try {
        const tracks = await this.searchTracks(searchTerm, 30);
        allTracks.push(...tracks);
        console.log(`Found ${tracks.length} tracks for "${searchTerm}"`);
      } catch (err) {
        console.warn(`Failed to search for "${searchTerm}":`, err);
      }
    }
    
    // Add some popular tracks by searching for well-known artists
    const popularArtists = [
      "Drake", "Taylor Swift", "The Weeknd", "Billie Eilish", "Ariana Grande",
      "Ed Sheeran", "Post Malone", "Dua Lipa", "Olivia Rodrigo", "Harry Styles",
      "Bad Bunny", "Travis Scott", "Kendrick Lamar", "J. Cole", "Future"
    ];
    
    for (const artist of popularArtists) {
      try {
        const tracks = await this.searchTracks(`artist:${artist}`, 25);
        allTracks.push(...tracks);
      } catch (err) {
        console.warn(`Failed to search for artist "${artist}":`, err);
      }
    }
    
    // Remove duplicates and return up to 300 tracks
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    );
    
    console.log(`Found ${uniqueTracks.length} unique tracks for vibe mode`);
    return uniqueTracks.slice(0, 300);
  }

  async getUserPlaylists(): Promise<SpotifyPlaylist[]> {
    try {
      const res = await this.makeRequest<{ items: SpotifyPlaylist[] }>("/me/playlists?limit=50");
      return res.items || [];
    } catch (error) {
      console.error("Error fetching user playlists:", error);
      return [];
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    try {
      const res = await this.makeRequest<{ items: { track: SpotifyTrack }[] }>(`/playlists/${playlistId}/tracks?limit=100`);
      // Filter out null tracks (some playlists have null tracks)
      return res.items?.map(item => item.track).filter(track => track && track.id) || [];
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
      return [];
    }
  }

  async createPlaylist(name: string, description?: string): Promise<SpotifyPlaylist> {
    const user = await this.getCurrentUser();
    return this.makeRequest<SpotifyPlaylist>(`/users/${user.id}/playlists`, {
      method: "POST",
      body: JSON.stringify({ name, description: description || "", public: false }),
    });
  }

  async addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: trackUris }),
    });
  }

  async removeTracksFromPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
    await this.makeRequest(`/playlists/${playlistId}/tracks`, {
      method: "DELETE",
      body: JSON.stringify({ uris: trackUris }),
    });
  }

  async addTrackToLikedSongs(trackId: string): Promise<void> {
    await this.makeRequest(`/me/tracks`, {
      method: "PUT",
      body: JSON.stringify({ ids: [trackId] }),
    });
  }

  async removeTrackFromLikedSongs(trackId: string): Promise<void> {
    await this.makeRequest(`/me/tracks`, {
      method: "DELETE",
      body: JSON.stringify({ ids: [trackId] }),
    });
  }

  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    const res = await this.makeRequest<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
    );
    return res.tracks.items;
  }

  private analyzeTrackCharacteristics(tracks: SpotifyTrack[]): any {
    const avgPopularity = tracks.reduce((sum, track) => sum + track.popularity, 0) / tracks.length;
    
    return {
      avgPopularity,
      genres: this.extractGenreTerms(tracks),
      years: this.getPopularityRanges(tracks),
      artists: [...new Set(tracks.slice(0, 10).map(t => t.artists[0]?.name).filter(Boolean))]
    };
  }

  private getPopularityRanges(tracks: SpotifyTrack[]): { year: number; count: number }[] {
    const yearCounts: { [year: number]: number } = {};
    
    tracks.forEach(track => {
      const year = new Date(track.album.release_date).getFullYear();
      if (year && year > 1950 && year < 2030) {
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    return Object.entries(yearCounts)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  private extractGenreTerms(topTracks: SpotifyTrack[]): string[] {
    // Extract potential genre terms from track names and artists
    const genreTerms: string[] = [];
    
    for (const track of topTracks.slice(0, 10)) {
      const trackName = track.name.toLowerCase();
      const artistName = track.artists[0]?.name.toLowerCase() || "";
      
      // Common genre keywords
      const genreKeywords = [
        'pop', 'rock', 'hip hop', 'rap', 'electronic', 'edm', 'indie', 'alternative',
        'country', 'jazz', 'blues', 'classical', 'folk', 'reggae', 'funk', 'soul',
        'r&b', 'rnb', 'trap', 'house', 'techno', 'ambient', 'acoustic', 'punk'
      ];
      
      for (const keyword of genreKeywords) {
        if (trackName.includes(keyword) || artistName.includes(keyword)) {
          if (!genreTerms.includes(keyword)) {
            genreTerms.push(keyword);
          }
        }
      }
    }
    
    return genreTerms.slice(0, 5); // Return top 5 genre terms
  }
}

export const spotifyService = new SpotifyService();
