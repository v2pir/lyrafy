from sqlalchemy import Column, String, Float, DateTime, Integer, Text
from sqlalchemy.sql import func
from .database import Base

class UserInteraction(Base):
    """Store user interactions (likes, dislikes, skips) for ML learning"""
    __tablename__ = "user_interactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    track_id = Column(String, index=True, nullable=False)
    action = Column(String, nullable=False)  # "like", "dislike", "skip"
    timestamp = Column(Float, nullable=False)
    context = Column(Text)  # JSON string with additional context (vibe_mode, etc.)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<UserInteraction(user_id={self.user_id}, track_id={self.track_id}, action={self.action})>"
