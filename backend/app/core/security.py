import base64
import hashlib
import hmac
import json
import secrets
import time
from pathlib import Path

import bcrypt
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=6)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def random_token(n: int = 24) -> str:
    return secrets.token_urlsafe(n)


def _load_or_create_keys():
    keys_dir = Path(settings.keys_dir)
    keys_dir.mkdir(parents=True, exist_ok=True)
    priv_path = keys_dir / "training_private.pem"
    pub_path = keys_dir / "training_public.pem"
    if not priv_path.exists() or not pub_path.exists():
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv_path.write_bytes(
            key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )
        )
        pub_path.write_bytes(
            key.public_key().public_bytes(
                serialization.Encoding.PEM,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            )
        )
    return priv_path.read_bytes(), pub_path.read_bytes()


PRIVATE_KEY_PEM, PUBLIC_KEY_PEM = _load_or_create_keys()


def issue_token(user_id: int, role: str, sid: str, stage: str, ttl: int, kind: str = "access") -> str:
    ts = int(time.time())
    claims = {
        "sub": str(user_id),
        "role": role,
        "sid": sid,
        "stage": stage,
        "typ": kind,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": ts,
        "nbf": ts,
        "exp": ts + ttl,
        "jti": secrets.token_hex(8),
    }
    return jwt.encode(claims, PRIVATE_KEY_PEM, algorithm="RS256", headers={"kid": "vm-training-1"})


class TokenError(Exception):
    pass


def verify_token_secure(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            PUBLIC_KEY_PEM,
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "iss", "aud", "sid"]},
        )
    except jwt.PyJWTError as exc:
        raise TokenError(str(exc))


def _b64d(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def verify_token_vulnerable(token: str) -> dict:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        header = json.loads(_b64d(header_b64))
        payload = json.loads(_b64d(payload_b64))
    except Exception:
        raise TokenError("malformed token")
    alg = header.get("alg", "")
    signing_input = f"{header_b64}.{payload_b64}".encode()
    if alg == "RS256":
        return verify_token_secure(token)
    if alg == "HS256":
        expected = hmac.new(PUBLIC_KEY_PEM, signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64d(sig_b64)):
            raise TokenError("bad signature")
        payload["_alg"] = "HS256"
    else:
        raise TokenError("unsupported algorithm")
    if payload.get("exp", 0) < time.time():
        raise TokenError("token expired")
    return payload
