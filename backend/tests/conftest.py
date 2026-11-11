import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app import seed
from app.core.mode import set_mode
from app.core.security import PUBLIC_KEY_PEM
from app.db import SessionLocal
from app.main import app

PASSWORD = "Shop#Pass2026"
ADMIN_PASSWORD = "Adm1n#Market2026"


@pytest.fixture(scope="session", autouse=True)
def fresh_database():
    seed.run(reset=True)
    yield


@pytest.fixture()
def client():
    with TestClient(app, base_url="http://localhost") as c:
        yield c


@pytest.fixture()
def training():
    with SessionLocal() as db:
        set_mode(db, "training")
    yield
    with SessionLocal() as db:
        set_mode(db, "training")


@pytest.fixture()
def secure():
    with SessionLocal() as db:
        set_mode(db, "secure")
    yield
    with SessionLocal() as db:
        set_mode(db, "training")


def login(client, username, password=PASSWORD):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def forge_hs256(claims: dict, key: bytes = PUBLIC_KEY_PEM) -> str:
    header = b64e(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = b64e(json.dumps(claims).encode())
    sig = hmac.new(key, f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{b64e(sig)}"


def admin_claims(sub=1):
    ts = int(time.time())
    return {"sub": str(sub), "role": "admin", "sid": "forged", "stage": "full", "typ": "access", "iss": "https://vulnmarket.local", "aud": "vulnmarket-web", "iat": ts, "exp": ts + 600}
