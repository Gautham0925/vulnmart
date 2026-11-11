# Database schema

Tables: roles, permissions, users, addresses, categories, products, product_images, inventory, carts, cart_items, orders, order_items, invoices, reviews, authentication_sessions, refresh_tokens, otp_challenges, password_reset_requests, simulated_emails, security_labs, training_secrets, app_settings, audit_logs, wishlists.

Notes
- Primary keys on every table; foreign keys for ownership (orders.user_id, order_items.seller_id, products.seller_id); unique constraints on username, email, sku, order_number, invoice_number, token hashes, cart item pairs.
- Indexes on users.username/email/role, products.title/category/seller, orders.user_id, audit_logs.created_at.
- Intentionally omitted (external platform owns them): lab_flags, lab_submissions, lab_progress, achievements.
- `training_secrets` holds the LAB-10 flag so the single SQL-injection field can reach it.
- Schema is created with SQLAlchemy metadata on start; seeding is deterministic (`app/seed.py`). Alembic migrations are not yet generated.
