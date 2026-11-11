from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import Principal, require_roles
from app.models import Category, Inventory, Order, OrderItem, Product, ProductImage, Review
from app.routers.products import product_card

router = APIRouter(prefix="/api/seller", tags=["seller"])
seller_only = require_roles("seller", "admin")


class ProductIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    brand: str = Field(default="", max_length=80)
    description: str = Field(default="", max_length=4000)
    price: float = Field(gt=0)
    discount_percent: int = Field(default=0, ge=0, le=90)
    category_slug: str
    quantity: int = Field(default=0, ge=0)


class StockIn(BaseModel):
    quantity: int = Field(ge=0)


def owned(db: Session, principal: Principal, product_id: int) -> Product:
    p = db.get(Product, product_id)
    if not p or (p.seller_id != principal.user.id and principal.user.role != "admin"):
        raise HTTPException(404, "Product not found")
    return p


@router.get("/overview")
def overview(principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    sid = principal.user.id
    revenue, units = db.query(func.coalesce(func.sum(OrderItem.unit_price * OrderItem.quantity), 0), func.coalesce(func.sum(OrderItem.quantity), 0)).filter(OrderItem.seller_id == sid).one()
    orders = db.query(func.count(func.distinct(OrderItem.order_id))).filter(OrderItem.seller_id == sid).scalar()
    products = db.query(Product).filter(Product.seller_id == sid).count()
    low = db.query(Product).join(Inventory).filter(Product.seller_id == sid, Inventory.quantity <= Inventory.reorder_level).count()
    base = float(revenue) / 8 if revenue else 0
    series = [{"label": m, "revenue": round(base * f, 2)} for m, f in zip(["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"], [0.62, 0.71, 0.8, 0.95, 1.1, 1.0, 1.22, 1.35])]
    return {"revenue": float(revenue), "units_sold": int(units), "orders": orders, "products": products, "low_stock": low, "revenue_series": series, "store_name": principal.user.store_name}


@router.get("/products")
def my_products(principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    rows = db.query(Product).filter(Product.seller_id == principal.user.id).order_by(Product.id).all()
    return [{**product_card(p), "reorder_level": p.inventory.reorder_level if p.inventory else 0, "is_active": p.is_active} for p in rows]


@router.post("/products", status_code=201)
def create_product(body: ProductIn, principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.slug == body.category_slug).first()
    if not cat:
        raise HTTPException(400, "Unknown category")
    count = db.query(Product).count()
    p = Product(sku=f"VM-{2000 + count + 1}", title=body.title, brand=body.brand, description=body.description, specs={}, price=body.price, discount_percent=body.discount_percent, category_id=cat.id, seller_id=principal.user.id)
    db.add(p)
    db.flush()
    db.add(ProductImage(product_id=p.id, url="/img/p/box-0.svg", alt=body.title, position=0))
    db.add(Inventory(product_id=p.id, quantity=body.quantity, reorder_level=10))
    db.commit()
    db.refresh(p)
    return product_card(p)


@router.patch("/products/{product_id}/stock")
def update_stock(product_id: int, body: StockIn, principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    p = owned(db, principal, product_id)
    p.inventory.quantity = body.quantity
    db.commit()
    return product_card(p)


@router.patch("/products/{product_id}/active")
def toggle_active(product_id: int, principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    p = owned(db, principal, product_id)
    p.is_active = not p.is_active
    db.commit()
    return {"id": p.id, "is_active": p.is_active}


@router.get("/orders")
def seller_orders(principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    rows = (
        db.query(OrderItem, Order).join(Order, Order.id == OrderItem.order_id)
        .filter(OrderItem.seller_id == principal.user.id).order_by(Order.id.desc()).limit(60).all()
    )
    return [{"order_number": o.order_number, "status": o.status, "title": i.title, "quantity": i.quantity, "amount": float(i.unit_price) * i.quantity, "placed_at": o.created_at.isoformat(), "city": o.shipping_address.get("city", "")} for i, o in rows]


@router.get("/reviews")
def seller_reviews(principal: Principal = Depends(seller_only), db: Session = Depends(get_db)):
    rows = db.query(Review, Product).join(Product, Product.id == Review.product_id).filter(Product.seller_id == principal.user.id).order_by(Review.id.desc()).limit(40).all()
    return [{"id": r.id, "product": p.title, "rating": r.rating, "title": r.title, "author": r.user.full_name if r.user else "", "status": r.status, "created_at": r.created_at.isoformat()} for r, p in rows]
