from sqlalchemy import Column, String, Float, DateTime, Integer, Text, JSON
from sqlalchemy.sql import func
from .database import Base

class UserProfile(Base):
    """Store learned user preferences and ML model weights"""
    __tablename__ = "user_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    
    # Learned preferences
    preferred_genres = Column(JSON)  # List of preferred genres with weights
    preferred_artists = Column(JSON)  # List of preferred artists with weights
    preferred_decades = Column(JSON)  # List of preferred decades with weights
    preferred_moods = Column(JSON)  # List of preferred moods with weights
    
    # Audio feature preferences (learned from interactions)
    tempo_preference = Column(JSON)  # {"min": 0, "max": 200, "preferred": 120}
    energy_preference = Column(JSON)  # {"min": 0, "max": 1, "preferred": 0.7}
    danceability_preference = Column(JSON)
    valence_preference = Column(JSON)
    acousticness_preference = Column(JSON)
    instrumentalness_preference = Column(JSON)
    
    # ML model weights (for neural collaborative filtering)
    model_weights = Column(JSON)  # Serialized model weights
    model_version = Column(String, default="1.0")
    
    # Learning metrics
    total_interactions = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    last_retrained = Column(DateTime(timezone=True))
    
    # Profile metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<UserProfile(user_id={self.user_id}, confidence={self.confidence_score})>"
