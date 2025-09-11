from sqlalchemy import Column, String, Float, Integer, Text, JSON, DateTime
from sqlalchemy.sql import func
from .database import Base

class TrackFeatures(Base):
    """Store track audio features and metadata for ML analysis"""
    __tablename__ = "track_features"
    
    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    artists = Column(JSON)  # List of artist names
    genres = Column(JSON)  # List of genres
    
    # Audio features from Spotify
    tempo = Column(Float)
    energy = Column(Float)
    danceability = Column(Float)
    valence = Column(Float)
    acousticness = Column(Float)
    instrumentalness = Column(Float)
    loudness = Column(Float)
    speechiness = Column(Float)
    liveness = Column(Float)
    key = Column(Integer)
    mode = Column(Integer)
    time_signature = Column(Integer)
    
    # Additional metadata
    popularity = Column(Integer)
    duration_ms = Column(Integer)
    explicit = Column(Integer)  # 0 or 1
    
    # ML features (computed)
    mood_features = Column(JSON)  # Computed mood indicators
    decade = Column(String)  # Computed decade
    language = Column(String)  # Detected language
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<TrackFeatures(track_id={self.track_id}, name={self.name})>"
