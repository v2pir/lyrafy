import { SpotifyTrack } from "../types/music";
import { spotifyService } from "./spotifyService";

export interface MusicTasteProfile {
  genres: string[];
  moods: string[];
  tempo: {
    min: number;
    max: number;
    average: number;
  };
  energy: {
    min: number;
    max: number;
    average: number;
  };
  danceability: {
    min: number;
    max: number;
    average: number;
  };
  valence: {
    min: number;
    max: number;
    average: number;
  };
  acousticness: {
    min: number;
    max: number;
    average: number;
  };
  instrumentalness: {
    min: number;
    max: number;
    average: number;
  };
  popularity: {
    min: number;
    max: number;
    average: number;
  };
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

class AIMusicService {
  private tasteProfile: MusicTasteProfile | null = null;

  /**
   * Analyze user's top tracks to create a music taste profile
   */
  async analyzeMusicTaste(topTracks: SpotifyTrack[]): Promise<MusicTasteProfile> {
    console.log("🤖 Analyzing music taste from", topTracks.length, "tracks");
    
    if (topTracks.length === 0) {
      throw new Error("No tracks provided for analysis");
    }

    // Extract genres from tracks
    const genres = this.extractGenres(topTracks);
    
    // Analyze basic track properties (no audio features needed)
    const popularity = this.analyzeFeature(topTracks.map(t => t.popularity));
    const artists = [...new Set(topTracks.flatMap(t => t.artists.map(a => a.name)))];
    const decades = this.extractDecades(topTracks);
    
    // Determine moods based on track names and artists (simplified)
    const moods = this.determineMoodsFromTracks(topTracks);

    // Create simplified taste profile without audio features
    this.tasteProfile = {
      genres,
      moods,
      tempo: { min: 0, max: 0, average: 0 }, // Placeholder
      energy: { min: 0, max: 0, average: 0 }, // Placeholder
      danceability: { min: 0, max: 0, average: 0 }, // Placeholder
      valence: { min: 0, max: 0, average: 0 }, // Placeholder
      acousticness: { min: 0, max: 0, average: 0 }, // Placeholder
      instrumentalness: { min: 0, max: 0, average: 0 }, // Placeholder
      popularity,
      key: [], // Placeholder
      timeSignature: [], // Placeholder
      artists: artists.slice(0, 20), // Top 20 artists
      decades
    };

    console.log("🎵 Music taste profile created:", this.tasteProfile);
    return this.tasteProfile;
  }

  /**
   * Find similar tracks based on the taste profile
   */
  async findSimilarTracks(excludeTrackIds: string[] = [], limit: number = 50): Promise<SimilarTrack[]> {
    if (!this.tasteProfile) {
      throw new Error("No taste profile available. Please analyze music taste first.");
    }

    console.log("🔍 Finding similar tracks based on taste profile");
    
    const similarTracks: SimilarTrack[] = [];
    
    // Search for tracks by genre combinations
    for (const genre of this.tasteProfile.genres.slice(0, 3)) {
      try {
        const genreTracks = await spotifyService.searchTracks(genre, 20);
        const filteredTracks = genreTracks.filter(track => !excludeTrackIds.includes(track.id));
        
        for (const track of filteredTracks) {
          const similarity = await this.calculateSimilarity(track);
          if (similarity.similarityScore > 0.3) { // Lowered threshold for fallback
            similarTracks.push(similarity);
          }
        }
      } catch (error) {
        console.warn("Error searching for genre:", genre, error);
      }
    }

    // Search for tracks by mood
    for (const mood of this.tasteProfile.moods) {
      try {
        const moodTracks = await spotifyService.searchTracks(`${mood} music`, 15);
        const filteredTracks = moodTracks.filter(track => !excludeTrackIds.includes(track.id));
        
        for (const track of filteredTracks) {
          const similarity = await this.calculateSimilarity(track);
          if (similarity.similarityScore > 0.2) { // Lowered threshold for fallback
            similarTracks.push(similarity);
          }
        }
      } catch (error) {
        console.warn("Error searching for mood:", mood, error);
      }
    }

    // Search for tracks by similar artists
    for (const artist of this.tasteProfile.artists.slice(0, 5)) {
      try {
        const artistTracks = await spotifyService.searchTracks(`artist:${artist}`, 10);
        const filteredTracks = artistTracks.filter(track => !excludeTrackIds.includes(track.id));
        
        for (const track of filteredTracks) {
          const similarity = await this.calculateSimilarity(track);
          if (similarity.similarityScore > 0.1) { // Lowered threshold for fallback
            similarTracks.push(similarity);
          }
        }
      } catch (error) {
        console.warn("Error searching for artist:", artist, error);
      }
    }

    // If we don't have enough tracks, do broader searches
    if (similarTracks.length < 20) {
      console.log("🔍 Not enough tracks found, doing broader searches...");
      
      // Search for popular tracks in preferred genres
      for (const genre of this.tasteProfile.genres.slice(0, 2)) {
        try {
          const popularTracks = await spotifyService.searchTracks(`popular ${genre}`, 15);
          const filteredTracks = popularTracks.filter(track => !excludeTrackIds.includes(track.id));
          
          for (const track of filteredTracks) {
            const similarity = await this.calculateSimilarity(track);
            if (similarity.similarityScore > 0.1) {
              similarTracks.push(similarity);
            }
          }
        } catch (error) {
          console.warn("Error searching for popular genre:", genre, error);
        }
      }
    }

    // Remove duplicates and sort by similarity score
    const uniqueTracks = this.removeDuplicateTracks(similarTracks);
    const sortedTracks = uniqueTracks
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    console.log(`🎯 Found ${sortedTracks.length} similar tracks`);
    return sortedTracks;
  }

