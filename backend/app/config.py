import os
from dotenv import load_dotenv

# Explicitly load .env from project root
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
load_dotenv(dotenv_path=env_path, override=True)
load_dotenv(override=True)

class Settings:
    PROJECT_NAME: str = "AI Student Super Assistant"
    
    @property
    def GEMINI_API_KEY(self) -> str:
        # Reload env in case it was created/updated after server start
        load_dotenv(dotenv_path=env_path, override=True)
        return os.getenv("GEMINI_API_KEY", "").strip()

    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_change_in_production_123456789")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./student_assistant.db")
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "backend/uploads")

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
