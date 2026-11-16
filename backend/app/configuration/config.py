import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IS_SERVERLESS = os.environ.get("VERCEL") == "1" or "AWS_LAMBDA_FUNCTION_NAME" in os.environ

if IS_SERVERLESS:
    DEFAULT_DB_FILE = "/tmp/netlink_dev.db"
    # Copy pre-existing SQLite database to /tmp if it exists and /tmp DB doesn't exist
    bundled_db_candidates = [
        os.path.join(BASE_DIR, "netlink_dev.db"),
        os.path.join(BASE_DIR, "backend", "netlink_dev.db"),
        os.path.join(os.path.dirname(BASE_DIR), "backend", "netlink_dev.db"),
        os.path.join(os.path.dirname(BASE_DIR), "netlink_dev.db"),
    ]
    if not os.path.exists(DEFAULT_DB_FILE):
        for candidate in bundled_db_candidates:
            if os.path.exists(candidate):
                try:
                    import shutil
                    shutil.copyfile(candidate, DEFAULT_DB_FILE)
                    break
                except Exception:
                    pass
else:
    for candidate in [
        os.path.join(BASE_DIR, "netlink_dev.db"),
        os.path.join(BASE_DIR, "backend", "netlink_dev.db"),
        os.path.join(os.path.dirname(BASE_DIR), "netlink_dev.db"),
    ]:
        if os.path.exists(candidate):
            DEFAULT_DB_FILE = candidate
            break
    else:
        DEFAULT_DB_FILE = os.path.join(BASE_DIR, "netlink_dev.db")

# Normalize backslashes for SQLite URI on Windows
SQLITE_DEFAULT_URL = f"sqlite:///{DEFAULT_DB_FILE.replace('\\', '/')}"

class Settings(BaseSettings):
    APP_NAME: str = "netSEED Hub API"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    DEBUG: bool = True
    
    DATABASE_URL: str = SQLITE_DEFAULT_URL
    
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-supabase-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-supabase-service-role-key"
    JWT_SECRET: str = "super-secret-dev-jwt-key-netlink-2026"
    JWT_ALGORITHM: str = "HS256"

    # Attendance, Biometrics & Geofence Settings
    NETLINK_OFFICE_LAT: float = 23.111861
    NETLINK_OFFICE_LON: float = 77.515744
    GEOFENCE_RADIUS_METERS: float = 100.0
    GPS_MAX_ACCURACY_METERS: float = 150.0
    FACE_MATCH_THRESHOLD: float = 0.40
    FACE_DUPLICATE_THRESHOLD: float = 0.65
    LIVENESS_MIN_SCORE: float = 0.65
    MIN_FACE_QUALITY_SCORE: float = 0.55

    MIN_SAMPLES_FOR_ENROLLMENT: int = 3
    MAX_SAMPLES_FOR_ENROLLMENT: int = 5

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
