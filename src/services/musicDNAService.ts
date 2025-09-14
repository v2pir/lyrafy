import { SpotifyTrack } from "../types/music";
import { spotifyService } from "./spotifyService";
import { removeDuplicateTracksByName } from "../utils/deduplication";

export interface MusicDNAProfile {
  vibe: string;
  emoji: string;
  color: string;
  genres: string[];
  artists: string[];
  mood: string;
  energy: string;
  timeOfDay: string;
  description: string;
  stats: {
    totalTracks: number;
    topGenre: string;
    topArtist: string;
    avgPopularity: number;
    timeRange: string;
  };
}

export interface MusicDNACard {
  profile: MusicDNAProfile;
  imageUri?: string;
  shareableImageUri?: string;
}

class MusicDNAService {
  /**
   * Generate Music DNA profile from recently played tracks
   */
  async generateMusicDNAProfile(timeRange: "day" | "week" = "week"): Promise<MusicDNAProfile> {
    try {
      console.log("🧬 Generating Music DNA profile...");
      
      // Get recently played tracks
      const limit = timeRange === "day" ? 20 : 50;
      const rawTracks = await spotifyService.getRecentlyPlayedTracks(limit);
      
      if (rawTracks.length === 0) {
        throw new Error("No recently played tracks found");
      }
      
      // Remove duplicate tracks by name
      const tracks = removeDuplicateTracksByName(rawTracks);

      // Analyze tracks
      const analysis = this.analyzeTracks(tracks);
      
      // Generate profile
      const profile: MusicDNAProfile = {
        vibe: this.generateVibe(analysis),
        emoji: this.generateEmoji(analysis),
        color: this.generateColor(analysis),
        genres: analysis.topGenres,
        artists: analysis.topArtists,
        mood: analysis.mood,
        energy: analysis.energy,
        timeOfDay: this.determineTimeOfDay(),
        description: this.generateDescription(analysis),
        stats: {
          totalTracks: tracks.length,
          topGenre: analysis.topGenres[0] || "Unknown",
          topArtist: analysis.topArtists[0] || "Unknown",
          avgPopularity: analysis.avgPopularity,
          timeRange: timeRange === "day" ? "Today" : "This Week"
        }
      };

      console.log("✅ Music DNA profile generated:", profile);
      return profile;
    } catch (error) {
      console.error("❌ Error generating Music DNA profile:", error);
      throw error;
    }
  }

