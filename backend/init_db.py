#!/usr/bin/env python3
"""
Initialize the database with tables
"""
from models.database import create_tables, engine
from models.user_interactions import UserInteraction
from models.track_features import TrackFeatures
from models.user_profiles import UserProfile

def init_database():
    """Create all database tables"""
    print("Creating database tables...")
    create_tables()
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_database()
