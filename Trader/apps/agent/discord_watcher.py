import asyncio
import logging
from typing import Optional

import discord

from libs.core.config import get_settings


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class WatcherClient(discord.Client):
    def __init__(self, watch_channel_id: Optional[int], **kwargs):
        intents = kwargs.get("intents")
        super().__init__(intents=intents)
        self.watch_channel_id = watch_channel_id

    async def on_ready(self):
        logger.info("Discord watcher ready as %s (%s)", self.user, self.user.id if self.user else "?")

    async def on_message(self, message: discord.Message):
        if self.user and message.author.id == self.user.id:
            return
        if self.watch_channel_id and message.channel.id != self.watch_channel_id:
            return
        logger.info("[%s] %s: %s", message.channel.id, message.author, message.content[:300])


async def main():
    settings = get_settings()
    token = settings.discord_bot_token
    if not token:
        raise RuntimeError("DISCORD_BOT_TOKEN not set")

    watch_id: Optional[int] = None
    if settings.discord_watch_channel_id and settings.discord_watch_channel_id.isdigit():
        watch_id = int(settings.discord_watch_channel_id)

    intents = discord.Intents.default()
    intents.message_content = True  # Requires enabling in the Discord Developer Portal

    client = WatcherClient(watch_channel_id=watch_id, intents=intents)
    await client.start(token)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass







