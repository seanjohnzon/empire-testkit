from __future__ import annotations

from typing import Optional

from . import ExchangeAdapter, Credentials


class DeriwAdapter(ExchangeAdapter):
    """Placeholder for Deriw exchange integration.

    Phase 1: only configuration checks.
    """

    def __init__(self, api_key: Optional[str], api_secret: Optional[str]) -> None:
        self._creds = Credentials(api_key, api_secret)

    def is_configured(self) -> bool:
        return self._creds.ok()







