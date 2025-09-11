import { SpotifyTrack } from '../types/music';

const ML_BACKEND_URL = 'https://lyrafy-backend.loca.lt'; // Change this to your backend URL

export interface TrackAnalysisRequest {
  user_id: string;
  top_tracks: SpotifyTrack[];
}

export interface RecommendationRequest {
  user_id: string;
  vibe_mode: string;
  limit?: number;
  exclude_track_ids?: string[];
}

export interface InteractionRequest {
  user_id: string;
  track_id: string;
  action: 'like' | 'dislike' | 'skip';
  timestamp?: number;
}

export interface RecommendationResponse {
  recommendations: SpotifyTrack[];
  confidence_scores: number[];
  reasons: string[][];
}

export interface UserProfile {
  user_id: string;
  preferences: {
    genres: Record<string, number>;
    artists: Record<string, number>;
    decades: Record<string, number>;
    moods: Record<string, number>;
  };
  confidence: number;
  total_interactions: number;
}

class MLBackendService {
  private baseUrl: string;

  constructor(baseUrl: string = ML_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze user's music taste and create ML profile
   */
  async analyzeTaste(userId: string, topTracks: SpotifyTrack[]): Promise<UserProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze-taste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          top_tracks: topTracks,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error analyzing taste:', error);
      throw error;
    }
  }

  /**
   * Get ML-powered recommendations
   */
  async getRecommendations(
    userId: string,
    vibeMode: string,
    limit: number = 50,
    excludeTrackIds: string[] = []
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/get-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          vibe_mode: vibeMode,
          limit,
          exclude_track_ids: excludeTrackIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      throw error;
    }
  }

  /**
   * Record user interaction for ML learning
   */
  async recordInteraction(
    userId: string,
    trackId: string,
    action: 'like' | 'dislike' | 'skip',
    timestamp?: number
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/record-interaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          track_id: trackId,
          action,
          timestamp: timestamp || Date.now() / 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error recording interaction:', error);
      // Don't throw error for interaction recording to avoid breaking the UI
    }
  }

  /**
   * Get user's ML profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`${this.baseUrl}/user-profile/${userId}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Retrain ML model for user
   */
  async retrainModel(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/retrain-model/${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.retrained;
    } catch (error) {
      console.error('Error retraining model:', error);
      return false;
    }
  }

  /**
   * Check if backend is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

export const mlBackendService = new MLBackendService();
