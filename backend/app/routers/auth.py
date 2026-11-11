import random
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.flags_config import flag_for
from app.core.mode import is_training
from app.core.security import (
    PUBLIC_KEY_PEM, hash_password, issue_token, random_token, sha256, verify_password,
)
from app.db import get_db
from app.deps import Principal, audit, client_ip, current_principal, objective_reached, otp_principal
from app.models import (
    AuditLog, AuthSession, Cart, OtpChallenge, PasswordResetRequest, RefreshToken, SimulatedEmail, User,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()

_attempts: dict[str, list[float]] = {}
DUMMY_HASH = hash_password("dummy-password-for-timing")


def throttle(key: str, limit: int, window: int) -> None:
    nowt = time.time()
    hits = [t for t in _attempts.get(key, []) if nowt - t < window]
    if len(hits) >= limit:
        _attempts[key] = hits
        raise HTTPException(429, "Too many attempts. Please try again later.")
    hits.append(nowt)
    _attempts[key] = hits


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9._-]+$")
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    username: str = Field(max_length=160)
    password: str = Field(max_length=128)


class OtpIn(BaseModel):
    challenge_id: str
    code: str = Field(min_length=6, max_length=6)


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotIn(BaseModel):
    identifier: str = Field(max_length=160)


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


def user_public(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "phone": u.phone,
        "role": u.role,
        "mfa_enabled": u.mfa_enabled,
        "store_name": u.store_name,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def new_session(db: Session, user: User, request: Request, stage: str) -> AuthSession:
    session = AuthSession(
        sid=random_token(16),
        user_id=user.id,
        stage=stage,
        ip=client_ip(request),
        user_agent=request.headers.get("user-agent", "")[:255],
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.refresh_ttl_seconds),
    )
    db.add(session)
    db.commit()
    return session


def full_tokens(db: Session, user: User, session: AuthSession) -> dict:
    refresh_plain = random_token(32)
    db.add(
        RefreshToken(
            token_hash=sha256(refresh_plain),
            user_id=user.id,
            session_sid=session.sid,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.refresh_ttl_seconds),
        )
    )
    db.commit()
    return {
        "token_type": "Bearer",
        "access_token": issue_token(user.id, user.role, session.sid, "full", settings.access_ttl_seconds),
        "refresh_token": refresh_plain,
        "expires_in": settings.access_ttl_seconds,
        "user": user_public(user),
    }


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    exists = db.query(User).filter(or_(User.username == body.username, User.email == body.email.lower())).first()
    if exists:
        raise HTTPException(409, "An account with those details already exists")
    user = User(username=body.username, email=body.email.lower(), full_name=body.full_name, password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    db.add(Cart(user_id=user.id))
    db.commit()
    return {"message": "Account created", "user": user_public(user)}


def send_otp(db: Session, user: User) -> OtpChallenge:
    code = f"{random.SystemRandom().randrange(0, 1000000):06d}"
    challenge = OtpChallenge(
        challenge_id=random_token(16),
        user_id=user.id,
        code_hash=sha256(code),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.otp_ttl_seconds),
    )
    db.add(challenge)
    db.add(SimulatedEmail(to_address=user.email, subject="Your VulnMarket verification code", body=f"Your one-time code is {code}. It expires in 5 minutes."))
    db.commit()
    return challenge


@router.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    ident = body.username.strip()
    user = db.query(User).filter(or_(User.username == ident, User.email == ident.lower())).first()
    ip = client_ip(request)

    if is_training():
        if not user:
            audit(db, None, "auth.login_failed", f"unknown:{ident[:40]}", ip=ip)
            raise HTTPException(404, "No account found with that username")
        if not verify_password(body.password, user.password_hash):
            audit(db, user.id, "auth.login_failed", "bad_password", ip=ip)
            detail = {"detail": "Incorrect password", "attempts_remaining": 4}
            if user.username == "vault.audit":
                detail["audit_reference"] = flag_for("LAB-01")
                objective_reached(db, request, user, "LAB-01", "hidden account identified via login responses")
            raise HTTPException(401, detail=detail)
    else:
        throttle(f"login:{ip}:{ident.lower()}", 8, 300)
        ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
        if not user or not ok or not user.is_active:
            audit(db, None, "auth.login_failed", "generic", ip=ip)
            raise HTTPException(401, "Invalid username or password")

    if not user.is_active:
        raise HTTPException(403, "Account disabled")

    if user.mfa_enabled:
        session = new_session(db, user, request, "mfa_pending")
        challenge = send_otp(db, user)
        return {
            "mfa_required": True,
            "challenge_id": challenge.challenge_id,
            "partial_token": issue_token(user.id, user.role, session.sid, "password_verified", settings.partial_ttl_seconds),
            "message": "Enter the verification code sent to your email",
        }
    session = new_session(db, user, request, "authenticated")
    audit(db, user.id, "auth.login", session.sid, ip=ip)
    return full_tokens(db, user, session)


@router.post("/verify-otp")
def verify_otp(body: OtpIn, request: Request, principal: Principal = Depends(otp_principal), db: Session = Depends(get_db)):
    user = principal.user
    challenge = db.query(OtpChallenge).filter(OtpChallenge.challenge_id == body.challenge_id, OtpChallenge.user_id == user.id).first()
    if not challenge or challenge.consumed:
        raise HTTPException(400, "Verification challenge is no longer valid")
    expires = challenge.expires_at if challenge.expires_at.tzinfo else challenge.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Verification code expired")
    if challenge.attempts >= 5:
        challenge.consumed = True
        db.commit()
        raise HTTPException(429, "Too many incorrect codes")
    challenge.attempts += 1
    if sha256(body.code) != challenge.code_hash:
        db.commit()
        raise HTTPException(401, "Incorrect verification code")
    challenge.consumed = True
    old = db.query(AuthSession).filter(AuthSession.sid == principal.claims["sid"]).first()
    if old:
        old.revoked = True
    db.commit()
    session = new_session(db, user, request, "authenticated")
    audit(db, user.id, "auth.login", session.sid + ":mfa", ip=client_ip(request))
    return full_tokens(db, user, session)


