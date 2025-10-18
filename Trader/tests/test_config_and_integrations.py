import os
import importlib
import asyncio

import pytest


def test_import_api_app():
    # Ensure the FastAPI app imports without env
    module = importlib.import_module("apps.api.main")
    assert hasattr(module, "app")


def test_settings_defaults():
    from libs.core import config as core_config

    # clear cached settings
    core_config.get_settings.cache_clear()  # type: ignore[attr-defined]
    settings = core_config.get_settings()
    assert settings.discord_bot_token is None
    assert settings.telegram_bot_token is None


def test_adapters_configuration_flags():
    from libs.adapters.messaging.discord_adapter import DiscordAdapter
    from libs.adapters.messaging.telegram_adapter import TelegramAdapter
    from libs.adapters.exchange.hyperliquid import HyperliquidAdapter
    from libs.adapters.exchange.deriw import DeriwAdapter

    d = DiscordAdapter(None)
    t = TelegramAdapter("")
    h = HyperliquidAdapter(None, None)
    w = DeriwAdapter("key", None)

    assert d.is_configured() is False
    assert t.is_configured() is False
    assert h.is_configured() is False
    assert w.is_configured() is False


@pytest.mark.parametrize(
    "env,expected",
    [
        ({"DISCORD_BOT_TOKEN": "x"}, True),
        ({"TELEGRAM_BOT_TOKEN": "y"}, True),
        ({"HYPERLIQUID_API_KEY": "a", "HYPERLIQUID_API_SECRET": "b"}, True),
        ({"DERIW_API_KEY": "c", "DERIW_API_SECRET": "d"}, True),
    ],
)
def test_integration_status_endpoint(monkeypatch, env, expected):
    # Set environment vars for this test
    for k, v in env.items():
        monkeypatch.setenv(k, v)

    # Clear cached settings so the app sees the new env
    from libs.core import config as core_config

    core_config.get_settings.cache_clear()  # type: ignore[attr-defined]

    import apps.api.main as api_main
    importlib.reload(api_main)

    # Run the async handler
    result = asyncio.run(api_main.integrations())

    # Validate at least one of the requested integration flags is True
    configured_map = {it.name: it.configured for it in result.integrations}
    assert any(configured_map.get(name) for name in configured_map.keys())
