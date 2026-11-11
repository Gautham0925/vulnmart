from urllib.parse import unquote

from app.core.flags_config import LAB_FLAGS
from tests.conftest import ADMIN_PASSWORD, PASSWORD, admin_claims, auth, forge_hs256, login

EXPECTED = {
    "LAB-01": "FLAG{U$@RNAM€_€NUM€RATION_001}",
    "LAB-02": "FLAG{PA$$WORD_R€$€T_€NUM_002}",
    "LAB-03": "FLAG{IDOR_ORD€R_ACC€$$_003}",
    "LAB-04": "FLAG{BROK€N_AUTH_004}",
    "LAB-05": "FLAG{V€RTICAL_PRIV_€$C_005}",
    "LAB-06": "FLAG{HORIZONTAL_PRIV_€$C_006}",
    "LAB-07": "FLAG{R€FL€CT€D_X$$_007}",
    "LAB-08": "FLAG{$TOR€D_X$$_008}",
    "LAB-09": "FLAG{DOM_BA$€D_X$$_009}",
    "LAB-10": "FLAG{$QL_INJ€CTION_010}",
    "LAB-11": "FLAG{JWT_K€Y_CONFU$ION_011}",
    "LAB-12": "FLAG{HALF_AUTH_BYPASS_012}",
}
SQLI = "zzz%' UNION SELECT 1,name,value,0,0,0,NULL,NULL FROM training_secrets--"


def test_flag_config_exact():
    assert LAB_FLAGS == EXPECTED
    assert len(set(LAB_FLAGS.values())) == 12


def test_no_flags_in_participant_catalog(client, training):
    token = login(client, "alice.morgan")["access_token"]
    body = client.get("/api/labs", headers=auth(token)).text
    assert "FLAG{" not in body
    assert body.count("LAB-") >= 12


def test_lab01_username_enumeration(client, training):
    unknown = client.post("/api/auth/login", json={"username": "nobody.here", "password": "x"})
    known = client.post("/api/auth/login", json={"username": "alice.morgan", "password": "wrong"})
    assert unknown.status_code == 404 and known.status_code == 401
    hidden = client.post("/api/auth/login", json={"username": "vault.audit", "password": "wrong"})
    assert hidden.json()["detail"]["audit_reference"] == EXPECTED["LAB-01"]
    assert "FLAG{" not in known.text


