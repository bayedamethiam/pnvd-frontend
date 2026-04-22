"""
PNVD Backend — Configuration centrale
"""
from urllib.parse import unquote
from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = ConfigDict(extra="ignore", frozen=False, env_file=".env")
    host: str = "0.0.0.0"
    port: int = 8100
    secret_key: str = "dev-key-changez-en-production"
    database_url: str = "sqlite+aiosqlite:////data/pnvd.db"

    youtube_api_key: str = ""
    twitter_bearer_token: str = ""
    apify_api_token: str = ""
    anthropic_api_key: str = ""

    @property
    def twitter_token(self) -> str:
        """Token décodé (gère les %2F %3D URL-encodés dans le .env)."""
        return unquote(self.twitter_bearer_token)
    collect_interval_minutes: int = 15
    history_days: int = 90
    allowed_origins: str = ",".join([
        f"http://localhost:{p}" for p in range(3000, 3011)
    ] + [
        f"http://localhost:{p}" for p in range(5173, 5184)
    ] + [
        f"http://127.0.0.1:{p}" for p in range(3000, 3011)
    ] + [
        f"http://127.0.0.1:{p}" for p in range(5173, 5184)
    ] + [
        "http://localhost:8080",
        "http://localhost:4173",
        "http://localhost:4000",
        # Production
        "https://pnvd-frontend.vercel.app",
        "https://pnvd.gouv.sn",
    ])

    @property
    def origins_list(self) -> List[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def youtube_enabled(self) -> bool:
        return bool(self.youtube_api_key)

    @property
    def twitter_enabled(self) -> bool:
        return bool(self.twitter_bearer_token) or bool(self.apify_api_token)

    @property
    def apify_enabled(self) -> bool:
        return bool(self.apify_api_token)

    @property
    def nlp_enabled(self) -> bool:
        return bool(self.anthropic_api_key)



settings = Settings()
