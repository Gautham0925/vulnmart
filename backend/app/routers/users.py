from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.flags_config import flag_for
from app.core.mode import is_training
from app.db import get_db
from app.deps import Principal, audit, client_ip, current_principal, lenient_principal, objective_reached
from app.models import Address, AuthSession, Product, User, Wishlist
from app.routers.auth import user_public

router = APIRouter(tags=["users"])


class AddressIn(BaseModel):
    label: str = Field(max_length=48)
    recipient: str = Field(max_length=120)
    line1: str = Field(max_length=200)
    city: str = Field(max_length=80)
    state: str = Field(max_length=80)
    postal_code: str = Field(max_length=16)
    delivery_notes: str = Field(default="", max_length=255)
    is_default: bool = False


def address_out(a: Address) -> dict:
    return {
        "id": a.id, "user_id": a.user_id, "label": a.label, "recipient": a.recipient, "line1": a.line1,
        "city": a.city, "state": a.state, "postal_code": a.postal_code, "country": a.country,
        "delivery_notes": a.delivery_notes, "is_default": a.is_default,
    }


@router.get("/api/users/me")
def get_me(principal: Principal = Depends(current_principal)):
    return user_public(principal.user)


@router.patch("/api/users/me")
def update_me(body: dict, request: Request, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    user = principal.user
    allowed = {"full_name", "phone"}
    for key, value in body.items():
        if key in allowed and isinstance(value, str):
            setattr(user, key, value.strip()[:120])
        elif is_training() and key == "role" and isinstance(value, str) and value in ("customer", "seller", "admin"):
            user.role = value
            audit(db, user.id, "profile.role_assignment", f"role={value}", ip=client_ip(request))
    db.commit()
    return user_public(user)


@router.get("/api/users/me/addresses")
def my_addresses(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.query(Address).filter(Address.user_id == principal.user.id).order_by(Address.id).all()
    return [address_out(a) for a in rows]


@router.post("/api/users/me/addresses", status_code=201)
def add_address(body: AddressIn, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    if body.is_default:
        db.query(Address).filter(Address.user_id == principal.user.id).update({"is_default": False})
    addr = Address(user_id=principal.user.id, **body.model_dump())
    db.add(addr)
    db.commit()
    return address_out(addr)


@router.delete("/api/users/me/addresses/{address_id}")
def delete_address(address_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    addr = db.query(Address).filter(Address.id == address_id, Address.user_id == principal.user.id).first()
    if not addr:
        raise HTTPException(404, "Address not found")
    db.delete(addr)
    db.commit()
    return {"message": "Address removed"}


@router.get("/api/users/{user_id}/profile")
def user_profile(user_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    if not is_training() and user_id != principal.user.id and principal.user.role != "admin":
        raise HTTPException(403, "You do not have access to this profile")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    return user_public(user)


@router.get("/api/users/{user_id}/addresses")
def user_addresses(user_id: int, request: Request, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    foreign = user_id != principal.user.id
    if not is_training() and foreign and principal.user.role != "admin":
        raise HTTPException(403, "You do not have access to these addresses")
    rows = db.query(Address).filter(Address.user_id == user_id).order_by(Address.id).all()
    if is_training() and foreign and any(r.delivery_notes == flag_for("LAB-06") for r in rows):
        objective_reached(db, request, principal.user, "LAB-06", f"read addresses of user {user_id}")
    return [address_out(a) for a in rows]


@router.get("/api/users/me/wishlist")
def wishlist(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.query(Wishlist).filter(Wishlist.user_id == principal.user.id).all()
    ids = [r.product_id for r in rows]
    products = db.query(Product).filter(Product.id.in_(ids)).all() if ids else []
    from app.routers.products import product_card
    return [product_card(p) for p in products]


@router.post("/api/users/me/wishlist/{product_id}", status_code=201)
def add_wishlist(product_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    exists = db.query(Wishlist).filter(Wishlist.user_id == principal.user.id, Wishlist.product_id == product_id).first()
    if not exists:
        db.add(Wishlist(user_id=principal.user.id, product_id=product_id))
        db.commit()
    return {"message": "Added to wishlist"}


@router.delete("/api/users/me/wishlist/{product_id}")
def remove_wishlist(product_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    db.query(Wishlist).filter(Wishlist.user_id == principal.user.id, Wishlist.product_id == product_id).delete()
    db.commit()
    return {"message": "Removed from wishlist"}


@router.get("/api/account/security-overview")
def security_overview(request: Request, principal: Principal = Depends(lenient_principal), db: Session = Depends(get_db)):
    user = principal.user
    sessions = db.query(AuthSession).filter(AuthSession.user_id == user.id, AuthSession.revoked.is_(False)).count()
    data = {
        "mfa_enabled": user.mfa_enabled,
        "active_sessions": sessions,
        "password_changed_at": user.password_changed_at.isoformat(),
        "email": user.email,
        "phone": user.phone,
    }
    if is_training() and principal.stage != "full":
        data["session_stage"] = principal.stage
        data["partial_session_notice"] = flag_for("LAB-12")
        objective_reached(db, request, user, "LAB-12", "security overview read with partial token")
    return data
