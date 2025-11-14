from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
from dotenv import load_dotenv
import os
 
from models.database import get_db
from models.user_interactions import UserInteraction
from models.track_features import TrackFeatures
from models.user_profiles import UserProfile
from services.ml_service import MLService
from services.spotify_service import SpotifyService
from services.deezer_service import DeezerService
from services.auth_service import AuthService
from services.ai_music_service import AIMusicService

# Load environment variables from parent directory
load_dotenv(dotenv_path="../.env")

app = FastAPI(title="Lyrafy ML Backend", version="1.0.0")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your React Native app's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
ml_service = MLService()
spotify_service = SpotifyService()
deezer_service = DeezerService()
auth_service = AuthService()
ai_music_service = AIMusicService()

# Pydantic models for API requests/responses
class TrackAnalysisRequest(BaseModel):
    user_id: str
    top_tracks: List[Dict[str, Any]]

class RecommendationRequest(BaseModel):
    user_id: str
    vibe_mode: str
    limit: int = 50
    exclude_track_ids: List[str] = []

class InteractionRequest(BaseModel):
    user_id: str
    track_id: str
    action: str  # "like", "dislike", "skip"
    timestamp: Optional[float] = None

class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    confidence_scores: List[float]
    reasons: List[List[str]]

@app.get("/")
async def root():
    return {"message": "Lyrafy ML Backend is running!"}

