# Admin guide

- Sign in as `admin`. Overview shows platform statistics and the audit feed (failed logins, lab objective events).
- Configuration: switch Training / Secure mode (applies immediately). Training mode is refused when `ENVIRONMENT` is not local/training/development.
- Lab management: reset one lab's data (e.g. LAB-08 removes reviews with markup, LAB-05 reverts escalated roles, LAB-04 restores customer passwords and clears sessions). Other labs are untouched.
- Review moderation: hide or approve reviews.
- CTF integration: set `CTF_ENABLED`, `CTF_BASE_URL`, `CTF_API_TOKEN`, `CTF_EVENT_PATH` in the environment; see `/api/integration/contract`.
- Full wipe: `./reset.sh`.
