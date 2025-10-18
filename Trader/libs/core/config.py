from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables.

    Uses .env if present. All fields are optional initially to allow running in read-only mode.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Messaging
    discord_bot_token: Optional[str] = Field(default=None, alias="DISCORD_BOT_TOKEN")
    discord_watch_channel_id: Optional[str] = Field(default=None, alias="DISCORD_WATCH_CHANNEL_ID")
    discord_post_channel_id: Optional[str] = Field(default=None, alias="DISCORD_POST_CHANNEL_ID")
    telegram_bot_token: Optional[str] = Field(default=None, alias="TELEGRAM_BOT_TOKEN")

    # Exchanges
    hyperliquid_api_key: Optional[str] = Field(default=None, alias="HYPERLIQUID_API_KEY")
    hyperliquid_api_secret: Optional[str] = Field(default=None, alias="HYPERLIQUID_API_SECRET")
    deriw_api_key: Optional[str] = Field(default=None, alias="DERIW_API_KEY")
    deriw_api_secret: Optional[str] = Field(default=None, alias="DERIW_API_SECRET")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Returns:
        Settings: The loaded application settings.
    """
    return Settings()  # type: ignore[call-arg]