@router.post("/refresh")
def refresh(body: RefreshIn, request: Request, db: Session = Depends(get_db)):
    record = db.query(RefreshToken).filter(RefreshToken.token_hash == sha256(body.refresh_token)).first()
    if not record:
        raise HTTPException(401, "Invalid refresh token")
    expires = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(401, "Refresh token expired")
    user = db.get(User, record.user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Account unavailable")
    session = db.query(AuthSession).filter(AuthSession.sid == record.session_sid).first()
    issued = record.issued_at if record.issued_at.tzinfo else record.issued_at.replace(tzinfo=timezone.utc)
    changed = user.password_changed_at if user.password_changed_at.tzinfo else user.password_changed_at.replace(tzinfo=timezone.utc)
    stale_password = issued < changed
    logged_out = db.query(AuditLog).filter(AuditLog.action == "auth.logout", AuditLog.detail == record.session_sid).first() is not None

    if not is_training():
        if record.revoked or not session or session.revoked or stale_password:
            raise HTTPException(401, "Session ended")
        record.revoked = True
        db.commit()
        return full_tokens(db, user, session)

    result = {
        "token_type": "Bearer",
        "access_token": issue_token(user.id, user.role, record.session_sid, "full", settings.access_ttl_seconds),
        "refresh_token": body.refresh_token,
        "expires_in": settings.access_ttl_seconds,
    }
    if stale_password or logged_out:
        result["session_audit"] = {"note": "Refresh token accepted after session end", "reference": flag_for("LAB-04")}
        objective_reached(db, request, user, "LAB-04", "refresh token reused after logout or password change")
    return result


@router.post("/logout")
def logout(request: Request, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    sid = principal.claims["sid"]
    audit(db, principal.user.id, "auth.logout", sid, ip=client_ip(request))
    if not is_training():
        session = db.query(AuthSession).filter(AuthSession.sid == sid).first()
        if session:
            session.revoked = True
        for rt in db.query(RefreshToken).filter(RefreshToken.session_sid == sid).all():
            rt.revoked = True
        db.commit()
    return {"message": "Signed out"}


@router.post("/change-password")
def change_password(body: ChangePasswordIn, request: Request, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    user = principal.user
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    db.commit()
    audit(db, user.id, "auth.password_changed", "", ip=client_ip(request))
    if not is_training():
        for s in db.query(AuthSession).filter(AuthSession.user_id == user.id).all():
            s.revoked = True
        for rt in db.query(RefreshToken).filter(RefreshToken.user_id == user.id).all():
            rt.revoked = True
        db.commit()
    return {"message": "Password updated"}


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:1]}{'*' * max(len(name) - 1, 2)}@{domain}"


@router.post("/forgot-password")
def forgot_password(body: ForgotIn, request: Request, db: Session = Depends(get_db)):
    ident = body.identifier.strip()
    user = db.query(User).filter(or_(User.username == ident, User.email == ident.lower())).first()
    ip = client_ip(request)
    if not is_training():
        throttle(f"forgot:{ip}", 5, 300)
    if user:
        token = random_token(24)
        db.add(PasswordResetRequest(user_id=user.id, token_hash=sha256(token), expires_at=datetime.now(timezone.utc) + timedelta(minutes=30)))
        db.add(SimulatedEmail(to_address=user.email, subject="Reset your VulnMarket password", body=f"Use this link to choose a new password: /reset-password?token={token}"))
        db.commit()
    if is_training():
        if not user:
            raise HTTPException(404, "We couldn't find an account with that username or email")
        payload = {"message": f"Password reset link sent to {mask_email(user.email)}", "delivery": "simulated"}
        if user.username == "ops.recovery":
            payload["recovery_ticket"] = flag_for("LAB-02")
            objective_reached(db, request, user, "LAB-02", "hidden account identified via recovery responses")
        return payload
    return {"message": "If an account exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(body: ResetIn, db: Session = Depends(get_db)):
    record = db.query(PasswordResetRequest).filter(PasswordResetRequest.token_hash == sha256(body.token), PasswordResetRequest.used.is_(False)).first()
    if not record:
        raise HTTPException(400, "Reset link is invalid or has expired")
    expires = record.expires_at if record.expires_at.tzinfo else record.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(400, "Reset link is invalid or has expired")
    user = db.get(User, record.user_id)
    user.password_hash = hash_password(body.new_password)
    user.password_changed_at = datetime.now(timezone.utc)
    record.used = True
    db.commit()
    if not is_training():
        for sess in db.query(AuthSession).filter(AuthSession.user_id == user.id).all():
            sess.revoked = True
        for rt in db.query(RefreshToken).filter(RefreshToken.user_id == user.id).all():
            rt.revoked = True
        db.commit()
    return {"message": "Password updated. You can now sign in."}


@router.get("/me")
def me(principal: Principal = Depends(current_principal)):
    return user_public(principal.user)


@router.get("/public-key.pem", response_class=PlainTextResponse)
def public_key():
    return PlainTextResponse(PUBLIC_KEY_PEM.decode(), media_type="application/x-pem-file")
