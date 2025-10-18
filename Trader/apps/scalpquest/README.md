# ScalpQuest Node Backend

A minimal Express backend with Supabase client and CCXT (Binance) for ScalpQuest.

## Requirements
- Node.js 18+

## Install
```bash
cd apps/scalpquest
npm install
```

## Environment
Set environment variables in your shell or runtime. An `env.example` file is provided as reference.

Required/optional variables:
- PORT (default: 3001)
- SUPABASE_URL (optional)
- SUPABASE_ANON_KEY (optional)
- BINANCE_API_KEY (optional; required for private endpoints)
- BINANCE_SECRET_KEY (optional; required for private endpoints)
- OPENAI_API_KEY (optional)

## Run
```bash
# Dev
npm run dev

# Prod
npm start
```

Server listens on http://localhost:$PORT.

## Endpoints
- GET `/health`: health check
- GET `/binance/markets`: returns a simplified list of Binance markets (public)

## Notes
- No `.env` loader is bundled; provide environment variables via your process manager or shell.
- CCXT rate limiting is enabled by default.


