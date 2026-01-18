"""
Script for initializing the database.
Usage: python init_db.py
"""

from app.database import Base, engine

def init_db():
    """Creating all tables in database"""
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")


if __name__ == "__main__":
    init_db()
