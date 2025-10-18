## Project planning: TR Learner + Trader (MVP)

### Goals
- Build a modular Python system to integrate messaging (Discord/Telegram) and exchanges (Hyperliquid, Deriw), with a stable control API.
- Prioritize integrations first; strategy/learning agents come after integrations are verified.
- Operate 24/7 via a small runtime (API + schedulers), with clear separation of read-only vs trade-enabled modes.

### Architecture (Phase 1: Integrations)
- apps/api: FastAPI service exposing health and integrations status endpoints.
- libs/core: Shared config loader and types using Pydantic.
- libs/adapters:
  - messaging: Discord/Telegram adapters (stubs for now, with config validation).
  - exchange: Base adapter interface; Hyperliquid stub; Deriw placeholder.
- configs: .env.example with required keys (no secrets committed).
- tests: pytest suites for config and adapters.

### Conventions
- Language: Python, PEP8, type hints, `black` formatting.
- Validation: Pydantic models; settings via `pydantic-settings`.
- APIs: FastAPI; do not require secrets to run locally in read-only mode.
- File size: keep files under 500 LOC and split by responsibility.

### Future phases (post-integration)
- Data ingestion (live candles), TR primitives, and rule-based setups.
- Learner agent ingesting daily TR content → Playbook of the Day (RAG).
- Paper execution, risk controls, and optional live trading with strict caps.
- Orchestration and scheduling for 24/7 runtime.

### Security
- Secrets via environment variables; never commit real keys.
- Feature flags to separate read-only from trade-enabled behaviors.




