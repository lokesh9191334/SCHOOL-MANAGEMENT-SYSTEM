import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_very_secret_key_that_should_be_changed'
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if database_url and database_url.startswith("postgres://"):
        # Render provides postgres:// but SQLAlchemy requires postgresql://
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    SQLALCHEMY_DATABASE_URI = database_url or 'sqlite:///site.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Development mode settings
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    DISABLE_RATE_LIMITING = os.environ.get('DISABLE_RATE_LIMITING', 'False').lower() == 'true'

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID = "1067127402112-8vn79rh4ri67sp66fjmu32l69l36t92p.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET = "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"
    GOOGLE_DISCOVERY_URL = (
        "https://accounts.google.com/.well-known/openid-configuration"
    )
