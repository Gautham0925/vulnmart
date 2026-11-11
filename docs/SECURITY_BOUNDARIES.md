# Security boundaries

- Run only on a machine you own, bound to localhost (compose publishes 127.0.0.1:8080).
- `ENVIRONMENT=production` forces secure mode and refuses to enable training mode.
- No real payments, no external APIs, no real secrets. The JWT keypair is a generated test key stored in a volume.
- SQL injection is confined to the `q` parameter of one endpoint; all other queries are bound or whitelisted.
- Intentional weaknesses are all behind `is_training()`; tests confirm each is rejected in secure mode.
- Flags are static, live only in `flags_config.py`, and are never sent to the CTF platform by this app.
- Known limits: in-memory login throttling (single worker), Redis not yet used, `/api/dev/mailbox` is intentionally open in training mode.
