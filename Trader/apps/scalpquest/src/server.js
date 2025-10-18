import express from 'express';
import { createBinanceClient, fetchSimpleMarkets } from './clients/binanceClient.js';
import { getSupabaseClient } from './clients/supabaseClient.js';

const app = express();

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Simple markets endpoint (read-only)
app.get('/binance/markets', async (_req, res) => {
  try {
    const binance = createBinanceClient();
    const markets = await fetchSimpleMarkets(binance);
    res.json({ count: markets.length, markets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets', details: String(error?.message || error) });
  }
});

// Example: initialize Supabase if env provided (not required to run)
const supabase = getSupabaseClient();
if (!supabase) {
  // eslint-disable-next-line no-console
  console.log('Supabase credentials not provided. Skipping Supabase initialization.');
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ScalpQuest backend listening on http://localhost:${port}`);
});




