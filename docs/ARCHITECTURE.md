# Architecture

- `backend/app/routers/*` API grouped by business area (auth, users, products, orders, reviews, seller, admin, labs, legacy pages).
- `backend/app/core/mode.py` runtime mode (training / secure). Every vulnerable branch checks `is_training()`; secure mode runs the corrected code path.
- `backend/app/core/security.py` RS256 signing, secure verifier (algorithm allowlist, issuer, audience, exp, required claims) and the deliberately flawed verifier used only in training mode.
- `backend/app/core/flags_config.py` the single static flag file (never generated, never modified).
- `backend/app/integration/ctf.py` configurable outbound hook.
- `frontend/src` shared design system (`components/ui`), layouts (store and dashboards), pages per interface.

## External CTF contract
`GET /api/integration/contract` (admin) lists labs and the event shape. When `CTF_ENABLED=true`, a `lab.objective_reached` event `{lab_id, participant, mode, occurred_at}` is POSTed to `CTF_BASE_URL + CTF_EVENT_PATH`. Flags are never transmitted. The platform owns validation, scoring, submissions and completion.

## Flag delivery
A flag appears only in the response or browser state produced by the exploit itself (see LAB_SOLUTIONS.md). It never appears in the frontend bundle, normal API responses or the lab catalogue; tests assert this.
