# API

Interactive OpenAPI: `/docs` (Swagger) and `/openapi.json`.

Groups: `/api/auth/*`, `/api/users/*`, `/api/products/*`, `/api/categories`, `/api/cart/*`, `/api/orders/*`, `/api/invoices/*`, `/api/reviews`, `/api/seller/*`, `/api/admin/*`, `/api/labs/*`, `/api/integration/contract`, `/api/health`, `/api/dev/mailbox` (training only).
Server-rendered lab pages: `/legacy/search`, `/promo/flash-sale`.

Auth: `Authorization: Bearer <access token>`. Refresh with `POST /api/auth/refresh`. MFA accounts receive `partial_token` then call `POST /api/auth/verify-otp`.
All traffic passes through Nginx on port 8080 and can be proxied through Burp Suite.
