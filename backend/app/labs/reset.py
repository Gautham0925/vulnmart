from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    AuditLog, AuthSession, OtpChallenge, PasswordResetRequest, RefreshToken, Review, SimulatedEmail, User,
)

SEED_PASSWORD = "Shop#Pass2026"
CUSTOMER_PREFIXES = ("alice.", "bob.", "carol.", "dave.", "erin.", "frank.", "grace.", "vault.", "ops.recovery")


def reset_lab(db: Session, lab_id: str) -> str:
    if lab_id in ("LAB-01", "LAB-02"):
        db.query(PasswordResetRequest).delete()
        db.query(SimulatedEmail).filter(SimulatedEmail.subject.like("Reset your%")).delete()
        db.query(AuditLog).filter(AuditLog.action == "auth.login_failed").delete()
        db.commit()
        return "cleared reset requests, simulated reset emails and failed-login history"
    if lab_id == "LAB-04":
        for u in db.query(User).filter(User.role == "customer").all():
            u.password_hash = hash_password(SEED_PASSWORD)
            u.password_changed_at = datetime.now(timezone.utc)
        db.query(RefreshToken).delete()
        db.query(AuthSession).delete()
        db.query(AuditLog).filter(AuditLog.action.in_(["auth.logout", "auth.password_changed"])).delete(synchronize_session=False)
        db.commit()
        return "restored customer passwords and cleared sessions and refresh tokens"
    if lab_id == "LAB-05":
        escalated = [a.user_id for a in db.query(AuditLog).filter(AuditLog.action == "profile.role_assignment").all()]
        for u in db.query(User).filter(User.id.in_(escalated)).all():
            if u.username.startswith(CUSTOMER_PREFIXES):
                u.role = "customer"
        db.query(AuditLog).filter(AuditLog.action == "profile.role_assignment").delete()
        db.commit()
        return "reverted escalated customer roles"
    if lab_id == "LAB-08":
        removed = db.query(Review).filter(Review.body.like("%<%")).delete(synchronize_session=False)
        db.commit()
        return f"removed {removed} reviews containing markup"
    if lab_id == "LAB-12":
        db.query(OtpChallenge).delete()
        db.query(SimulatedEmail).filter(SimulatedEmail.subject.like("Your VulnMarket verification%")).delete()
        db.commit()
        return "cleared OTP challenges and simulated OTP emails"
    return "no mutable state for this lab"
