from fastapi import FastAPI
from pydantic import BaseModel

from libs.core.config import get_settings
from libs.adapters.messaging.discord_adapter import DiscordAdapter
from libs.adapters.messaging.telegram_adapter import TelegramAdapter
from libs.adapters.exchange.hyperliquid import HyperliquidAdapter
from libs.adapters.exchange.deriw import DeriwAdapter


class HealthResponse(BaseModel):
    """Health check response model."""

    ok: bool


class IntegrationStatus(BaseModel):
    """Integration configuration status."""

    name: str
    configured: bool


class IntegrationsResponse(BaseModel):
    """Overall integrations status response model."""

    integrations: list[IntegrationStatus]


app = FastAPI(title="Trader API", version="0.1.0")


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Return a simple health status."""
    return HealthResponse(ok=True)


@app.get("/integrations", response_model=IntegrationsResponse)
async def integrations() -> IntegrationsResponse:
    """Return whether each integration is configured (based on env settings)."""
    settings = get_settings()

    discord = DiscordAdapter(token=settings.discord_bot_token)
    telegram = TelegramAdapter(token=settings.telegram_bot_token)
    hyperliquid = HyperliquidAdapter(
        api_key=settings.hyperliquid_api_key, api_secret=settings.hyperliquid_api_secret
    )
    deriw = DeriwAdapter(api_key=settings.deriw_api_key, api_secret=settings.deriw_api_secret)

    statuses: list[IntegrationStatus] = [
        IntegrationStatus(name="discord", configured=discord.is_configured()),
        IntegrationStatus(name="telegram", configured=telegram.is_configured()),
        IntegrationStatus(name="hyperliquid", configured=hyperliquid.is_configured()),
        IntegrationStatus(name="deriw", configured=deriw.is_configured()),
    ]
    return IntegrationsResponse(integrations=statuses)







