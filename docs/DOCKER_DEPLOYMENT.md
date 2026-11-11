# Docker deployment

Services: db (postgres:16, persistent volume `pgdata`), redis, backend (FastAPI, healthcheck `/api/health`), frontend (static build served by nginx), nginx (reverse proxy, published on 127.0.0.1:8080 only).

Env files: `.env.training` (vulnerable scenarios on), `.env.development` (secure default). Choose with `ENV_FILE=...`.
Startup creates tables and seeds deterministic data automatically. RSA test keys are generated once into the `keys` volume.
Status: compose file validated with `docker compose config`; images were not built in the authoring sandbox (no Docker daemon), so run the first build yourself and report problems.
