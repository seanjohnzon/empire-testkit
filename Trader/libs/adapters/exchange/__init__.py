from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class ExchangeAdapter(ABC):
    """Base interface for exchange adapters."""

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if credentials are available."""
        raise NotImplementedError

    # Future methods: fetch_ticker, place_order, etc.


class Credentials:
    """Simple credentials holder."""

    def __init__(self, api_key: Optional[str], api_secret: Optional[str]) -> None:
        self.api_key = api_key
        self.api_secret = api_secret

    def ok(self) -> bool:
        return bool(self.api_key and self.api_key.strip() and self.api_secret and self.api_secret.strip())