@app.post("/analyze-taste")
async def analyze_taste(request: TrackAnalysisRequest):
    """Analyze user's music taste from top tracks and create initial profile"""
    try:
        # Extract track features
        track_features = await spotify_service.get_track_features(request.top_tracks)
        
        # Create user profile using ML
        profile = await ml_service.create_user_profile(
            user_id=request.user_id,
            top_tracks=request.top_tracks,
            track_features=track_features
        )
        
        return {
            "user_id": request.user_id,
            "profile_created": True,
            "preferences": profile.preferences,
            "confidence": profile.confidence
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get ML-powered music recommendations for a user"""
    try:
        recommendations = await ml_service.get_recommendations(
            user_id=request.user_id,
            vibe_mode=request.vibe_mode,
            limit=request.limit,
            exclude_track_ids=request.exclude_track_ids
        )
        
        return RecommendationResponse(
            recommendations=recommendations["tracks"],
            confidence_scores=recommendations["confidence_scores"],
            reasons=recommendations["reasons"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/record-interaction")
async def record_interaction(request: InteractionRequest):
    """Record user interaction (like/dislike/skip) for learning"""
    try:
        await ml_service.record_interaction(
            user_id=request.user_id,
            track_id=request.track_id,
            action=request.action,
            timestamp=request.timestamp
        )
        
        return {"status": "success", "message": "Interaction recorded"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-profile/{user_id}")
async def get_user_profile(user_id: str):
    """Get user's current ML profile"""
    try:
        profile = await ml_service.get_user_profile(user_id)
        return profile
    except Exception as e:
        raise HTTPException(status_code=404, detail="User profile not found")

@app.post("/retrain-model/{user_id}")
async def retrain_user_model(user_id: str):
    """Retrain ML model for a specific user with new interaction data"""
    try:
        success = await ml_service.retrain_user_model(user_id)
        return {"status": "success", "retrained": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Spotify API endpoints
@app.post("/spotify/auth-url")
async def get_spotify_auth_url():
    """Get Spotify OAuth URL"""
    try:
        auth_url = await auth_service.get_spotify_auth_url()
        return {"auth_url": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/exchange-code")
async def exchange_spotify_code(request: dict):
    """Exchange authorization code for access token"""
    try:
        result = await auth_service.exchange_code_for_token(request["code"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/user-top-tracks")
async def get_user_top_tracks(time_range: str = "medium_term", limit: int = 50):
    """Get user's top tracks"""
    try:
        tracks = await spotify_service.get_user_top_tracks(time_range, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/search")
async def search_spotify_tracks(query: str, limit: int = 20):
    """Search for tracks on Spotify"""
    try:
        tracks = await spotify_service.search_tracks(query, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/recommendations-for-vibe")
async def get_recommendations_for_vibe(request: dict):
    """Get tracks for a vibe mode using search"""
    try:
        vibe_mode = request.get("vibe_mode", "")
        user_top_tracks = request.get("user_top_tracks", [])
        tracks = await spotify_service.get_recommendations_for_vibe_mode(vibe_mode, user_top_tracks)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/playlists")
async def get_user_playlists(access_token: str, limit: int = 50):
    """Get user's playlists"""
    try:
        playlists = await spotify_service.get_user_playlists(access_token, limit)
        return {"playlists": playlists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/playlist/{playlist_id}/tracks")
async def get_playlist_tracks(playlist_id: str, access_token: str):
    """Get tracks from a playlist"""
    try:
        tracks = await spotify_service.get_playlist_tracks(access_token, playlist_id)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/like-track")
async def like_track(request: dict):
    """Like a track on Spotify"""
    try:
        track_id = request.get("track_id")
        access_token = request.get("access_token")
        
        if not track_id:
            raise HTTPException(status_code=400, detail="track_id is required")
        if not access_token:
            raise HTTPException(status_code=400, detail="access_token is required")
            
        result = await spotify_service.like_track(track_id, access_token)
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/unlike-track")
async def unlike_track(request: dict):
    """Unlike a track on Spotify"""
    try:
        track_id = request.get("track_id")
        access_token = request.get("access_token")
        
        if not track_id:
            raise HTTPException(status_code=400, detail="track_id is required")
        if not access_token:
            raise HTTPException(status_code=400, detail="access_token is required")
            
        result = await spotify_service.unlike_track(track_id, access_token)
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Deezer API endpoints
@app.get("/deezer/search")
async def search_deezer_tracks(query: str, limit: int = 20):
    """Search tracks on Deezer"""
    try:
        tracks = await deezer_service.search_tracks(query, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deezer/track/{track_id}")
async def get_deezer_track(track_id: str):
    """Get track details from Deezer"""
    try:
        track = await deezer_service.get_track(track_id)
        return {"track": track}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deezer/preview/{track_id}")
async def get_deezer_preview(track_id: str):
    """Get track preview URL from Deezer"""
    try:
        preview_url = await deezer_service.get_preview_url(track_id)
        return {"preview_url": preview_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI Music Service endpoints
@app.post("/ai/analyze-taste")
async def analyze_music_taste(request: TrackAnalysisRequest):
    """Analyze music taste using AI"""
    try:
        result = await ml_service.analyze_music_taste_ai(request.user_id, request.top_tracks)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/find-similar-tracks")
async def find_similar_tracks(request: dict):
    """Find similar tracks using AI"""
    try:
        similar_tracks = await ml_service.find_similar_tracks_ai(
            request["exclude_track_ids"],
            request.get("limit", 50)
        )
        return {"similar_tracks": similar_tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/generate-vibe-name")
async def generate_vibe_name():
    """Generate a random vibe mode name"""
    try:
        name = await ml_service.generate_vibe_mode_name()
        return {"name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Authentication endpoints
@app.get("/auth/authorize")
async def get_authorization_url():
    """Get Spotify authorization URL with PKCE"""
    try:
        auth_data = auth_service.get_authorization_url()
        return auth_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/token")
async def exchange_code_for_tokens(request: dict):
    """Exchange authorization code for tokens"""
    try:
        code = request.get("code")
        session_id = request.get("session_id")
        
        if not code or not session_id:
            raise HTTPException(status_code=400, detail="code and session_id are required")
        
        tokens = await auth_service.exchange_code_for_tokens(code, session_id)
        return tokens
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/refresh")
async def refresh_access_token(request: dict):
    """Refresh access token"""
    try:
        refresh_token = request.get("refresh_token")
        if not refresh_token:
            raise HTTPException(status_code=400, detail="refresh_token is required")
        
        tokens = await auth_service.refresh_access_token(refresh_token)
        return tokens
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/auth/profile")
async def get_user_profile(access_token: str):
    """Get current user profile"""
    try:
        profile = await auth_service.get_user_profile(access_token)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/validate")
async def validate_token(request: dict):
    """Validate access token"""
    try:
        access_token = request.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="access_token is required")
        
        is_valid = await auth_service.validate_token(access_token)
        return {"valid": is_valid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced Spotify endpoints
@app.get("/spotify/user-profile")
async def get_spotify_user_profile(access_token: str):
    """Get Spotify user profile"""
    try:
        profile = await spotify_service.get_user_profile(access_token)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/user-top-tracks")
async def get_spotify_user_top_tracks(access_token: str, time_range: str = "medium_term", limit: int = 50):
    """Get user's top tracks"""
    try:
        tracks = await spotify_service.get_user_top_tracks(access_token, time_range, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/user-top-artists")
async def get_spotify_user_top_artists(access_token: str, time_range: str = "medium_term", limit: int = 50):
    """Get user's top artists"""
    try:
        artists = await spotify_service.get_user_top_artists(access_token, time_range, limit)
        return {"artists": artists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/user-playlists")
async def get_spotify_user_playlists(access_token: str, limit: int = 50):
    """Get user's playlists"""
    try:
        playlists = await spotify_service.get_user_playlists(access_token, limit)
        return {"playlists": playlists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/playlist-tracks")
async def get_spotify_playlist_tracks(access_token: str, playlist_id: str, limit: int = 100):
    """Get tracks from a playlist"""
    try:
        tracks = await spotify_service.get_playlist_tracks(access_token, playlist_id, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/create-playlist")
async def create_spotify_playlist(request: dict):
    """Create a new playlist"""
    try:
        access_token = request.get("access_token")
        name = request.get("name")
        description = request.get("description", "")
        public = request.get("public", False)
        
        if not access_token or not name:
            raise HTTPException(status_code=400, detail="access_token and name are required")
        
        playlist = await spotify_service.create_playlist(access_token, name, description, public)
        return playlist
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/add-tracks-to-playlist")
async def add_tracks_to_spotify_playlist(request: dict):
    """Add tracks to a playlist"""
    try:
        access_token = request.get("access_token")
        playlist_id = request.get("playlist_id")
        track_uris = request.get("track_uris", [])
        
        if not access_token or not playlist_id or not track_uris:
            raise HTTPException(status_code=400, detail="access_token, playlist_id, and track_uris are required")
        
        success = await spotify_service.add_tracks_to_playlist(access_token, playlist_id, track_uris)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/remove-tracks-from-playlist")
async def remove_tracks_from_spotify_playlist(request: dict):
    """Remove tracks from a playlist"""
    try:
        access_token = request.get("access_token")
        playlist_id = request.get("playlist_id")
        track_uris = request.get("track_uris", [])
        
        if not access_token or not playlist_id or not track_uris:
            raise HTTPException(status_code=400, detail="access_token, playlist_id, and track_uris are required")
        
        success = await spotify_service.remove_tracks_from_playlist(access_token, playlist_id, track_uris)
        return {"success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/spotify/search")
async def search_spotify_tracks(query: str, limit: int = 20):
    """Search for tracks on Spotify"""
    try:
        tracks = await spotify_service.search_tracks(query, limit)
        return {"tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/spotify/audio-features")
async def get_spotify_audio_features(request: dict):
    """Get audio features for tracks"""
    try:
        track_ids = request.get("track_ids", [])
        features = await spotify_service.get_audio_features(track_ids)
        return {"features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI Music Analysis endpoints
@app.post("/ai/analyze-taste")
async def analyze_music_taste(request: dict):
    """Analyze user's music taste"""
    try:
        user_id = request.get("user_id")
        top_tracks = request.get("top_tracks", [])
        
        if not user_id or not top_tracks:
            raise HTTPException(status_code=400, detail="user_id and top_tracks are required")
        
        taste_profile = ai_music_service.analyze_music_taste(user_id, top_tracks)
        return taste_profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/find-similar-tracks")
async def find_similar_tracks_ai(request: dict):
    """Find similar tracks using AI"""
    try:
        user_id = request.get("user_id")
        available_tracks = request.get("available_tracks", [])
        exclude_track_ids = request.get("exclude_track_ids", [])
        limit = request.get("limit", 50)
        
        if not user_id or not available_tracks:
            raise HTTPException(status_code=400, detail="user_id and available_tracks are required")
        
        similar_tracks = ai_music_service.find_similar_tracks(user_id, available_tracks, exclude_track_ids, limit)
        return {"similar_tracks": similar_tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/generate-vibe-name")
async def generate_ai_vibe_name(user_id: str):
    """Generate a vibe mode name based on taste profile"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        name = ai_music_service.generate_vibe_mode_name(user_id)
        return {"name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ai/taste-profile")
async def get_taste_profile(user_id: str):
    """Get stored taste profile for user"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        profile = ai_music_service.get_taste_profile(user_id)
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "ml_service": "active", "spotify_service": "active", "deezer_service": "active", "auth_service": "active", "ai_music_service": "active"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
