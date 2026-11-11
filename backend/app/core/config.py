from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "training"
    app_mode: str = "training"
    training_ack: bool = True
    database_url: str = "postgresql+psycopg://vulnmarket:vulnmarket_local@localhost:5432/vulnmarket"
    redis_url: str = "redis://localhost:6379/0"
    keys_dir: str = "./keys"
    jwt_issuer: str = "https://vulnmarket.local"
    jwt_audience: str = "vulnmarket-web"
    access_ttl_seconds: int = 900
    refresh_ttl_seconds: int = 604800
    partial_ttl_seconds: int = 300
    otp_ttl_seconds: int = 300
    ctf_enabled: bool = False
    ctf_base_url: str = ""
    ctf_api_token: str = ""
    ctf_event_path: str = "/events"
    ctf_timeout_seconds: float = 3.0
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    @property
    def training_allowed(self) -> bool:
        return self.environment in ("local", "training", "development") and self.training_ack


@lru_cache
def get_settings() -> Settings:
    return Settings()
