from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.flags_config import flag_for
from app.core.mode import current_mode, is_training, set_mode
from app.db import get_db
from app.deps import Principal, audit, client_ip, objective_reached, require_roles
from app.integration.ctf import integration_status
from app.labs.reset import reset_lab
from app.models import AuditLog, Order, Product, Review, SecurityLab, User

router = APIRouter(prefix="/api/admin", tags=["admin"])
admin_only = require_roles("admin")
settings = get_settings()


class ModeIn(BaseModel):
    mode: str


class StatusIn(BaseModel):
    status: str


class UserPatch(BaseModel):
    is_active: bool | None = None
    role: str | None = None


class ReviewPatch(BaseModel):
    status: str


@router.get("/overview")
def overview(request: Request, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    data = {
        "mode": current_mode(),
        "users": db.query(User).count(),
        "customers": db.query(User).filter(User.role == "customer", User.is_active.is_(True)).count(),
        "sellers": db.query(User).filter(User.role == "seller").count(),
        "products": db.query(Product).count(),
        "orders": db.query(Order).count(),
        "revenue": float(db.query(func.coalesce(func.sum(Order.total), 0)).scalar()),
        "recent_activity": [
            {"id": a.id, "action": a.action, "detail": a.detail[:120], "lab_id": a.lab_id, "ip": a.ip, "at": a.created_at.isoformat()}
            for a in db.query(AuditLog).order_by(AuditLog.id.desc()).limit(12).all()
        ],
    }
    escalated = db.query(AuditLog).filter(AuditLog.user_id == principal.user.id, AuditLog.action == "profile.role_assignment").first()
    if is_training() and escalated:
        data["compliance_banner"] = flag_for("LAB-05")
        objective_reached(db, request, principal.user, "LAB-05", "admin overview reached after profile role assignment")
    return data


@router.get("/vault")
def vault(request: Request, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    data = {"vault": "payment-gateway-simulated", "keys": ["pk_test_sim_001", "pk_test_sim_002"], "rotated_at": "2026-10-01"}
    if is_training() and principal.alg == "HS256":
        data["key_audit"] = flag_for("LAB-11")
        objective_reached(db, request, principal.user, "LAB-11", "admin vault reached with HS256 token")
    return data


@router.get("/users")
def users(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    return [
        {"id": u.id, "username": u.username, "email": u.email, "full_name": u.full_name, "role": u.role, "is_active": u.is_active, "mfa_enabled": u.mfa_enabled, "created_at": u.created_at.isoformat()}
        for u in db.query(User).order_by(User.id).all()
    ]


@router.patch("/users/{user_id}")
def patch_user(user_id: int, body: UserPatch, request: Request, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.role in ("customer", "seller", "admin"):
        user.role = body.role
    db.commit()
    audit(db, principal.user.id, "admin.user_updated", f"user={user_id}", ip=client_ip(request))
    return {"id": user.id, "role": user.role, "is_active": user.is_active}


@router.get("/orders")
def orders(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(Order).order_by(Order.id.desc()).limit(100).all()
    return [{"id": o.id, "order_number": o.order_number, "user_id": o.user_id, "status": o.status, "total": float(o.total), "created_at": o.created_at.isoformat()} for o in rows]


@router.patch("/orders/{order_id}/status")
def set_order_status(order_id: int, body: StatusIn, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order or body.status not in ("placed", "shipped", "delivered", "cancelled"):
        raise HTTPException(400, "Invalid request")
    order.status = body.status
    db.commit()
    return {"id": order.id, "status": order.status}


@router.get("/products")
def products(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(Product).order_by(Product.id).all()
    return [{"id": p.id, "sku": p.sku, "title": p.title, "seller": p.seller.store_name, "price": float(p.price), "stock": p.inventory.quantity if p.inventory else 0, "is_active": p.is_active} for p in rows]


@router.patch("/reviews/{review_id}")
def moderate_review(review_id: int, body: ReviewPatch, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    review = db.get(Review, review_id)
    if not review or body.status not in ("approved", "hidden"):
        raise HTTPException(400, "Invalid request")
    review.status = body.status
    db.commit()
    return {"id": review.id, "status": review.status}


@router.get("/reviews")
def all_reviews(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(Review).order_by(Review.id.desc()).limit(80).all()
    return [{"id": r.id, "product_id": r.product_id, "author": r.user.full_name if r.user else "", "rating": r.rating, "title": r.title, "body": r.body[:240], "status": r.status} for r in rows]


@router.get("/config")
def config(principal: Principal = Depends(admin_only)):
    return {
        "mode": current_mode(),
        "environment": settings.environment,
        "training_allowed": settings.training_allowed,
        "ctf_integration": integration_status(),
    }


@router.put("/config/mode")
def update_mode(body: ModeIn, request: Request, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    try:
        mode = set_mode(db, body.mode)
    except ValueError:
        raise HTTPException(400, "Mode must be training or secure")
    except PermissionError as exc:
        raise HTTPException(403, str(exc))
    audit(db, principal.user.id, "admin.mode_changed", mode, ip=client_ip(request))
    return {"mode": mode}


@router.get("/labs")
def labs(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    activity = dict(db.query(AuditLog.lab_id, func.count(AuditLog.id)).filter(AuditLog.action == "lab.objective_reached", AuditLog.lab_id != "").group_by(AuditLog.lab_id).all())
    rows = db.query(SecurityLab).order_by(SecurityLab.lab_id).all()
    return [{"lab_id": l.lab_id, "name": l.name, "difficulty": l.difficulty, "category": l.category, "enabled": l.enabled, "objective_events": activity.get(l.lab_id, 0)} for l in rows]


@router.post("/labs/{lab_id}/reset")
def reset(lab_id: str, request: Request, principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    if not db.query(SecurityLab).filter(SecurityLab.lab_id == lab_id).first():
        raise HTTPException(404, "Lab not found")
    detail = reset_lab(db, lab_id)
    audit(db, principal.user.id, "admin.lab_reset", detail, lab_id, client_ip(request))
    return {"lab_id": lab_id, "reset": detail}


@router.get("/audit")
def audit_feed(principal: Principal = Depends(admin_only), db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(100).all()
    return [{"id": a.id, "user_id": a.user_id, "action": a.action, "detail": a.detail[:160], "lab_id": a.lab_id, "ip": a.ip, "at": a.created_at.isoformat()} for a in rows]
