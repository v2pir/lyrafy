const BACKEND_URL = 'https://lyrafy-backend.loca.lt';

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

class DeezerServiceBackend {
  async searchTracks(query: string, limit: number = 20): Promise<DeezerTrack[]> {
    try {
      const response = await fetch(`${BACKEND_URL}/deezer/search?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tracks || [];
    } catch (error) {
      console.error("Error searching Deezer tracks:", error);
      return [];
    }
  }

  async getTrack(trackId: string): Promise<DeezerTrack | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/deezer/track/${trackId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.track || null;
    } catch (error) {
      console.error("Error getting Deezer track:", error);
      return null;
    }
  }

  async getPreviewUrl(trackId: string): Promise<string | null> {
    try {
      const response = await fetch(`${BACKEND_URL}/deezer/preview/${trackId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.preview_url || null;
    } catch (error) {
      console.error("Error getting Deezer preview:", error);
      return null;
    }
  }

  async searchTracksBySpotifyInfo(spotifyTrack: any): Promise<DeezerTrack | null> {
    try {
      // Create search query from Spotify track info
      const artistName = spotifyTrack.artists?.[0]?.name || "";
      const trackName = spotifyTrack.name || "";
      
      if (!artistName || !trackName) {
        return null;
      }

      // Search with artist and track name
      const query = `artist:"${artistName}" track:"${trackName}"`;
      const tracks = await this.searchTracks(query, 5);
      
      if (tracks.length === 0) {
        // Fallback to simple search
        const fallbackQuery = `${artistName} ${trackName}`;
        const fallbackTracks = await this.searchTracks(fallbackQuery, 5);
        return fallbackTracks[0] || null;
      }

      return tracks[0];
    } catch (error) {
      console.error("Error searching Deezer for Spotify track:", error);
      return null;
    }
  }

  /**
   * Convert Deezer track to Spotify-like format for compatibility
   */
  convertToSpotifyFormat(deezerTrack: DeezerTrack): any {
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

export const deezerServiceBackend = new DeezerServiceBackend();