def test_lab01_secure(client, secure):
    a = client.post("/api/auth/login", json={"username": "nobody.here", "password": "x"})
    b = client.post("/api/auth/login", json={"username": "vault.audit", "password": "wrong"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()
    assert "FLAG{" not in b.text


def test_lab02_reset_enumeration(client, training):
    assert client.post("/api/auth/forgot-password", json={"identifier": "ghost.user"}).status_code == 404
    r = client.post("/api/auth/forgot-password", json={"identifier": "ops.recovery"})
    assert r.json()["recovery_ticket"] == EXPECTED["LAB-02"]


def test_lab02_secure(client, secure):
    a = client.post("/api/auth/forgot-password", json={"identifier": "ghost.user"})
    b = client.post("/api/auth/forgot-password", json={"identifier": "ops.recovery"})
    assert a.status_code == b.status_code == 200 and a.json() == b.json()


def test_lab03_idor(client, training):
    token = login(client, "alice.morgan")["access_token"]
    found = None
    for oid in range(1, 40):
        r = client.get(f"/api/orders/{oid}", headers=auth(token))
        if r.status_code == 200 and r.json()["gift_message"]:
            found = r.json()
            break
    assert found and found["gift_message"] == EXPECTED["LAB-03"]
    inv = client.get(f"/api/invoices/{found['invoice_id']}", headers=auth(token))
    assert inv.status_code == 200


def test_lab03_secure(client, secure):
    token = login(client, "alice.morgan")["access_token"]
    me = client.get("/api/users/me", headers=auth(token)).json()["id"]
    leaked = []
    for oid in range(1, 40):
        r = client.get(f"/api/orders/{oid}", headers=auth(token))
        if r.status_code == 200 and r.json()["user_id"] != me:
            leaked.append(oid)
    assert leaked == []


def test_lab04_refresh_after_logout(client, training):
    tokens = login(client, "bob.carter")
    client.post("/api/auth/logout", headers=auth(tokens["access_token"]))
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.status_code == 200 and r.json()["session_audit"]["reference"] == EXPECTED["LAB-04"]


def test_lab04_refresh_after_password_change(client, training):
    tokens = login(client, "dave.patel")
    ch = client.post("/api/auth/change-password", headers=auth(tokens["access_token"]), json={"current_password": PASSWORD, "new_password": "Changed#Pass2026"})
    assert ch.status_code == 200
    r = client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert r.json()["session_audit"]["reference"] == EXPECTED["LAB-04"]
    again = client.post("/api/auth/login", json={"username": "dave.patel", "password": "Changed#Pass2026"})
    client.post("/api/auth/change-password", headers=auth(again.json()["access_token"]), json={"current_password": "Changed#Pass2026", "new_password": PASSWORD})


def test_lab04_secure(client, secure):
    tokens = login(client, "carol.nguyen")
    assert client.post("/api/auth/logout", headers=auth(tokens["access_token"])).status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401
    assert client.get("/api/users/me", headers=auth(tokens["access_token"])).status_code == 401


def test_lab05_vertical_escalation(client, training):
    token = login(client, "frank.osei")["access_token"]
    assert client.get("/api/admin/overview", headers=auth(token)).status_code == 403
    assert client.patch("/api/users/me", headers=auth(token), json={"role": "admin"}).status_code == 200
    token2 = login(client, "frank.osei")["access_token"]
    r = client.get("/api/admin/overview", headers=auth(token2))
    assert r.status_code == 200 and r.json()["compliance_banner"] == EXPECTED["LAB-05"]
    legit = login(client, "admin", ADMIN_PASSWORD)["access_token"]
    assert "compliance_banner" not in client.get("/api/admin/overview", headers=auth(legit)).json()
    from tests.conftest import SessionLocal
    from app.labs.reset import reset_lab
    with SessionLocal() as db:
        reset_lab(db, "LAB-05")
    assert client.get("/api/admin/overview", headers=auth(login(client, "frank.osei")["access_token"])).status_code == 403


def test_lab05_secure(client, secure):
    token = login(client, "erin.kowalski")["access_token"]
    client.patch("/api/users/me", headers=auth(token), json={"role": "admin"})
    token2 = login(client, "erin.kowalski")["access_token"]
    assert client.get("/api/admin/overview", headers=auth(token2)).status_code == 403
    assert client.get("/api/users/me", headers=auth(token2)).json()["role"] == "customer"


def test_lab06_horizontal(client, training):
    token = login(client, "alice.morgan")["access_token"]
    me = client.get("/api/users/me", headers=auth(token)).json()["id"]
    hits = []
    for uid in range(1, 30):
        if uid == me:
            continue
        r = client.get(f"/api/users/{uid}/addresses", headers=auth(token))
        if r.status_code == 200 and any(a["delivery_notes"] == EXPECTED["LAB-06"] for a in r.json()):
            hits.append(uid)
    assert len(hits) == 1


def test_lab06_secure(client, secure):
    token = login(client, "alice.morgan")["access_token"]
    me = client.get("/api/users/me", headers=auth(token)).json()["id"]
    codes = {client.get(f"/api/users/{uid}/addresses", headers=auth(token)).status_code for uid in range(1, 25) if uid != me}
    assert codes == {403}


def test_lab07_reflected_xss(client, training):
    r = client.get("/legacy/search", params={"q": "<script>alert(1)</script>"})
    assert "<script>alert(1)</script>" in r.text
    assert unquote(r.cookies.get("vm_lab07")) == EXPECTED["LAB-07"]
    assert "vm_lab07" not in client.get("/legacy/search", params={"q": "phone"}).headers.get("set-cookie", "")


def test_lab07_secure(client, secure):
    r = client.get("/legacy/search", params={"q": "<script>alert(1)</script>"})
    assert "<script>alert(1)</script>" not in r.text and "&lt;script&gt;" in r.text
    assert "vm_lab07" not in r.headers.get("set-cookie", "")


def test_lab08_stored_xss(client, training):
    token = login(client, "grace.holt".replace("grace.holt", "bob.carter"))["access_token"]
    payload = '<img src=x onerror=alert(document.cookie)>'
    assert client.post("/api/reviews", headers=auth(token), json={"product_id": 3, "rating": 4, "title": "t", "body": payload}).status_code == 201
    r = client.get("/api/products/3/reviews")
    assert any(payload in x["body_html"] for x in r.json())
    assert unquote(r.cookies.get("vm_lab08")) == EXPECTED["LAB-08"]
    from tests.conftest import SessionLocal
    from app.labs.reset import reset_lab
    with SessionLocal() as db:
        reset_lab(db, "LAB-08")
    assert not any(payload in x["body_html"] for x in client.get("/api/products/3/reviews").json())


def test_lab08_secure(client, secure):
    token = login(client, "bob.carter")["access_token"]
    payload = '<img src=x onerror=alert(1)>'
    client.post("/api/reviews", headers=auth(token), json={"product_id": 4, "rating": 4, "title": "t", "body": payload})
    r = client.get("/api/products/4/reviews")
    assert all("<img" not in x["body_html"] for x in r.json())
    assert "vm_lab08" not in r.headers.get("set-cookie", "")
    from tests.conftest import SessionLocal
    from app.labs.reset import reset_lab
    with SessionLocal() as db:
        reset_lab(db, "LAB-08")


def test_lab09_dom_xss(client, training):
    r = client.get("/promo/flash-sale")
    assert ".innerHTML" in r.text and "location.hash" in r.text
    assert unquote(r.cookies.get("vm_lab09")) == EXPECTED["LAB-09"]


def test_lab09_secure(client, secure):
    r = client.get("/promo/flash-sale")
    assert ".innerHTML" not in r.text and ".textContent" in r.text
    assert "vm_lab09" not in r.headers.get("set-cookie", "")


def test_lab10_sqli_single_field(client, training):
    r = client.get("/api/products/search", params={"q": SQLI})
    assert r.status_code == 200
    assert any(EXPECTED["LAB-10"] in (i["brand"] or "") for i in r.json()["items"])
    other = client.get("/api/products/search", params={"q": "phone", "category": "x' OR '1'='1"})
    assert other.json()["total"] == 0
    listing = client.get("/api/products", params={"category": "x' OR '1'='1"})
    assert listing.json()["total"] == 0
    assert "FLAG{" not in client.get("/api/products/search", params={"q": "phone"}).text


def test_lab10_secure(client, secure):
    r = client.get("/api/products/search", params={"q": SQLI})
    assert r.status_code == 200 and r.json()["total"] == 0
    assert "FLAG{" not in r.text


def test_lab11_jwt_key_confusion(client, training):
    pem = client.get("/api/auth/public-key.pem").content
    assert pem.startswith(b"-----BEGIN PUBLIC KEY-----")
    token = forge_hs256(admin_claims(1), pem)
    r = client.get("/api/admin/vault", headers=auth(token))
    assert r.status_code == 200 and r.json()["key_audit"] == EXPECTED["LAB-11"]
    legit = login(client, "admin", ADMIN_PASSWORD)["access_token"]
    ok = client.get("/api/admin/vault", headers=auth(legit))
    assert ok.status_code == 200 and "key_audit" not in ok.json()
    bad = client.get("/api/admin/vault", headers=auth(forge_hs256(admin_claims(1), b"wrong-key")))
    assert bad.status_code == 401


def test_lab11_secure(client, secure):
    pem = client.get("/api/auth/public-key.pem").content
    r = client.get("/api/admin/vault", headers=auth(forge_hs256(admin_claims(1), pem)))
    assert r.status_code == 401
    legit = login(client, "admin", ADMIN_PASSWORD)["access_token"]
    assert client.get("/api/admin/vault", headers=auth(legit)).status_code == 200


def test_lab12_half_open_auth(client, training):
    step1 = client.post("/api/auth/login", json={"username": "grace.holt", "password": PASSWORD}).json()
    assert step1["mfa_required"] is True and "access_token" not in step1
    partial = step1["partial_token"]
    assert client.get("/api/cart", headers=auth(partial)).status_code == 403
    r = client.get("/api/account/security-overview", headers=auth(partial))
    assert r.status_code == 200 and r.json()["partial_session_notice"] == EXPECTED["LAB-12"]


def test_lab12_secure_and_otp_flow(client, secure):
    step1 = client.post("/api/auth/login", json={"username": "grace.holt", "password": PASSWORD}).json()
    partial = step1["partial_token"]
    assert client.get("/api/account/security-overview", headers=auth(partial)).status_code == 403
    assert client.get("/api/cart", headers=auth(partial)).status_code == 403
    from tests.conftest import SessionLocal
    from app.models import SimulatedEmail
    import re
    with SessionLocal() as db:
        mail = db.query(SimulatedEmail).filter(SimulatedEmail.to_address == "grace.holt@example.com").order_by(SimulatedEmail.id.desc()).first()
    code = re.search(r"(\d{6})", mail.body).group(1)
    bad = client.post("/api/auth/verify-otp", headers=auth(partial), json={"challenge_id": step1["challenge_id"], "code": "000000" if code != "000000" else "111111"})
    assert bad.status_code == 401
    ok = client.post("/api/auth/verify-otp", headers=auth(partial), json={"challenge_id": step1["challenge_id"], "code": code})
    assert ok.status_code == 200
    full = ok.json()["access_token"]
    assert client.get("/api/account/security-overview", headers=auth(full)).status_code == 200
