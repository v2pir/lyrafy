import httpx
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

class DeezerService:
    def __init__(self):
        # Load environment variables from parent directory
        load_dotenv(dotenv_path="../.env")
        self.base_url = "https://api.deezer.com"
    
    async def search_tracks(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search for tracks on Deezer"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/search/track",
                    params={"q": query, "limit": limit}
                )
                response.raise_for_status()
                data = response.json()
                
                tracks = []
                for track in data.get("data", []):
                    formatted_track = {
                        "id": str(track["id"]),
                        "title": track["title"],
                        "artist": {
                            "id": str(track["artist"]["id"]),
                            "name": track["artist"]["name"]
                        },
                        "album": {
                            "id": str(track["album"]["id"]),
                            "title": track["album"]["title"],
                            "cover_medium": track["album"]["cover_medium"]
                        },
                        "preview": track.get("preview"),
                        "duration": track["duration"],
                        "link": track["link"]
                    }
                    tracks.append(formatted_track)
                
                return tracks
        except Exception as e:
            print(f"Error searching Deezer tracks: {e}")
            return []
    
    async def get_track(self, track_id: str) -> Optional[Dict[str, Any]]:
        """Get track details from Deezer"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/track/{track_id}")
                response.raise_for_status()
                track = response.json()
                
                return {
                    "id": str(track["id"]),
                    "title": track["title"],
                    "artist": {
                        "id": str(track["artist"]["id"]),
                        "name": track["artist"]["name"]
                    },
                    "album": {
                        "id": str(track["album"]["id"]),
                        "title": track["album"]["title"],
                        "cover_medium": track["album"]["cover_medium"]
                    },
                    "preview": track.get("preview"),
                    "duration": track["duration"],
                    "link": track["link"]
                }
        except Exception as e:
            print(f"Error getting Deezer track {track_id}: {e}")
            return None
    
    async def get_preview_url(self, track_id: str) -> Optional[str]:
        """Get preview URL for a track"""
        try:
            track = await self.get_track(track_id)
            return track.get("preview_url") if track else None
        except Exception as e:
            print(f"Error getting preview URL for track {track_id}: {e}")
            return None
    
    async def search_tracks_by_spotify_info(self, spotify_track: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Search for a track on Deezer using Spotify track info"""
        try:
            # Create search query from Spotify track info
            artist_name = spotify_track.get("artists", [{}])[0].get("name", "")
            track_name = spotify_track.get("name", "")
            
            if not artist_name or not track_name:
                return None
            
            # Search with artist and track name
            query = f'artist:"{artist_name}" track:"{track_name}"'
            tracks = await self.search_tracks(query, 5)
            
            if not tracks:
                # Fallback to simple search
                query = f"{artist_name} {track_name}"
                tracks = await self.search_tracks(query, 5)
            
            # Return the first match
            return tracks[0] if tracks else None
            
        except Exception as e:
            print(f"Error searching Deezer for Spotify track: {e}")
            return None
