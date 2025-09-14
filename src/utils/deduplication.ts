import { SpotifyTrack } from "../types/music";

/**
 * Remove duplicate tracks by song name (case-insensitive)
 * Keeps the first occurrence of each unique song name
 */
export function removeDuplicateTracksByName(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seen = new Set<string>();
  const uniqueTracks: SpotifyTrack[] = [];

  for (const track of tracks) {
    const normalizedName = track.name.toLowerCase().trim();
    
    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      uniqueTracks.push(track);
    }
  }

  console.log(`🎵 Removed ${tracks.length - uniqueTracks.length} duplicate tracks by name. ${uniqueTracks.length} unique tracks remaining.`);
  
  return uniqueTracks;
}

/**
 * Remove duplicate tracks by both ID and name for extra safety
 * This is more comprehensive but slower for large arrays
 */
export function removeDuplicateTracksByIdAndName(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const uniqueTracks: SpotifyTrack[] = [];

  for (const track of tracks) {
    const normalizedName = track.name.toLowerCase().trim();
    
    // Check both ID and name to avoid duplicates
    if (!seenIds.has(track.id) && !seenNames.has(normalizedName)) {
      seenIds.add(track.id);
      seenNames.add(normalizedName);
      uniqueTracks.push(track);
    }
  }

  console.log(`🎵 Removed ${tracks.length - uniqueTracks.length} duplicate tracks by ID and name. ${uniqueTracks.length} unique tracks remaining.`);
  
  return uniqueTracks;
}