  /**
   * Generate a vibe mode name based on the taste profile
   */
  generateVibeModeName(): string {
    if (!this.tasteProfile) {
      return "Your Vibe";
    }

    const { genres, moods, energy } = this.tasteProfile;
    
    // Combine top genre and mood
    const topGenre = genres[0] || "Music";
    const topMood = moods[0] || "Chill";
    
    // Add energy descriptor
    let energyDesc = "";
    if (energy.average > 0.7) energyDesc = "High Energy";
    else if (energy.average > 0.4) energyDesc = "Moderate";
    else energyDesc = "Chill";
    
    return `${energyDesc} ${topMood} ${topGenre}`;
  }


  private extractGenres(tracks: SpotifyTrack[]): string[] {
    const genreCount: { [key: string]: number } = {};
    
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        // This is a simplified approach - in reality, you'd need to get artist genres from Spotify
        // For now, we'll use track popularity and other features to infer genres
        const inferredGenres = this.inferGenresFromTrack(track);
        inferredGenres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      });
    });

    return Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([genre]) => genre);
  }

  private inferGenresFromTrack(track: SpotifyTrack): string[] {
    // This is a simplified genre inference based on track name and artist
    // In a real implementation, you'd use Spotify's artist genre data
    const genres: string[] = [];
    const name = track.name.toLowerCase();
    const artist = track.artists[0]?.name.toLowerCase() || "";

    // Basic genre inference patterns
    if (name.includes("rap") || name.includes("hip") || artist.includes("rap")) genres.push("Hip-Hop");
    if (name.includes("rock") || artist.includes("rock")) genres.push("Rock");
    if (name.includes("pop") || artist.includes("pop")) genres.push("Pop");
    if (name.includes("jazz") || artist.includes("jazz")) genres.push("Jazz");
    if (name.includes("electronic") || artist.includes("electronic")) genres.push("Electronic");
    if (name.includes("country") || artist.includes("country")) genres.push("Country");
    if (name.includes("classical") || artist.includes("classical")) genres.push("Classical");
    if (name.includes("blues") || artist.includes("blues")) genres.push("Blues");
    if (name.includes("folk") || artist.includes("folk")) genres.push("Folk");
    if (name.includes("reggae") || artist.includes("reggae")) genres.push("Reggae");

    // Default to pop if no genres found
    if (genres.length === 0) genres.push("Pop");

    return genres;
  }

  private analyzeFeature(values: number[]): { min: number; max: number; average: number } {
    const validValues = values.filter(v => !isNaN(v) && v !== null);
    if (validValues.length === 0) return { min: 0, max: 0, average: 0 };

    return {
      min: Math.min(...validValues),
      max: Math.max(...validValues),
      average: validValues.reduce((sum, val) => sum + val, 0) / validValues.length
    };
  }

  private determineMoodsFromTracks(tracks: SpotifyTrack[]): string[] {
    const moods: string[] = [];
    
    // Analyze track names for mood indicators
    const trackNames = tracks.map(t => t.name.toLowerCase());
    const allText = trackNames.join(' ');
    
    // Happy/Upbeat indicators
    if (allText.includes('happy') || allText.includes('joy') || allText.includes('smile') || 
        allText.includes('dance') || allText.includes('party') || allText.includes('celebration')) {
      moods.push("Happy", "Upbeat");
    }
    
    // Energetic indicators
    if (allText.includes('energy') || allText.includes('power') || allText.includes('fire') || 
        allText.includes('rock') || allText.includes('metal') || allText.includes('intense')) {
      moods.push("Energetic", "Intense");
    }
    
    // Calm/Relaxed indicators
    if (allText.includes('calm') || allText.includes('peace') || allText.includes('quiet') || 
        allText.includes('chill') || allText.includes('soft') || allText.includes('gentle')) {
      moods.push("Calm", "Relaxed");
    }
    
    // Melancholic indicators
    if (allText.includes('sad') || allText.includes('lonely') || allText.includes('tears') || 
        allText.includes('heartbreak') || allText.includes('melancholy') || allText.includes('blue')) {
      moods.push("Melancholic", "Sad");
    }
    
    // Default moods based on popularity
    const avgPopularity = tracks.reduce((sum, t) => sum + t.popularity, 0) / tracks.length;
    if (avgPopularity > 70) {
      moods.push("Popular", "Mainstream");
    } else if (avgPopularity > 40) {
      moods.push("Moderate", "Balanced");
    } else {
      moods.push("Underground", "Alternative");
    }
    
    // Add some default moods if none found
    if (moods.length === 0) {
      moods.push("Diverse", "Mixed");
    }

    return [...new Set(moods)].slice(0, 5);
  }

  private determineMoods(valence: number, energy: number, danceability: number): string[] {
    const moods: string[] = [];

    // Valence (positivity) based moods
    if (valence > 0.7) moods.push("Happy", "Upbeat");
    else if (valence > 0.4) moods.push("Neutral", "Balanced");
    else moods.push("Melancholic", "Sad");

    // Energy based moods
    if (energy > 0.7) moods.push("Energetic", "Intense");
    else if (energy > 0.4) moods.push("Moderate", "Steady");
    else moods.push("Calm", "Relaxed");

    // Danceability based moods
    if (danceability > 0.7) moods.push("Danceable", "Groovy");
    else if (danceability > 0.4) moods.push("Rhythmic");
    else moods.push("Ambient", "Atmospheric");

    return [...new Set(moods)].slice(0, 5);
  }

  private extractDecades(tracks: SpotifyTrack[]): string[] {
    const decades: { [key: string]: number } = {};
    
    tracks.forEach(track => {
      // Extract year from release date
      const year = new Date(track.album.release_date).getFullYear();
      if (!isNaN(year)) {
        const decade = Math.floor(year / 10) * 10;
        const decadeStr = `${decade}s`;
        decades[decadeStr] = (decades[decadeStr] || 0) + 1;
      }
    });

    return Object.entries(decades)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([decade]) => decade);
  }

  private async calculateSimilarity(track: SpotifyTrack): Promise<SimilarTrack> {
    if (!this.tasteProfile) {
      return { track, similarityScore: 0, reasons: [] };
    }

    // Skip audio features for now due to 403 errors - use fallback method
    console.log("Using fallback similarity calculation for:", track.name);
    return this.calculateBasicSimilarity(track);
  }

  private calculateBasicSimilarity(track: SpotifyTrack): SimilarTrack {
    if (!this.tasteProfile) {
      return { track, similarityScore: 0, reasons: [] };
    }

    const reasons: string[] = [];
    let score = 0;

    // Check if track is by a preferred artist (highest weight)
    const trackArtists = track.artists.map(a => a.name);
    const hasPreferredArtist = trackArtists.some(artist => 
      this.tasteProfile!.artists.includes(artist)
    );
    
    if (hasPreferredArtist) {
      score += 0.5;
      reasons.push("By preferred artist");
    }

    // Check if track is from a preferred decade
    const trackYear = new Date(track.album.release_date).getFullYear();
    if (!isNaN(trackYear)) {
      const trackDecade = Math.floor(trackYear / 10) * 10;
      const decadeStr = `${trackDecade}s`;
      
      if (this.tasteProfile.decades.includes(decadeStr)) {
        score += 0.3;
        reasons.push(`From preferred decade (${decadeStr})`);
      }
    }

    // Check if track name contains preferred genre keywords
    const trackName = track.name.toLowerCase();
    const preferredGenres = this.tasteProfile.genres.map(g => g.toLowerCase());
    const hasGenreKeyword = preferredGenres.some(genre => 
      trackName.includes(genre) || genre.includes(trackName)
    );
    
    if (hasGenreKeyword) {
      score += 0.2;
      reasons.push("Contains preferred genre keywords");
    }

    // Check popularity (prefer tracks with similar popularity)
    const popularityDiff = Math.abs(track.popularity - this.tasteProfile.popularity.average);
    const popularityScore = Math.max(0, 1 - popularityDiff / 100);
    score += popularityScore * 0.1;

    // Bonus for tracks that match multiple criteria
    if (reasons.length >= 2) {
      score += 0.1;
    }

    return {
      track,
      similarityScore: Math.min(1, score),
      reasons: reasons.slice(0, 3)
    };
  }

  private removeDuplicateTracks(tracks: SimilarTrack[]): SimilarTrack[] {
    const seen = new Set<string>();
    return tracks.filter(track => {
      if (seen.has(track.track.id)) {
        return false;
      }
      seen.add(track.track.id);
      return true;
    });
  }

  getTasteProfile(): MusicTasteProfile | null {
    return this.tasteProfile;
  }
}

export const aiMusicService = new AIMusicService();