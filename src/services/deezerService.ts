// src/services/deezerService.ts
import { SpotifyTrack } from "../types/music";

export interface DeezerTrack {
  id: string;
  title: string;
  artist: {
    id: string;
    name: string;
  };
  album: {
    id: string;
    title: string;
    cover_medium: string;
  };
  duration: number;
  preview: string; // This is the preview URL
  link: string;
}

export interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
}

class DeezerService {
  private readonly BASE_URL = "https://api.deezer.com";

  /**
   * Search for tracks on Deezer
   */
  async searchTracks(query: string, limit: number = 20): Promise<DeezerTrack[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `${this.BASE_URL}/search/track?q=${encodedQuery}&limit=${limit}`;
      
      console.log("🎵 Searching Deezer for:", query);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Deezer API error: ${response.status}`);
      }
      
      const data: DeezerSearchResponse = await response.json();
      console.log(`✅ Found ${data.data.length} tracks on Deezer`);
      
      return data.data;
    } catch (error) {
      console.error("❌ Deezer search failed:", error);
      return [];
    }
  }

  /**
   * Search for tracks by artist
   */
  async searchTracksByArtist(artistName: string, limit: number = 20): Promise<DeezerTrack[]> {
    return this.searchTracks(`artist:"${artistName}"`, limit);
  }

  /**
   * Get recommendations based on Spotify track
   */
  async getRecommendationsForSpotifyTrack(spotifyTrack: SpotifyTrack): Promise<DeezerTrack[]> {
    // Search for the same track on Deezer
    const query = `${spotifyTrack.name} ${spotifyTrack.artists[0]?.name}`;
    return this.searchTracks(query, 10);
  }

  /**
   * Get recommendations for a vibe mode
   */
  async getRecommendationsForVibeMode(vibeMode: string): Promise<DeezerTrack[]> {
    const searchTerms = [
      `${vibeMode} music`,
      `popular ${vibeMode}`,
      `${vibeMode} hits`,
      `trending ${vibeMode}`
    ];

    const allTracks: DeezerTrack[] = [];
    
    for (const term of searchTerms) {
      try {
        const tracks = await this.searchTracks(term, 15);
        allTracks.push(...tracks);
      } catch (err) {
        console.warn(`Failed to search Deezer for "${term}":`, err);
      }
    }

    // Remove duplicates by ID first, then by name
    const uniqueByIdTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id) && track.preview
    );
    
    // Remove duplicates by name (case-insensitive)
    const seenNames = new Set<string>();
    const uniqueTracks = uniqueByIdTracks.filter(track => {
      const normalizedName = track.title.toLowerCase().trim();
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        return true;
      }
      return false;
    });

    console.log(`🎵 Found ${uniqueTracks.length} unique tracks with previews on Deezer`);
    return uniqueTracks.slice(0, 50);
  }

  /**
   * Convert Deezer track to Spotify-like format for compatibility
   */
  convertToSpotifyFormat(deezerTrack: DeezerTrack): SpotifyTrack {
    return {
      id: `deezer_${deezerTrack.id}`,
      name: deezerTrack.title,
      artists: [{
        id: deezerTrack.artist.id,
        name: deezerTrack.artist.name,
        external_urls: { spotify: deezerTrack.link },
        uri: `deezer:artist:${deezerTrack.artist.id}`,
      }],
      album: {
        id: deezerTrack.album.id,
        name: deezerTrack.album.title,
        artists: [{
          id: deezerTrack.artist.id,
          name: deezerTrack.artist.name,
          external_urls: { spotify: deezerTrack.link },
          uri: `deezer:artist:${deezerTrack.artist.id}`,
        }],
        images: [{
          height: 300,
          width: 300,
          url: deezerTrack.album.cover_medium,
        }],
        release_date: new Date().toISOString().split('T')[0], // Fallback date
        external_urls: { spotify: deezerTrack.link },
        uri: `deezer:album:${deezerTrack.album.id}`,
      },
      duration_ms: deezerTrack.duration * 1000,
      preview_url: deezerTrack.preview, // This is the key part!
      external_urls: { spotify: deezerTrack.link },
      uri: `deezer:track:${deezerTrack.id}`,
      popularity: 50, // Default popularity
      explicit: false, // Deezer doesn't provide this info easily
    };
  }
}

export const deezerService = new DeezerService();
