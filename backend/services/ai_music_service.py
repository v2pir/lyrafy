from typing import List, Dict, Any, Optional
import re
from collections import Counter
from datetime import datetime

class AIMusicService:
    def __init__(self):
        self.taste_profiles: Dict[str, Dict[str, Any]] = {}
    
    def analyze_music_taste(self, user_id: str, top_tracks: List[Dict]) -> Dict[str, Any]:
        """Analyze user's music taste from top tracks"""
        print(f"🤖 Analyzing music taste for user {user_id} from {len(top_tracks)} tracks")
        
        if not top_tracks:
            raise ValueError("No tracks provided for analysis")
        
        # Extract genres from tracks
        genres = self._extract_genres(top_tracks)
        
        # Analyze basic track properties
        popularity = self._analyze_feature([track.get('popularity', 0) for track in top_tracks])
        artists = list(set([artist['name'] for track in top_tracks for artist in track.get('artists', [])]))
        decades = self._extract_decades(top_tracks)
        
        # Determine moods based on track names and artists
        moods = self._determine_moods_from_tracks(top_tracks)
        
        # Create taste profile
        taste_profile = {
            'genres': genres,
            'moods': moods,
            'tempo': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'energy': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'danceability': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'valence': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'acousticness': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'instrumentalness': {'min': 0, 'max': 0, 'average': 0},  # Placeholder
            'popularity': popularity,
            'key': [],  # Placeholder
            'time_signature': [],  # Placeholder
            'artists': artists[:20],  # Top 20 artists
            'decades': decades
        }
        
        # Store profile
        self.taste_profiles[user_id] = taste_profile
        
        print(f"🎵 Music taste profile created for user {user_id}: {taste_profile}")
        return taste_profile
    
    def find_similar_tracks(self, user_id: str, available_tracks: List[Dict], exclude_track_ids: List[str] = None, limit: int = 50) -> List[Dict]:
        """Find similar tracks based on taste profile"""
        if user_id not in self.taste_profiles:
            raise ValueError("No taste profile available. Please analyze music taste first.")
        
        if exclude_track_ids is None:
            exclude_track_ids = []
        
        taste_profile = self.taste_profiles[user_id]
        print(f"🔍 Finding similar tracks for user {user_id} based on taste profile")
        
        similar_tracks = []
        
        # Filter out excluded tracks
        filtered_tracks = [track for track in available_tracks if track['id'] not in exclude_track_ids]
        
        # Calculate similarity for each track
        for track in filtered_tracks:
            similarity = self._calculate_similarity(track, taste_profile)
            if similarity['similarity_score'] > 0.1:  # Lowered threshold for fallback
                similar_tracks.append(similarity)
        
        # Sort by similarity score and return top results
        similar_tracks.sort(key=lambda x: x['similarity_score'], reverse=True)
        return similar_tracks[:limit]
    
    def generate_vibe_mode_name(self, user_id: str) -> str:
        """Generate a vibe mode name based on taste profile"""
        if user_id not in self.taste_profiles:
            return "Your Vibe"
        
        taste_profile = self.taste_profiles[user_id]
        genres = taste_profile.get('genres', [])
        moods = taste_profile.get('moods', [])
        energy = taste_profile.get('energy', {})
        
        # Combine top genre and mood
        top_genre = genres[0] if genres else "Music"
        top_mood = moods[0] if moods else "Chill"
        
        # Add energy descriptor
        energy_avg = energy.get('average', 0)
        if energy_avg > 0.7:
            energy_desc = "High Energy"
        elif energy_avg > 0.4:
            energy_desc = "Moderate"
        else:
            energy_desc = "Chill"
        
        return f"{energy_desc} {top_mood} {top_genre}"
    
    def get_taste_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get stored taste profile for user"""
        return self.taste_profiles.get(user_id)
    
    def _extract_genres(self, tracks: List[Dict]) -> List[str]:
        """Extract genres from tracks using simplified inference"""
        genre_count = Counter()
        
        for track in tracks:
            artists = track.get('artists', [])
            for artist in artists:
                # Infer genres from track name and artist name
                inferred_genres = self._infer_genres_from_track(track)
                for genre in inferred_genres:
                    genre_count[genre] += 1
        
        return [genre for genre, count in genre_count.most_common(10)]
    
    def _infer_genres_from_track(self, track: Dict[str, Any]) -> List[str]:
        """Infer genres from track name and artist name"""
        genres = []
        name = track.get('name', '').lower()
        artists = [artist.get('name', '').lower() for artist in track.get('artists', [])]
        all_text = name + ' ' + ' '.join(artists)
        
        # Basic genre inference patterns
        if any(keyword in all_text for keyword in ['rap', 'hip', 'hop']):
            genres.append("Hip-Hop")
        if any(keyword in all_text for keyword in ['rock', 'metal', 'punk']):
            genres.append("Rock")
        if any(keyword in all_text for keyword in ['pop', 'mainstream']):
            genres.append("Pop")
        if any(keyword in all_text for keyword in ['jazz', 'blues', 'soul']):
            genres.append("Jazz")
        if any(keyword in all_text for keyword in ['electronic', 'edm', 'techno', 'house']):
            genres.append("Electronic")
        if any(keyword in all_text for keyword in ['country', 'folk', 'bluegrass']):
            genres.append("Country")
        if any(keyword in all_text for keyword in ['classical', 'orchestral', 'symphony']):
            genres.append("Classical")
        if any(keyword in all_text for keyword in ['reggae', 'ska', 'dancehall']):
            genres.append("Reggae")
        if any(keyword in all_text for keyword in ['indie', 'alternative', 'underground']):
            genres.append("Indie")
        if any(keyword in all_text for keyword in ['r&b', 'rnb', 'soul']):
            genres.append("R&B")
        
        # Default to pop if no genres found
        if not genres:
            genres.append("Pop")
        
        return genres
    
    def _analyze_feature(self, values: List[float]) -> Dict[str, float]:
        """Analyze a feature (min, max, average)"""
        valid_values = [v for v in values if v is not None and not (isinstance(v, float) and (v != v))]  # Remove NaN
        
        if not valid_values:
            return {'min': 0, 'max': 0, 'average': 0}
        
        return {
            'min': min(valid_values),
            'max': max(valid_values),
            'average': sum(valid_values) / len(valid_values)
        }
    
    def _determine_moods_from_tracks(self, tracks: List[Dict]) -> List[str]:
        """Determine moods from track names and artists"""
        moods = []
        
        # Analyze track names for mood indicators
        track_names = [track.get('name', '').lower() for track in tracks]
        all_text = ' '.join(track_names)
        
        # Happy/Upbeat indicators
        if any(keyword in all_text for keyword in ['happy', 'joy', 'smile', 'dance', 'party', 'celebration']):
            moods.extend(["Happy", "Upbeat"])
        
        # Energetic indicators
        if any(keyword in all_text for keyword in ['energy', 'power', 'fire', 'rock', 'metal', 'intense']):
            moods.extend(["Energetic", "Intense"])
        
        # Calm/Relaxed indicators
        if any(keyword in all_text for keyword in ['calm', 'peace', 'quiet', 'chill', 'soft', 'gentle']):
            moods.extend(["Calm", "Relaxed"])
        
        # Melancholic indicators
        if any(keyword in all_text for keyword in ['sad', 'lonely', 'tears', 'heartbreak', 'melancholy', 'blue']):
            moods.extend(["Melancholic", "Sad"])
        
        # Default moods based on popularity
        if tracks:
            avg_popularity = sum(track.get('popularity', 0) for track in tracks) / len(tracks)
            if avg_popularity > 70:
                moods.extend(["Popular", "Mainstream"])
            elif avg_popularity > 40:
                moods.extend(["Moderate", "Balanced"])
            else:
                moods.extend(["Underground", "Alternative"])
        
        # Add some default moods if none found
        if not moods:
            moods.extend(["Diverse", "Mixed"])
        
        return list(set(moods))[:5]  # Remove duplicates and limit to 5
    
    def _extract_decades(self, tracks: List[Dict]) -> List[str]:
        """Extract decades from track release dates"""
        decades = Counter()
        
        for track in tracks:
            album = track.get('album', {})
            release_date = album.get('release_date', '')
            
            if release_date:
                try:
                    # Handle different date formats
                    if len(release_date) == 4:  # Just year
                        year = int(release_date)
                    else:  # Full date
                        year = datetime.strptime(release_date.split('-')[0], '%Y').year
                    
                    decade = (year // 10) * 10
                    decades[f"{decade}s"] += 1
                except (ValueError, IndexError):
                    continue
        
        return [decade for decade, count in decades.most_common(3)]
    
    def _calculate_similarity(self, track: Dict[str, Any], taste_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate similarity between track and taste profile"""
        reasons = []
        score = 0
        
        # Check if track is by a preferred artist (highest weight)
        track_artists = [artist.get('name', '') for artist in track.get('artists', [])]
        preferred_artists = taste_profile.get('artists', [])
        has_preferred_artist = any(artist in preferred_artists for artist in track_artists)
        
        if has_preferred_artist:
            score += 0.5
            reasons.append("By preferred artist")
        
        # Check if track is from a preferred decade
        album = track.get('album', {})
        release_date = album.get('release_date', '')
        if release_date:
            try:
                if len(release_date) == 4:
                    year = int(release_date)
                else:
                    year = datetime.strptime(release_date.split('-')[0], '%Y').year
                
                decade = (year // 10) * 10
                decade_str = f"{decade}s"
                preferred_decades = taste_profile.get('decades', [])
                
                if decade_str in preferred_decades:
                    score += 0.3
                    reasons.append(f"From preferred decade ({decade_str})")
            except (ValueError, IndexError):
                pass
        
        # Check if track name contains preferred genre keywords
        track_name = track.get('name', '').lower()
        preferred_genres = [genre.lower() for genre in taste_profile.get('genres', [])]
        has_genre_keyword = any(genre in track_name or track_name in genre for genre in preferred_genres)
        
        if has_genre_keyword:
            score += 0.2
            reasons.append("Contains preferred genre keywords")
        
        # Check popularity (prefer tracks with similar popularity)
        track_popularity = track.get('popularity', 0)
        avg_popularity = taste_profile.get('popularity', {}).get('average', 50)
        popularity_diff = abs(track_popularity - avg_popularity)
        popularity_score = max(0, 1 - popularity_diff / 100)
        score += popularity_score * 0.1
        
        # Bonus for tracks that match multiple criteria
        if len(reasons) >= 2:
            score += 0.1
        
        return {
            'track': track,
            'similarity_score': min(1, score),
            'reasons': reasons[:3]
        }
