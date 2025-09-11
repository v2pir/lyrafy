import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import tensorflow as tf
from tensorflow import keras
import json
import pickle
from typing import List, Dict, Any, Optional
import asyncio
from datetime import datetime

from models.database import get_db
from models.user_interactions import UserInteraction
from models.track_features import TrackFeatures
from models.user_profiles import UserProfile
from .spotify_service import SpotifyService

class MLService:
    def __init__(self):
        self.spotify_service = SpotifyService()
        self.scaler = StandardScaler()
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.user_models = {}  # Cache for user-specific models
        
    async def create_user_profile(self, user_id: str, top_tracks: List[Dict], track_features: List[Dict]) -> UserProfile:
        """Create initial user profile from top tracks using ML analysis"""
        
        # Extract features from top tracks
        features_df = pd.DataFrame(track_features)
        
        # Analyze genre preferences
        all_genres = []
        for track in top_tracks:
            if 'genres' in track and track['genres']:
                all_genres.extend(track['genres'])
        
        genre_preferences = self._analyze_preferences(all_genres)
        
        # Analyze artist preferences
        all_artists = []
        for track in top_tracks:
            if 'artists' in track:
                all_artists.extend([artist['name'] for artist in track['artists']])
        
        artist_preferences = self._analyze_preferences(all_artists)
        
        # Analyze audio feature preferences
        audio_preferences = self._analyze_audio_preferences(features_df)
        
        # Analyze decade preferences
        decade_preferences = self._analyze_decade_preferences(top_tracks)
        
        # Create user profile
        profile = UserProfile(
            user_id=user_id,
            preferred_genres=genre_preferences,
            preferred_artists=artist_preferences,
            preferred_decades=decade_preferences,
            preferred_moods=self._analyze_mood_preferences(features_df),
            tempo_preference=audio_preferences.get('tempo', {}),
            energy_preference=audio_preferences.get('energy', {}),
            danceability_preference=audio_preferences.get('danceability', {}),
            valence_preference=audio_preferences.get('valence', {}),
            acousticness_preference=audio_preferences.get('acousticness', {}),
            instrumentalness_preference=audio_preferences.get('instrumentalness', {}),
            confidence_score=0.7,  # Initial confidence
            total_interactions=0
        )
        
        # Save to database
        db = next(get_db())
        db.add(profile)
        db.commit()
        db.refresh(profile)
        db.close()
        
        return profile
    
    async def get_recommendations(self, user_id: str, vibe_mode: str, limit: int = 50, exclude_track_ids: List[str] = None) -> Dict[str, Any]:
        """Get ML-powered recommendations for a user"""
        
        if exclude_track_ids is None:
            exclude_track_ids = []
            
        # Get user profile
        profile = await self.get_user_profile(user_id)
        if not profile:
            raise ValueError(f"User profile not found for user_id: {user_id}")
        
        # Get candidate tracks from Spotify based on vibe mode
        candidate_tracks = await self.spotify_service.search_tracks_by_vibe(vibe_mode, limit * 3)
        
        # Filter out excluded tracks
        candidate_tracks = [t for t in candidate_tracks if t['id'] not in exclude_track_ids]
        
        # Get track features for candidates
        track_features = await self.spotify_service.get_track_features(candidate_tracks)
        
        # Calculate similarity scores using ML
        recommendations = []
        confidence_scores = []
        reasons = []
        
        for track, features in zip(candidate_tracks, track_features):
            similarity_score, track_reasons = await self._calculate_similarity(profile, track, features)
            
            recommendations.append({
                'track': track,
                'features': features,
                'similarity_score': similarity_score
            })
            confidence_scores.append(similarity_score)
            reasons.append(track_reasons)
        
        # Sort by similarity score and return top recommendations
        sorted_recommendations = sorted(recommendations, key=lambda x: x['similarity_score'], reverse=True)
        top_recommendations = sorted_recommendations[:limit]
        
        return {
            'tracks': [r['track'] for r in top_recommendations],
            'confidence_scores': [r['similarity_score'] for r in top_recommendations],
            'reasons': [reasons[i] for i in range(len(top_recommendations))]
        }
    
    async def record_interaction(self, user_id: str, track_id: str, action: str, timestamp: float = None):
        """Record user interaction for learning"""
        
        if timestamp is None:
            timestamp = datetime.now().timestamp()
        
        # Save interaction to database
        db = next(get_db())
        interaction = UserInteraction(
            user_id=user_id,
            track_id=track_id,
            action=action,
            timestamp=timestamp
        )
        db.add(interaction)
        db.commit()
        db.close()
        
        # Update user profile based on interaction
        await self._update_profile_from_interaction(user_id, track_id, action)
        
        # Retrain model if enough interactions
        await self._check_and_retrain_model(user_id)
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile from database"""
        db = next(get_db())
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        db.close()
        return profile
    
    async def retrain_user_model(self, user_id: str) -> bool:
        """Retrain ML model for a specific user"""
        try:
            # Get user interactions
            db = next(get_db())
            interactions = db.query(UserInteraction).filter(UserInteraction.user_id == user_id).all()
            db.close()
            
            if len(interactions) < 10:  # Need minimum interactions
                return False
            
            # Get user profile
            profile = await self.get_user_profile(user_id)
            if not profile:
                return False
            
            # Retrain collaborative filtering model
            await self._train_collaborative_filtering_model(user_id, interactions)
            
            # Update profile confidence
            profile.confidence_score = min(1.0, profile.confidence_score + 0.1)
            profile.last_retrained = datetime.now()
            
            db = next(get_db())
            db.merge(profile)
            db.commit()
            db.close()
            
            return True
            
        except Exception as e:
            print(f"Error retraining model for user {user_id}: {e}")
            return False
    
    def _analyze_preferences(self, items: List[str]) -> Dict[str, float]:
        """Analyze preference weights for a list of items"""
        if not items:
            return {}
        
        # Count occurrences
        item_counts = {}
        for item in items:
            item_counts[item] = item_counts.get(item, 0) + 1
        
        # Normalize to weights
        total = sum(item_counts.values())
        preferences = {item: count / total for item, count in item_counts.items()}
        
        # Return top preferences
        return dict(sorted(preferences.items(), key=lambda x: x[1], reverse=True)[:20])
    
    def _analyze_audio_preferences(self, features_df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Analyze audio feature preferences from user's top tracks"""
        preferences = {}
        
        audio_features = ['tempo', 'energy', 'danceability', 'valence', 'acousticness', 'instrumentalness']
        
        for feature in audio_features:
            if feature in features_df.columns:
                values = features_df[feature].dropna()
                if len(values) > 0:
                    preferences[feature] = {
                        'min': float(values.min()),
                        'max': float(values.max()),
                        'preferred': float(values.mean()),
                        'std': float(values.std())
                    }
        
        return preferences
    
    def _analyze_decade_preferences(self, tracks: List[Dict]) -> Dict[str, float]:
        """Analyze decade preferences from track release dates"""
        decades = {}
        
        for track in tracks:
            if 'album' in track and 'release_date' in track['album']:
                release_date = track['album']['release_date']
                if release_date:
                    try:
                        year = int(release_date[:4])
                        decade = f"{(year // 10) * 10}s"
                        decades[decade] = decades.get(decade, 0) + 1
                    except (ValueError, TypeError):
                        continue
        
        # Normalize to weights
        total = sum(decades.values())
        if total > 0:
            return {decade: count / total for decade, count in decades.items()}
        return {}
    
    def _analyze_mood_preferences(self, features_df: pd.DataFrame) -> Dict[str, float]:
        """Analyze mood preferences from audio features"""
        moods = {}
        
        if 'valence' in features_df.columns and 'energy' in features_df.columns:
            valence = features_df['valence'].mean()
            energy = features_df['energy'].mean()
            
            # Determine mood based on valence and energy
            if valence > 0.7 and energy > 0.7:
                moods['happy_energetic'] = 1.0
            elif valence > 0.7 and energy < 0.3:
                moods['happy_calm'] = 1.0
            elif valence < 0.3 and energy > 0.7:
                moods['sad_energetic'] = 1.0
            elif valence < 0.3 and energy < 0.3:
                moods['sad_calm'] = 1.0
            else:
                moods['neutral'] = 1.0
        
        return moods
    
    async def _calculate_similarity(self, profile: UserProfile, track: Dict, features: Dict) -> tuple[float, List[str]]:
        """Calculate similarity score between user profile and track"""
        score = 0.0
        reasons = []
        
        # Genre similarity
        if 'genres' in track and track['genres'] and profile.preferred_genres:
            genre_matches = set(track['genres']) & set(profile.preferred_genres.keys())
            if genre_matches:
                genre_score = sum(profile.preferred_genres[g] for g in genre_matches)
                score += genre_score * 0.3
                reasons.append(f"Matches genres: {', '.join(genre_matches)}")
        
        # Artist similarity
        if 'artists' in track and profile.preferred_artists:
            track_artists = [artist['name'] for artist in track['artists']]
            artist_matches = set(track_artists) & set(profile.preferred_artists.keys())
            if artist_matches:
                artist_score = sum(profile.preferred_artists[a] for a in artist_matches)
                score += artist_score * 0.4
                reasons.append(f"Matches artists: {', '.join(artist_matches)}")
        
        # Audio feature similarity
        audio_score = self._calculate_audio_similarity(profile, features)
        score += audio_score * 0.3
        if audio_score > 0.5:
            reasons.append("Similar audio characteristics")
        
        return min(1.0, score), reasons
    
    def _calculate_audio_similarity(self, profile: UserProfile, features: Dict) -> float:
        """Calculate audio feature similarity"""
        score = 0.0
        features_compared = 0
        
        audio_features = ['tempo', 'energy', 'danceability', 'valence', 'acousticness', 'instrumentalness']
        
        for feature in audio_features:
            if feature in features and hasattr(profile, f'{feature}_preference'):
                pref = getattr(profile, f'{feature}_preference')
                if pref and 'preferred' in pref:
                    # Calculate similarity (1 - normalized difference)
                    diff = abs(features[feature] - pref['preferred'])
                    max_diff = pref.get('std', 0.1) * 2  # Use 2 standard deviations as max difference
                    if max_diff > 0:
                        similarity = max(0, 1 - (diff / max_diff))
                        score += similarity
                        features_compared += 1
        
        return score / max(1, features_compared)
    
    async def _update_profile_from_interaction(self, user_id: str, track_id: str, action: str):
        """Update user profile based on interaction"""
        # This would implement online learning to update preferences
        # For now, we'll just increment interaction count
        db = next(get_db())
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if profile:
            profile.total_interactions += 1
            db.commit()
        db.close()
    
    async def _check_and_retrain_model(self, user_id: str):
        """Check if model needs retraining based on interaction count"""
        profile = await self.get_user_profile(user_id)
        if profile and profile.total_interactions > 0 and profile.total_interactions % 20 == 0:
            await self.retrain_user_model(user_id)
    
    async def _train_collaborative_filtering_model(self, user_id: str, interactions: List[UserInteraction]):
        """Train collaborative filtering model for user"""
        # This would implement neural collaborative filtering
        # For now, we'll use a simple approach
        pass
    
    # AI Music Service methods (fallback to local AI service)
    async def analyze_music_taste_ai(self, user_id: str, top_tracks: List[Dict]) -> Dict[str, Any]:
        """Analyze music taste using AI (fallback method)"""
        try:
            # This would use the local AI service logic
            # For now, return a simple analysis
            genres = []
            artists = []
            
            for track in top_tracks:
                if 'artists' in track:
                    artists.extend([artist['name'] for artist in track['artists']])
                # Extract genres from track if available
                if 'genres' in track and track['genres']:
                    genres.extend(track['genres'])
            
            # Count preferences
            genre_prefs = {}
            for genre in genres:
                genre_prefs[genre] = genre_prefs.get(genre, 0) + 1
            
            artist_prefs = {}
            for artist in artists:
                artist_prefs[artist] = artist_prefs.get(artist, 0) + 1
            
            return {
                "user_id": user_id,
                "preferences": {
                    "genres": genre_prefs,
                    "artists": artist_prefs
                },
                "confidence": 0.8,
                "total_interactions": len(top_tracks)
            }
        except Exception as e:
            print(f"Error in AI taste analysis: {e}")
            return {"user_id": user_id, "preferences": {}, "confidence": 0.0, "total_interactions": 0}
    
    async def find_similar_tracks_ai(self, exclude_track_ids: List[str], limit: int = 50) -> List[Dict[str, Any]]:
        """Find similar tracks using AI (fallback method)"""
        try:
            # This would use the local AI service logic
            # For now, return empty list as this requires more complex implementation
            return []
        except Exception as e:
            print(f"Error finding similar tracks: {e}")
            return []
    
    async def generate_vibe_mode_name(self) -> str:
        """Generate a random vibe mode name"""
        try:
            vibe_names = [
                "Chill Vibes", "Energy Boost", "Late Night", "Morning Coffee",
                "Workout Mode", "Study Focus", "Party Time", "Romantic Evening",
                "Road Trip", "Rainy Day", "Summer Vibes", "Winter Warmth",
                "Nostalgic", "Futuristic", "Underground", "Mainstream",
                "Acoustic", "Electronic", "Jazz Lounge", "Rock Arena"
            ]
            import random
            return random.choice(vibe_names)
        except Exception as e:
            print(f"Error generating vibe name: {e}")
            return "Custom Vibe"
