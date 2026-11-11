# VulnMarket

Shop. Explore. Exploit. Learn.

An intentionally vulnerable e-commerce platform for **authorised, local** web application security training. One interconnected shop (storefront, customer, seller, admin, security-lab portal) hosts 12 vulnerabilities in real business workflows.

## Stack
React 18 + TypeScript + Vite + Tailwind, FastAPI + SQLAlchemy + Pydantic, PostgreSQL, Redis (reserved), Nginx, Docker Compose.

## Quick start
```
docker compose up -d --build
open http://localhost:8080
```
See INSTALLATION.md for local (non-Docker) development.

## Scoring model
This app does **not** validate flags, score or track completion. Each exploited vulnerability reveals its static flag; submit it on your external CTF platform. See SECURITY_BOUNDARIES.md and ARCHITECTURE.md (CTF contract).

## Seed accounts
| Role | Username | Password |
|---|---|---|
| Admin | admin | Adm1n#Market2026 |
| Admin | ops.admin | 0ps#Market2026 |
| Seller | techhub / stylehouse / homenest / pagebarn | Seller#Tech2026 / Seller#Style2026 / Seller#Home2026 / Seller#Page2026 |
| Customer | alice.morgan, bob.carter, carol.nguyen, dave.patel, erin.kowalski, frank.osei | Shop#Pass2026 |
| Customer (MFA) | grace.holt | Shop#Pass2026 (OTP in simulated inbox) |

Do not hand this list to participants; it is instructor material.
