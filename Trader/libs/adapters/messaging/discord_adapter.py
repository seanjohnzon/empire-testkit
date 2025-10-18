from __future__ import annotations

from typing import Optional


class DiscordAdapter:
    """Minimal adapter stub for Discord messaging.

    Only validates configuration presence in this phase.
    """

    def __init__(self, token: Optional[str]) -> None:
        self._token = token

    def is_configured(self) -> bool:
        """Return True if token is present (non-empty)."""
        return bool(self._token and self._token.strip())

    async def send_message(self, channel_id: str, content: str) -> None:
        """Placeholder: no-op send in Phase 1."""
        if not self.is_configured():
            raise RuntimeError("Discord adapter not configured")
        # No real API calls in Phase 1
        return None







