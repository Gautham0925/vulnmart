# Lab solutions (INSTRUCTORS ONLY - do not expose to participants)

## Flags
| Lab | Flag |
|---|---|
| LAB-01 | `FLAG{U$@RNAM€_€NUM€RATION_001}` |
| LAB-02 | `FLAG{PA$$WORD_R€$€T_€NUM_002}` |
| LAB-03 | `FLAG{IDOR_ORD€R_ACC€$$_003}` |
| LAB-04 | `FLAG{BROK€N_AUTH_004}` |
| LAB-05 | `FLAG{V€RTICAL_PRIV_€$C_005}` |
| LAB-06 | `FLAG{HORIZONTAL_PRIV_€$C_006}` |
| LAB-07 | `FLAG{R€FL€CT€D_X$$_007}` |
| LAB-08 | `FLAG{$TOR€D_X$$_008}` |
| LAB-09 | `FLAG{DOM_BA$€D_X$$_009}` |
| LAB-10 | `FLAG{$QL_INJ€CTION_010}` |
| LAB-11 | `FLAG{JWT_K€Y_CONFU$ION_011}` |
| LAB-12 | `FLAG{HALF_AUTH_BYPASS_012}` |

Defined only in `backend/app/core/flags_config.py`. Validation happens on the external CTF platform.

## Solutions
**LAB-01** `POST /api/auth/login`: unknown user returns 404 "No account found"; known user with wrong password returns 401 "Incorrect password". Brute-force a username list; the hidden account `vault.audit` returns `audit_reference` (flag). Fix: one generic 401, constant-time hashing, throttling.

**LAB-02** `POST /api/auth/forgot-password`: 404 vs 200 reveals accounts. Hidden `ops.recovery` returns `recovery_ticket` (flag). Fix: identical response and async mail.

**LAB-03** `GET /api/orders/{id}` has no ownership check. Iterate ids; the order whose `gift_message` holds the flag belongs to carol.nguyen. Invoices (`/api/invoices/{id}`) have the same flaw. Fix: filter by `user_id`.

**LAB-04** Log in, keep the refresh token, log out (or change password), then `POST /api/auth/refresh`. Training mode accepts it and returns `session_audit.reference` (flag). Fix: revoke sessions and refresh tokens on logout and password change, rotate on use.

**LAB-05** `PATCH /api/users/me {"role":"admin"}` (mass assignment), sign in again, call `GET /api/admin/overview`; `compliance_banner` carries the flag. Fix: allowlisted fields, role from server state.

**LAB-06** `GET /api/users/{id}/addresses` trusts the path id. erin.kowalski's Office address `delivery_notes` holds the flag. Fix: use the token identity.

**LAB-07** `/legacy/search?q=<img src=x onerror=alert(document.cookie)>`; cookie `vm_lab07` (URL-encoded) holds the flag; decode it. Fix: HTML-encode output, CSP.

**LAB-08** Post a review with markup (`<img src=x onerror=alert(document.cookie)>`) on any product; the page renders `body_html` raw; cookie `vm_lab08` holds the flag. Fix: escape server-side, do not use dangerouslySetInnerHTML.

**LAB-09** `/promo/flash-sale#<img src=x onerror=alert(document.cookie)>`; script writes `location.hash` via `innerHTML`; cookie `vm_lab09` holds the flag. Fix: `textContent`, Trusted Types.

**LAB-10** Only `q` on `GET /api/products/search` is concatenated. 8 columns: `zzz%' UNION SELECT 1,name,value,0,0,0,NULL,NULL FROM training_secrets--`; the flag appears as a product brand. Category, price and sort stay parameterised or whitelisted. Fix: bind parameters.

**LAB-11** Fetch `/api/auth/public-key.pem` (exact bytes), forge an HS256 token (`sub`=1, `role`=admin, valid `iss`, `aud`, `exp`) using the PEM as the HMAC secret, call `GET /api/admin/vault`; `key_audit` holds the flag. Fix: pinned `algorithms=["RS256"]`, typed keys (secure verifier already does this).

**LAB-12** Log in as grace.holt; the response contains `partial_token` only. `GET /api/cart` returns 403, but `GET /api/account/security-overview` accepts the partial token and returns `partial_session_notice` (flag). Fix: require stage `full` everywhere except `/api/auth/verify-otp` (secure mode does).

## Delivery caveat
XSS flags are delivered through lab-scoped, non-HttpOnly cookies because the server cannot observe client-side script execution. They are only emitted on training-mode requests and, for LAB-07/LAB-08, only when markup is present in the payload; a participant reading raw `Set-Cookie` headers can see them without running script. Treat these three as instructor-verifiable.

## Verification
`python -m pytest backend/tests -q` exploits every lab in training mode and asserts the same attack fails in secure mode. `npx playwright test` runs the three XSS payloads in a real browser.
