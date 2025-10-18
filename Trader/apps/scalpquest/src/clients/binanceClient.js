import ccxt from 'ccxt';

export function createBinanceClient() {
  const apiKey = process.env.BINANCE_API_KEY;
  const secret = process.env.BINANCE_SECRET_KEY;

  return new ccxt.binance({
    enableRateLimit: true,
    apiKey: apiKey || undefined,
    secret: secret || undefined,
  });
}

export async function fetchSimpleMarkets(exchange) {
  const markets = await exchange.loadMarkets();
  return Object.values(markets).map((m) => ({
    symbol: m.symbol,
    base: m.base,
    quote: m.quote,
    spot: Boolean(m.spot),
    active: m.active !== false,
  }));
}




