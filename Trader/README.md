# Trader Integrations (Phase 1)

A minimal, modular Python project to validate integrations for messaging (Discord/Telegram) and exchanges (Hyperliquid, Deriw). Strategy and learning agents will be added after integrations are proven stable.

## Requirements
- Python 3.10+

## Setup
1) Create a virtual environment and install deps:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2) Copy the example env and fill in secrets when ready (not required to run API):
```bash
cp .env.example .env
```

## Run API
```bash
uvicorn apps.api.main:app --reload --port 8000
```
- Health: GET http://localhost:8000/health
- Integrations: GET http://localhost:8000/integrations

## ScalpQuest Node Backend
Located at `apps/scalpquest`.

### Install & Run
```bash
cd apps/scalpquest
npm install
npm run dev
# or
npm start
```

### Environment
Provide environment variables via your shell or process manager. See `apps/scalpquest/env.example` for reference.

### Endpoints
- Health: GET http://localhost:3001/health
- Binance markets: GET http://localhost:3001/binance/markets

## Tests
```bash
pytest -q
```

## Notes
- No real API calls are made by stubs in this phase.
- Adapters simply validate whether configuration is present.