  /**
   * Analyze tracks to extract patterns
   */
  private analyzeTracks(tracks: SpotifyTrack[]) {
    const genreCount: { [key: string]: number } = {};
    const artistCount: { [key: string]: number } = {};
    const moods: string[] = [];
    const energies: string[] = [];
    let totalPopularity = 0;

    tracks.forEach(track => {
      // Analyze genres (inferred from track names and artists)
      const inferredGenres = this.inferGenresFromTrack(track);
      inferredGenres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });

      // Analyze artists
      track.artists.forEach(artist => {
        artistCount[artist.name] = (artistCount[artist.name] || 0) + 1;
      });

      // Analyze mood and energy from track name
      const trackAnalysis = this.analyzeTrackMoodAndEnergy(track);
      moods.push(trackAnalysis.mood);
      energies.push(trackAnalysis.energy);

      totalPopularity += track.popularity;
    });

    const topGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    const topArtists = Object.entries(artistCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([artist]) => artist);

    const avgPopularity = totalPopularity / tracks.length;
    const dominantMood = this.getDominantMood(moods);
    const dominantEnergy = this.getDominantEnergy(energies);

    return {
      topGenres,
      topArtists,
      mood: dominantMood,
      energy: dominantEnergy,
      avgPopularity
    };
  }

  /**
   * Infer genres from track metadata
   */
  private inferGenresFromTrack(track: SpotifyTrack): string[] {
    const genres: string[] = [];
    const name = track.name.toLowerCase();
    const artist = track.artists[0]?.name.toLowerCase() || "";

    // Genre detection based on keywords
    if (name.includes("rap") || name.includes("hip") || artist.includes("rap")) {
      genres.push("Hip-Hop");
    }
    if (name.includes("rock") || artist.includes("rock")) {
      genres.push("Rock");
    }
    if (name.includes("pop") || name.includes("r&b") || name.includes("rnb") || artist.includes("pop")) {
      genres.push("Pop");
    }
    if (name.includes("jazz") || artist.includes("jazz")) {
      genres.push("Jazz");
    }
    if (name.includes("electronic") || name.includes("edm") || artist.includes("electronic")) {
      genres.push("Electronic");
    }
    if (name.includes("country") || artist.includes("country")) {
      genres.push("Country");
    }
    if (name.includes("classical") || artist.includes("classical")) {
      genres.push("Classical");
    }
    if (name.includes("blues") || artist.includes("blues")) {
      genres.push("Blues");
    }
    if (name.includes("folk") || artist.includes("folk")) {
      genres.push("Folk");
    }
    if (name.includes("reggae") || artist.includes("reggae")) {
      genres.push("Reggae");
    }

    // Default to Pop if no genre detected
    if (genres.length === 0) {
      genres.push("Pop");
    }

    return genres;
  }

  /**
   * Analyze mood and energy from track name
   */
  private analyzeTrackMoodAndEnergy(track: SpotifyTrack) {
    const name = track.name.toLowerCase();
    
    let mood = "Neutral";
    let energy = "Medium";

    // Mood detection
    if (name.includes("happy") || name.includes("joy") || name.includes("smile") || 
        name.includes("dance") || name.includes("party") || name.includes("celebration")) {
      mood = "Happy";
    } else if (name.includes("sad") || name.includes("lonely") || name.includes("tears") || 
               name.includes("heartbreak") || name.includes("melancholy") || name.includes("blue")) {
      mood = "Melancholic";
    } else if (name.includes("calm") || name.includes("peace") || name.includes("quiet") || 
               name.includes("chill") || name.includes("soft") || name.includes("gentle")) {
      mood = "Calm";
    } else if (name.includes("energy") || name.includes("power") || name.includes("fire") || 
               name.includes("intense") || name.includes("wild")) {
      mood = "Energetic";
    }

    // Energy detection
    if (name.includes("energy") || name.includes("power") || name.includes("fire") || 
        name.includes("intense") || name.includes("wild") || name.includes("fast")) {
      energy = "High";
    } else if (name.includes("calm") || name.includes("peace") || name.includes("quiet") || 
               name.includes("slow") || name.includes("soft") || name.includes("gentle")) {
      energy = "Low";
    }

    return { mood, energy };
  }

  /**
   * Get dominant mood from array of moods
   */
  private getDominantMood(moods: string[]): string {
    const moodCount: { [key: string]: number } = {};
    moods.forEach(mood => {
      moodCount[mood] = (moodCount[mood] || 0) + 1;
    });

    return Object.entries(moodCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "Neutral";
  }

  /**
   * Get dominant energy from array of energies
   */
  private getDominantEnergy(energies: string[]): string {
    const energyCount: { [key: string]: number } = {};
    energies.forEach(energy => {
      energyCount[energy] = (energyCount[energy] || 0) + 1;
    });

    return Object.entries(energyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || "Medium";
  }

  /**
   * Generate vibe name based on analysis
   */
  private generateVibe(analysis: any): string {
    const { mood, energy, topGenres } = analysis;
    
    const vibeTemplates = {
      "Happy": ["Vibrant", "Joyful", "Upbeat", "Sunny"],
      "Melancholic": ["Deep", "Emotional", "Introspective", "Melancholic"],
      "Calm": ["Chill", "Peaceful", "Serene", "Relaxed"],
      "Energetic": ["Dynamic", "Intense", "Powerful", "Energetic"],
      "Neutral": ["Balanced", "Diverse", "Eclectic", "Mixed"]
    };

    const energyModifiers = {
      "High": ["High-Energy", "Intense", "Powerful"],
      "Medium": ["Balanced", "Moderate", "Steady"],
      "Low": ["Mellow", "Gentle", "Soft"]
    };

    const vibeOptions = vibeTemplates[mood as keyof typeof vibeTemplates] || vibeTemplates.Neutral;
    const energyOptions = energyModifiers[energy as keyof typeof energyModifiers] || energyModifiers.Medium;
    
    const vibe = vibeOptions[Math.floor(Math.random() * vibeOptions.length)];
    const energyMod = energyOptions[Math.floor(Math.random() * energyOptions.length)];
    
    return `${energyMod} ${vibe}`;
  }

  /**
   * Generate emoji based on analysis
   */
  private generateEmoji(analysis: any): string {
    const { mood, energy } = analysis;
    
    const emojiMap: { [key: string]: string[] } = {
      "Happy": ["✨", "🌟", "🎉", "😊", "🌈"],
      "Melancholic": ["💙", "🌙", "🎭", "💔", "🌊"],
      "Calm": ["🌿", "🌸", "🕊️", "🌅", "🍃"],
      "Energetic": ["⚡", "🔥", "💥", "🚀", "🎆"],
      "Neutral": ["🎵", "🎶", "🎼", "🎤", "🎧"]
    };

    const emojis = emojiMap[mood] || emojiMap.Neutral;
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  /**
   * Generate color based on analysis
   */
  private generateColor(analysis: any): string {
    const { mood, energy } = analysis;
    
    const colorMap: { [key: string]: string[] } = {
      "Happy": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"],
      "Melancholic": ["#6C5CE7", "#A29BFE", "#74B9FF", "#0984E3", "#636E72"],
      "Calm": ["#00B894", "#00CEC9", "#55A3FF", "#81ECEC", "#A8E6CF"],
      "Energetic": ["#E17055", "#FDCB6E", "#E84393", "#FF7675", "#F39C12"],
      "Neutral": ["#8B5CF6", "#EC4899", "#06B6D4", "#10B981", "#F59E0B"]
    };

    const colors = colorMap[mood] || colorMap.Neutral;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Determine time of day
   */
  private determineTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 17) return "Afternoon";
    if (hour >= 17 && hour < 21) return "Evening";
    return "Night";
  }

  /**
   * Generate description based on analysis
   */
  private generateDescription(analysis: any): string {
    const { mood, energy, topGenres, topArtists, avgPopularity } = analysis;
    
    const descriptions = [
      `Your ${mood.toLowerCase()} ${energy.toLowerCase()}-energy vibes are ${topGenres[0]?.toLowerCase() || "eclectic"} perfection`,
      `Channeling ${mood.toLowerCase()} energy through ${topGenres[0]?.toLowerCase() || "diverse"} sounds`,
      `A ${energy.toLowerCase()}-energy ${mood.toLowerCase()} journey through ${topGenres[0]?.toLowerCase() || "music"}`,
      `${topArtists[0] || "Your favorite artists"} vibes with ${mood.toLowerCase()} ${energy.toLowerCase()}-energy`,
      `Pure ${mood.toLowerCase()} ${energy.toLowerCase()}-energy ${topGenres[0]?.toLowerCase() || "music"} magic`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }
}

export const musicDNAService = new MusicDNAService();
