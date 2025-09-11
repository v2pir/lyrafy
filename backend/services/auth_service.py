import os
import secrets
import hashlib
import base64
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

class AuthService:
    def __init__(self):
        # Load environment variables from parent directory
        load_dotenv(dotenv_path="../.env")
        self.client_id = os.getenv("EXPO_PUBLIC_SPOTIFY_CLIENT_ID")
        self.client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
        self.redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI", "http://localhost:3000/callback")
        self.scopes = "user-read-private user-read-email user-top-read user-read-recently-played user-library-read user-library-modify user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-private playlist-modify-public"
        
        # Store active auth sessions (in production, use Redis or database)
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
    
    def generate_pkce_challenge(self) -> tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        # Generate code verifier (43-128 characters, URL-safe)
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Generate code challenge (SHA256 hash of verifier, base64url encoded)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        
        return code_verifier, code_challenge
    
    def get_authorization_url(self) -> Dict[str, str]:
        """Generate Spotify authorization URL with PKCE"""
        code_verifier, code_challenge = self.generate_pkce_challenge()
        
        # Store code verifier for later use
        session_id = secrets.token_urlsafe(32)
        self.active_sessions[session_id] = {
            'code_verifier': code_verifier,
            'state': secrets.token_urlsafe(16)
        }
        
        # Build authorization URL
        auth_params = {
            'response_type': 'code',
            'client_id': self.client_id,
            'scope': self.scopes,
            'redirect_uri': self.redirect_uri,
            'code_challenge_method': 'S256',
            'code_challenge': code_challenge,
            'state': self.active_sessions[session_id]['state']
        }
        
        auth_url = "https://accounts.spotify.com/authorize?" + "&".join([
            f"{key}={value}" for key, value in auth_params.items()
        ])
        
        return {
            'auth_url': auth_url,
            'session_id': session_id
        }
    
    async def exchange_code_for_tokens(self, code: str, session_id: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        if session_id not in self.active_sessions:
            raise ValueError("Invalid session ID")
        
        session_data = self.active_sessions[session_id]
        code_verifier = session_data['code_verifier']
        
        # Prepare token request
        token_data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri,
            'client_id': self.client_id,
            'code_verifier': code_verifier
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://accounts.spotify.com/api/token',
                data=token_data,
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Token exchange failed: {response.text}")
            
            token_response = response.json()
            
            # Clean up session
            del self.active_sessions[session_id]
            
            return {
                'access_token': token_response['access_token'],
                'refresh_token': token_response.get('refresh_token'),
                'expires_in': token_response['expires_in'],
                'token_type': token_response['token_type']
            }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        token_data = {
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token,
            'client_id': self.client_id
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                'https://accounts.spotify.com/api/token',
                data=token_data,
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")
            
            return response.json()
    
    async def get_user_profile(self, access_token: str) -> Dict[str, Any]:
        """Get current user profile from Spotify"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                'https://api.spotify.com/v1/me',
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get user profile: {response.text}")
            
            return response.json()
    
    async def validate_token(self, access_token: str) -> bool:
        """Validate if access token is still valid"""
        try:
            await self.get_user_profile(access_token)
            return True
        except:
            return False
    
    def clear_session(self, session_id: str):
        """Clear session data"""
        if session_id in self.active_sessions:
            del self.active_sessions[session_id]