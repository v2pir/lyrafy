import { SpotifyTrack } from "../types/music";
import { backendService } from "./backendService";

export interface MusicTasteProfile {
  genres: string[];
  moods: string[];
  tempo: { min: number; max: number; average: number };
  energy: { min: number; max: number; average: number };
  danceability: { min: number; max: number; average: number };
  valence: { min: number; max: number; average: number };
  acousticness: { min: number; max: number; average: number };
  instrumentalness: { min: number; max: number; average: number };
  popularity: { min: number; max: number; average: number };
  key: number[];
  timeSignature: number[];
  artists: string[];
  decades: string[];
}

export interface SimilarTrack {
  track: SpotifyTrack;
  similarityScore: number;
  reasons: string[];
}

class AIMusicServiceBackend {
  private tasteProfile: MusicTasteProfile | null = null;

  async analyzeMusicTaste(topTracks: SpotifyTrack[]): Promise<MusicTasteProfile> {
    try {
      const userId = "user_123"; // TODO: Get actual user ID
      const result = await backendService.analyzeMusicTaste(userId, topTracks);
      
      // Create a simplified taste profile from the result
      this.tasteProfile = {
        genres: Object.keys(result.preferences?.genres || {}),
        moods: ["Diverse"], // Simplified
        tempo: { min: 0, max: 0, average: 0 },
        energy: { min: 0, max: 0, average: 0 },
        danceability: { min: 0, max: 0, average: 0 },
        valence: { min: 0, max: 0, average: 0 },
        acousticness: { min: 0, max: 0, average: 0 },
        instrumentalness: { min: 0, max: 0, average: 0 },
        popularity: { min: 0, max: 0, average: 0 },
        key: [],
        timeSignature: [],
        artists: Object.keys(result.preferences?.artists || {}),
        decades: []
      };

      return this.tasteProfile;
    } catch (error) {
      console.error("Error analyzing music taste:", error);
      throw error;
    }
  }

  async findSimilarTracks(excludeTrackIds: string[] = [], limit: number = 50): Promise<SimilarTrack[]> {
    try {
      const similarTracks = await backendService.findSimilarTracksAI("", [], excludeTrackIds, limit);
      
      // Convert to SimilarTrack format
      return similarTracks.map((track: any) => ({
        track: track,
        similarityScore: 0.8, // Default score
        reasons: ["AI Recommendation"]
      }));
    } catch (error) {
      console.error("Error finding similar tracks:", error);
      return [];
    }
  }

  generateVibeModeName(): string {
    const vibeNames = [
      "Chill Vibes", "Energy Boost", "Late Night", "Morning Coffee",
      "Workout Mode", "Study Focus", "Party Time", "Romantic Evening",
      "Road Trip", "Rainy Day", "Summer Vibes", "Winter Warmth",
      "Nostalgic", "Futuristic", "Underground", "Mainstream",
      "Acoustic", "Electronic", "Jazz Lounge", "Rock Arena"
    ];
    
    return vibeNames[Math.floor(Math.random() * vibeNames.length)];
  }

  // Fallback methods for when backend is not available
  private calculateBasicSimilarity(track: SpotifyTrack): SimilarTrack {
    if (!this.tasteProfile) {
      return { track, similarityScore: 0, reasons: [] };
    }

    const reasons: string[] = [];
    let score = 0;

    // Artist similarity
    if (this.tasteProfile.artists.length > 0) {
      const trackArtists = track.artists.map(a => a.name);
      const artistMatches = trackArtists.filter(artist => 
        this.tasteProfile!.artists.some(profileArtist => 
          profileArtist.toLowerCase().includes(artist.toLowerCase()) ||
          artist.toLowerCase().includes(profileArtist.toLowerCase())
        )
      );
      
      if (artistMatches.length > 0) {
        score += 0.5;
        reasons.push(`Matches artists: ${artistMatches.join(", ")}`);
      }
    }

    // Genre similarity (simplified)
    if (this.tasteProfile.genres.length > 0) {
      // This would need genre information from the track
      score += 0.3;
      reasons.push("Similar genre");
    }

    return {
      track,
      similarityScore: Math.min(1, score),
      reasons: reasons.slice(0, 3)
    };
  }
}

export const aiMusicServiceBackend = new AIMusicServiceBackend();
