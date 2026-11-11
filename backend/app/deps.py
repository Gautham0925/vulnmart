from datetime import timezone

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.mode import is_training
from app.core.security import TokenError, verify_token_secure, verify_token_vulnerable
from app.db import get_db
from app.integration.ctf import emit_objective_event
from app.models import AuditLog, AuthSession, User

bearer = HTTPBearer(auto_error=False)


class Principal:
    def __init__(self, user: User, claims: dict):
        self.user = user
        self.claims = claims

    @property
    def stage(self) -> str:
        return self.claims.get("stage", "full")

    @property
    def effective_role(self) -> str:
        if is_training():
            return str(self.claims.get("role", self.user.role))
        return self.user.role

    @property
    def alg(self) -> str:
        return self.claims.get("_alg", "RS256")


def client_ip(request: Request) -> str:
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "")


def audit(db: Session, user_id, action: str, detail: str = "", lab_id: str = "", ip: str = "") -> None:
    db.add(AuditLog(user_id=user_id, action=action, detail=detail[:2000], lab_id=lab_id, ip=ip))
    db.commit()


def objective_reached(db: Session, request: Request, user: User | None, lab_id: str, detail: str) -> None:
    audit(db, user.id if user else None, "lab.objective_reached", detail, lab_id, client_ip(request))
    emit_objective_event(lab_id, user.username if user else "anonymous", "training")


def _authenticate(request: Request, creds, db: Session, allow_partial: bool) -> Principal:
    if not creds:
        raise HTTPException(401, "Authentication required")
    verifier = verify_token_vulnerable if is_training() else verify_token_secure
    try:
        claims = verifier(creds.credentials)
    except TokenError:
        raise HTTPException(401, "Invalid or expired token")
    if claims.get("typ", "access") != "access":
        raise HTTPException(401, "Invalid token type")
    try:
        user = db.get(User, int(claims["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(401, "Invalid token")
    if not user or not user.is_active:
        raise HTTPException(401, "Account unavailable")
    if not is_training():
        session = db.query(AuthSession).filter(AuthSession.sid == claims["sid"]).first()
        if not session or session.revoked:
            raise HTTPException(401, "Session ended")
        changed = user.password_changed_at
        if changed.tzinfo is None:
            changed = changed.replace(tzinfo=timezone.utc)
        if claims["iat"] < int(changed.timestamp()):
            raise HTTPException(401, "Session ended")
    stage = claims.get("stage", "full")
    if stage != "full" and not allow_partial:
        raise HTTPException(403, "Multi-factor verification required")
    return Principal(user, claims)


def current_principal(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> Principal:
    return _authenticate(request, creds, db, allow_partial=False)


def lenient_principal(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> Principal:
    return _authenticate(request, creds, db, allow_partial=is_training())


def otp_principal(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> Principal:
    return _authenticate(request, creds, db, allow_partial=True)


def optional_principal(request: Request, creds: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if not creds:
        return None
    try:
        return _authenticate(request, creds, db, allow_partial=False)
    except HTTPException:
        return None


def require_roles(*roles: str):
    def checker(principal: Principal = Depends(current_principal)) -> Principal:
        if principal.effective_role not in roles:
            raise HTTPException(403, "Insufficient privileges")
        return principal
    return checker
