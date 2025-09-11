import spotipy
from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOAuth
import os
from typing import List, Dict, Any, Optional
import asyncio
import httpx
from dotenv import load_dotenv

class SpotifyService:
    def __init__(self):
        # Load environment variables from parent directory
        load_dotenv(dotenv_path="../.env")
        self.client_id = os.getenv("EXPO_PUBLIC_SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:3000/callback")
        
        # Initialize Spotify client with client credentials (for public data)
        client_credentials_manager = SpotifyClientCredentials(
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        self.sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)
        
        # Store user tokens (in production, this would be in a database)
        self.user_tokens = {}
    
    def get_user_spotify_client(self, access_token: str) -> spotipy.Spotify:
        """Get a Spotify client authenticated with user access token"""
        return spotipy.Spotify(auth=access_token)
    
    async def get_track_features(self, tracks: List[Dict]) -> List[Dict]:
        """Get audio features for a list of tracks"""
        track_ids = [track['id'] for track in tracks if 'id' in track]
        
        if not track_ids:
            return []
        
        try:
            # Get audio features in batches
            features = []
            batch_size = 100
            
            for i in range(0, len(track_ids), batch_size):
                batch_ids = track_ids[i:i + batch_size]
                batch_features = self.sp.audio_features(batch_ids)
                features.extend(batch_features)
            
            return features
        except Exception as e:
            print(f"Error getting track features: {e}")
            return []
    
    async def search_tracks_by_vibe(self, vibe_mode: str, limit: int = 50) -> List[Dict]:
        """Search for tracks based on vibe mode"""
        try:
            # Map vibe modes to search queries
            vibe_queries = {
                'hip-hop': 'genre:hip-hop',
                'rock': 'genre:rock',
                'pop': 'genre:pop',
                'jazz': 'genre:jazz',
                'electronic': 'genre:electronic',
                'classical': 'genre:classical',
                'country': 'genre:country',
                'r&b': 'genre:r&b',
                'reggae': 'genre:reggae',
                'blues': 'genre:blues',
                'folk': 'genre:folk',
                'indie': 'genre:indie',
                'metal': 'genre:metal',
                'punk': 'genre:punk',
                'soul': 'genre:soul',
                'funk': 'genre:funk',
                'disco': 'genre:disco',
                'house': 'genre:house',
                'techno': 'genre:techno',
                'ambient': 'genre:ambient',
                'party': 'mood:party',
                'chill': 'mood:chill',
                'energetic': 'mood:energetic',
                'romantic': 'mood:romantic',
                'sad': 'mood:sad',
                'happy': 'mood:happy',
                'workout': 'mood:workout',
                'focus': 'mood:focus',
                'sleep': 'mood:sleep'
            }
            
            query = vibe_queries.get(vibe_mode.lower(), vibe_mode)
            
            # Search for tracks
            results = self.sp.search(q=query, type='track', limit=limit)
            tracks = results['tracks']['items']
            
            # Format tracks
            formatted_tracks = []
            for track in tracks:
                formatted_track = {
                    'id': track['id'],
                    'name': track['name'],
                    'artists': track['artists'],
                    'album': track['album'],
                    'popularity': track['popularity'],
                    'preview_url': None,  # Spotify removed preview URLs from Web API
                    'external_urls': track['external_urls'],
                    'duration_ms': track['duration_ms'],
                    'explicit': track['explicit']
                }
                formatted_tracks.append(formatted_track)
            
            return formatted_tracks
            
        except Exception as e:
            print(f"Error searching tracks for vibe {vibe_mode}: {e}")
            return []
    
    async def get_track_by_id(self, track_id: str) -> Dict:
        """Get track details by ID"""
        try:
            track = self.sp.track(track_id)
            return {
                'id': track['id'],
                'name': track['name'],
                'artists': track['artists'],
                'album': track['album'],
                'popularity': track['popularity'],
                'preview_url': None,  # Spotify removed preview URLs from Web API
                'external_urls': track['external_urls'],
                'duration_ms': track['duration_ms'],
                'explicit': track['explicit']
            }
        except Exception as e:
            print(f"Error getting track {track_id}: {e}")
            return {}
    
    async def get_artist_genres(self, artist_id: str) -> List[str]:
        """Get genres for an artist"""
        try:
            artist = self.sp.artist(artist_id)
            return artist.get('genres', [])
        except Exception as e:
            print(f"Error getting artist genres for {artist_id}: {e}")
            return []
    
    async def get_user_top_tracks(self, time_range: str = "medium_term", limit: int = 50) -> List[Dict]:
        """Get user's top tracks (requires user authentication)"""
        try:
            # This would need user access token in production
            # For now, return empty list as this requires user auth
            return []
        except Exception as e:
            print(f"Error getting user top tracks: {e}")
            return []
    
    async def search_tracks(self, query: str, limit: int = 20) -> List[Dict]:
        """Search for tracks on Spotify"""
        try:
            results = self.sp.search(q=query, type='track', limit=limit)
            tracks = results['tracks']['items']
            
            formatted_tracks = []
            for track in tracks:
                formatted_track = {
                    'id': track['id'],
                    'name': track['name'],
                    'artists': track['artists'],
                    'album': track['album'],
                    'popularity': track['popularity'],
                    'preview_url': None,  # Spotify removed preview URLs from Web API
                    'external_urls': track['external_urls'],
                    'duration_ms': track['duration_ms'],
                    'explicit': track['explicit']
                }
                formatted_tracks.append(formatted_track)
            
            return formatted_tracks
            
        except Exception as e:
            print(f"Error searching tracks: {e}")
            return []
    
    async def get_recommendations_for_vibe_mode(self, vibe_mode: str, user_top_tracks: List[Dict] = None) -> List[Dict]:
        """Get tracks for a vibe mode using search (not recommendations API)"""
        try:
            all_tracks = []
            
            # Vibe-specific searches
            vibe_searches = [
                f"{vibe_mode} music",
                f"popular {vibe_mode}",
                f"{vibe_mode} hits",
                f"trending {vibe_mode}",
                f"best {vibe_mode} songs",
                f"{vibe_mode} 2024",
                f"{vibe_mode} 2023",
                f"top {vibe_mode} artists"
            ]
            
            # Search for vibe-specific tracks
            for search_term in vibe_searches:
                try:
                    tracks = await self.search_tracks(search_term, 30)
                    all_tracks.extend(tracks)
                    print(f"Found {len(tracks)} tracks for '{search_term}'")
                except Exception as e:
                    print(f"Failed to search for '{search_term}': {e}")
            
            # Add popular artists
            popular_artists = [
                "Drake", "Taylor Swift", "The Weeknd", "Billie Eilish", "Ariana Grande",
                "Ed Sheeran", "Post Malone", "Dua Lipa", "Olivia Rodrigo", "Harry Styles",
                "Bad Bunny", "Travis Scott", "Kendrick Lamar", "J. Cole", "Future"
            ]
            
            for artist in popular_artists:
                try:
                    tracks = await self.search_tracks(f"artist:{artist}", 25)
                    all_tracks.extend(tracks)
                except Exception as e:
                    print(f"Failed to search for artist '{artist}': {e}")
            
            # Remove duplicates
            unique_tracks = []
            seen_ids = set()
            for track in all_tracks:
                if track['id'] not in seen_ids:
                    unique_tracks.append(track)
                    seen_ids.add(track['id'])
            
            print(f"Found {len(unique_tracks)} unique tracks for vibe mode")
            return unique_tracks[:300]  # Return up to 300 tracks
            
        except Exception as e:
            print(f"Error getting recommendations for vibe mode: {e}")
            return []
    
    async def get_user_playlists(self) -> List[Dict]:
        """Get user's playlists (requires user authentication)"""
        try:
            # This would need user access token in production
            # For now, return empty list as this requires user auth
            return []
        except Exception as e:
            print(f"Error getting user playlists: {e}")
            return []
    
    async def get_playlist_tracks(self, playlist_id: str) -> List[Dict]:
        """Get tracks from a playlist (requires user authentication)"""
        try:
            # This would need user access token in production
            # For now, return empty list as this requires user auth
            return []
        except Exception as e:
            print(f"Error getting playlist tracks: {e}")
            return []
    
    async def like_track(self, track_id: str, access_token: str) -> bool:
        """Like a track (requires user authentication)"""
        try:
            if not access_token:
                print("No access token provided for liking track")
                return False
                
            # Use direct API call with query parameters
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.put(
                    f"https://api.spotify.com/v1/me/tracks?ids={track_id}",
                    headers=headers
                )
                
                print(f"🎵 Spotify API Response - Like Track {track_id}: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"✅ Successfully liked track: {track_id}")
                    return True
                elif response.status_code == 401:
                    print(f"❌ Authentication failed for track {track_id}: {response.text}")
                    return False
                else:
                    print(f"❌ Error liking track {track_id}: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            if "401" in str(e) or "expired" in str(e).lower():
                print(f"Access token expired for liking track: {e}")
                return False
            print(f"Error liking track: {e}")
            return False
    
    async def unlike_track(self, track_id: str, access_token: str) -> bool:
        """Unlike a track (requires user authentication)"""
        try:
            if not access_token:
                print("No access token provided for unliking track")
                return False
                
            # Use direct API call with query parameters for DELETE
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"https://api.spotify.com/v1/me/tracks?ids={track_id}",
                    headers=headers
                )
                
                print(f"🎵 Spotify API Response - Unlike Track {track_id}: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"✅ Successfully unliked track: {track_id}")
                    return True
                elif response.status_code == 401:
                    print(f"❌ Authentication failed for track {track_id}: {response.text}")
                    return False
                else:
                    print(f"❌ Error unliking track {track_id}: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            if "401" in str(e) or "expired" in str(e).lower():
                print(f"Access token expired for unliking track: {e}")
                return False
            print(f"Error unliking track: {e}")
            return False
    
    async def get_recommendations(self, seed_tracks: List[str], limit: int = 20) -> List[Dict]:
        """Get track recommendations based on seed tracks"""
        try:
            recommendations = self.sp.recommendations(
                seed_tracks=seed_tracks[:5],  # Max 5 seed tracks
                limit=limit
            )
            
            tracks = recommendations['tracks']
            formatted_tracks = []
            
            for track in tracks:
                formatted_track = {
                    'id': track['id'],
                    'name': track['name'],
                    'artists': track['artists'],
                    'album': track['album'],
                    'popularity': track['popularity'],
                    'preview_url': None,  # Spotify removed preview URLs from Web API
                    'external_urls': track['external_urls'],
                    'duration_ms': track['duration_ms'],
                    'explicit': track['explicit']
                }
                formatted_tracks.append(formatted_track)
            
            return formatted_tracks
            
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []
    
    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Get current user profile"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            return user_sp.current_user()
        except Exception as e:
            print(f"Error getting user profile: {e}")
            return {}
    
    async def get_user_top_tracks(self, access_token: str, time_range: str = "medium_term", limit: int = 50) -> List[Dict]:
        """Get user's top tracks"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            results = user_sp.current_user_top_tracks(time_range=time_range, limit=limit)
            return results['items']
        except Exception as e:
            print(f"Error getting user top tracks: {e}")
            return []
    
    async def get_user_top_artists(self, access_token: str, time_range: str = "medium_term", limit: int = 50) -> List[Dict]:
        """Get user's top artists"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            results = user_sp.current_user_top_artists(time_range=time_range, limit=limit)
            return results['items']
        except Exception as e:
            print(f"Error getting user top artists: {e}")
            return []
    
    async def get_user_playlists(self, access_token: str, limit: int = 50) -> List[Dict]:
        """Get user's playlists"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            results = user_sp.current_user_playlists(limit=limit)
            return results['items']
        except Exception as e:
            print(f"Error getting user playlists: {e}")
            return []
    
    async def get_playlist_tracks(self, access_token: str, playlist_id: str, limit: int = 100) -> List[Dict]:
        """Get tracks from a specific playlist"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            results = user_sp.playlist_tracks(playlist_id, limit=limit)
            return [item['track'] for item in results['items'] if item['track']]
        except Exception as e:
            print(f"Error getting playlist tracks: {e}")
            return []
    
    async def create_playlist(self, access_token: str, name: str, description: str = "", public: bool = False) -> Dict[str, Any]:
        """Create a new playlist for the user"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            user = user_sp.current_user()
            playlist = user_sp.user_playlist_create(
                user['id'], 
                name, 
                public=public, 
                description=description
            )
            return playlist
        except Exception as e:
            print(f"Error creating playlist: {e}")
            return {}
    
    async def add_tracks_to_playlist(self, access_token: str, playlist_id: str, track_uris: List[str]) -> bool:
        """Add tracks to a playlist"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            user_sp.playlist_add_items(playlist_id, track_uris)
            return True
        except Exception as e:
            print(f"Error adding tracks to playlist: {e}")
            return False
    
    async def remove_tracks_from_playlist(self, access_token: str, playlist_id: str, track_uris: List[str]) -> bool:
        """Remove tracks from a playlist"""
        try:
            user_sp = self.get_user_spotify_client(access_token)
            user_sp.playlist_remove_specific_occurrences_of_items(playlist_id, track_uris)
            return True
        except Exception as e:
            print(f"Error removing tracks from playlist: {e}")
            return False
    
    async def search_tracks(self, query: str, limit: int = 20) -> List[Dict]:
        """Search for tracks"""
        try:
            results = self.sp.search(q=query, type='track', limit=limit)
            tracks = results['tracks']['items']
            
            # Remove preview_url since Spotify removed it from Web API
            for track in tracks:
                if 'preview_url' in track:
                    track['preview_url'] = None
            
            return tracks
        except Exception as e:
            print(f"Error searching tracks: {e}")
            return []
    
    async def get_audio_features(self, track_ids: List[str]) -> List[Dict]:
        """Get audio features for tracks"""
        try:
            if not track_ids:
                return []
            
            # Process in batches of 100 (Spotify API limit)
            all_features = []
            for i in range(0, len(track_ids), 100):
                batch = track_ids[i:i + 100]
                features = self.sp.audio_features(batch)
                all_features.extend(features)
            
            return [f for f in all_features if f is not None]
        except Exception as e:
            print(f"Error getting audio features: {e}")
            return []
    
    async def get_recommendations_for_vibe_mode(self, vibe_mode: str, user_top_tracks: List[Dict], limit: int = 300) -> List[Dict]:
        """Get recommendations for a specific vibe mode using search-based approach"""
        try:
            all_tracks = []
            
            # Vibe-specific search terms
            vibe_searches = [
                f"{vibe_mode} music",
                f"popular {vibe_mode}",
                f"{vibe_mode} hits",
                f"trending {vibe_mode}",
                f"best {vibe_mode} songs",
                f"{vibe_mode} 2024",
                f"{vibe_mode} 2023",
                f"top {vibe_mode} artists"
            ]
            
            # Search for vibe-specific tracks
            for search_term in vibe_searches:
                try:
                    tracks = await self.search_tracks(search_term, 30)
                    all_tracks.extend(tracks)
                except Exception as e:
                    print(f"Error searching for '{search_term}': {e}")
            
            # Add popular tracks by searching for well-known artists
            popular_artists = [
                "Drake", "Taylor Swift", "The Weeknd", "Billie Eilish", "Ariana Grande",
                "Ed Sheeran", "Post Malone", "Dua Lipa", "Olivia Rodrigo", "Harry Styles",
                "Bad Bunny", "Travis Scott", "Kendrick Lamar", "J. Cole", "Future"
            ]
            
            for artist in popular_artists:
                try:
                    tracks = await self.search_tracks(f"artist:{artist}", 25)
                    all_tracks.extend(tracks)
                except Exception as e:
                    print(f"Error searching for artist '{artist}': {e}")
            
            # Remove duplicates by ID first
            unique_tracks = []
            seen_ids = set()
            for track in all_tracks:
                if track['id'] not in seen_ids:
                    unique_tracks.append(track)
                    seen_ids.add(track['id'])
            
            # Then remove duplicates by track name (case-insensitive)
            seen_names = set()
            final_tracks = []
            for track in unique_tracks:
                track_name = track['name'].lower().strip()
                if track_name not in seen_names:
                    seen_names.add(track_name)
                    final_tracks.append(track)
            
            print(f"🎵 Deduplication: {len(all_tracks)} -> {len(unique_tracks)} (by ID) -> {len(final_tracks)} (by name)")
            return final_tracks[:limit]
        except Exception as e:
            print(f"Error getting recommendations for vibe mode: {e}")
            return []
