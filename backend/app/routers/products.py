from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.mode import is_training
from app.db import get_db
from app.models import Category, Inventory, Product, Review

router = APIRouter(tags=["catalog"])

SORTS = {
    "relevance": "p.is_featured DESC, p.rating_count DESC",
    "price_asc": "p.price ASC",
    "price_desc": "p.price DESC",
    "rating": "p.rating_avg DESC",
    "newest": "p.created_at DESC",
}


def sale_price(p: Product) -> float:
    return round(float(p.price) * (100 - p.discount_percent) / 100, 2)


def stock_state(p: Product) -> dict:
    qty = p.inventory.quantity if p.inventory else 0
    label = "out_of_stock" if qty <= 0 else "low_stock" if qty <= 10 else "in_stock"
    return {"quantity": qty, "status": label}


def product_card(p: Product) -> dict:
    return {
        "id": p.id,
        "sku": p.sku,
        "title": p.title,
        "brand": p.brand,
        "price": float(p.price),
        "sale_price": sale_price(p),
        "discount_percent": p.discount_percent,
        "rating_avg": float(p.rating_avg),
        "rating_count": p.rating_count,
        "image": p.images[0].url if p.images else None,
        "category": p.category.name if p.category else "",
        "category_slug": p.category.slug if p.category else "",
        "stock": stock_state(p),
    }


@router.get("/api/categories")
def categories(db: Session = Depends(get_db)):
    counts = dict(db.query(Product.category_id, func.count(Product.id)).filter(Product.is_active.is_(True)).group_by(Product.category_id).all())
    return [{"id": c.id, "slug": c.slug, "name": c.name, "icon": c.icon, "accent": c.accent, "product_count": counts.get(c.id, 0)} for c in db.query(Category).order_by(Category.id).all()]


@router.get("/api/products/home")
def home_feed(db: Session = Depends(get_db)):
    base = db.query(Product).filter(Product.is_active.is_(True))
    featured = base.filter(Product.is_featured.is_(True)).order_by(Product.id).limit(8).all()
    trending = base.filter(Product.is_trending.is_(True)).order_by(Product.rating_count.desc(), Product.id).limit(8).all()
    recommended = base.order_by(Product.rating_avg.desc(), Product.id).limit(8).all()
    deals = base.order_by(Product.discount_percent.desc(), Product.id).limit(6).all()
    return {
        "featured": [product_card(p) for p in featured],
        "trending": [product_card(p) for p in trending],
        "recommended": [product_card(p) for p in recommended],
        "deals": [product_card(p) for p in deals],
    }


@router.get("/api/products")
def list_products(
    category: str | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    min_rating: float | None = Query(None, ge=0, le=5),
    sort: str = "relevance",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    q = db.query(Product).filter(Product.is_active.is_(True))
    if category:
        q = q.join(Category).filter(Category.slug == category)
    if min_price is not None:
        q = q.filter(Product.price >= min_price)
    if max_price is not None:
        q = q.filter(Product.price <= max_price)
    if min_rating is not None:
        q = q.filter(Product.rating_avg >= min_rating)
    total = q.count()
    order = {"price_asc": Product.price.asc(), "price_desc": Product.price.desc(), "rating": Product.rating_avg.desc(), "newest": Product.created_at.desc(), "discount": Product.discount_percent.desc()}.get(sort, Product.is_featured.desc())
    rows = q.order_by(order, Product.id).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [product_card(p) for p in rows], "total": total, "page": page, "page_size": page_size}


def build_search(q: str, category: str | None, min_price: float | None, max_price: float | None, sort: str):
    clauses = ["p.is_active = true"]
    params: dict = {}
    if category:
        clauses.append("c.slug = :category")
        params["category"] = category
    if min_price is not None:
        clauses.append("p.price >= :min_price")
        params["min_price"] = min_price
    if max_price is not None:
        clauses.append("p.price <= :max_price")
        params["max_price"] = max_price
    order = SORTS.get(sort, SORTS["relevance"])
    head = (
        "SELECT p.id, p.title, p.brand, p.price, p.discount_percent, p.rating_avg, "
        "(SELECT url FROM product_images i WHERE i.product_id = p.id ORDER BY i.position LIMIT 1) AS image, "
        "c.name AS category FROM products p JOIN categories c ON c.id = p.category_id WHERE "
    )
    return head, clauses, params, order


@router.get("/api/products/search")
def search_products(
    q: str = Query("", max_length=200),
    category: str | None = None,
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    sort: str = "relevance",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    head, clauses, params, order = build_search(q, category, min_price, max_price, sort)
    prefix = head + " AND ".join(clauses)
    try:
        if is_training():
            statement = text(f"{prefix} AND p.title ILIKE '%{q}%' ORDER BY {order} LIMIT 200")
            rows = db.execute(statement, params).mappings().all()
        else:
            escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            statement = text(f"{prefix} AND p.title ILIKE :pattern ORDER BY {order} LIMIT 200")
            rows = db.execute(statement, {**params, "pattern": f"%{escaped}%"}).mappings().all()
    except DBAPIError as exc:
        db.rollback()
        if is_training():
            raise HTTPException(400, detail={"detail": "Search failed", "debug": str(exc.orig)[:300]})
        raise HTTPException(400, "Search failed")
    start = (page - 1) * page_size
    items = []
    for r in rows[start:start + page_size]:
        price = float(r["price"] or 0)
        disc = int(r["discount_percent"] or 0)
        items.append({
            "id": r["id"],
            "title": r["title"],
            "brand": r["brand"],
            "price": price,
            "sale_price": round(price * (100 - disc) / 100, 2),
            "discount_percent": disc,
            "rating_avg": float(r["rating_avg"] or 0),
            "image": r["image"],
            "category": r["category"],
        })
    return {"items": items, "total": len(rows), "page": page, "page_size": page_size, "query": q}


@router.get("/api/products/{product_id}")
def product_detail(product_id: int, db: Session = Depends(get_db)):
    p = db.get(Product, product_id)
    if not p or not p.is_active:
        raise HTTPException(404, "Product not found")
    breakdown = {str(i): 0 for i in range(1, 6)}
    for rating, count in db.query(Review.rating, func.count(Review.id)).filter(Review.product_id == p.id, Review.status == "approved").group_by(Review.rating).all():
        breakdown[str(rating)] = count
    related = db.query(Product).filter(Product.category_id == p.category_id, Product.id != p.id, Product.is_active.is_(True)).order_by(Product.rating_avg.desc()).limit(4).all()
    data = product_card(p)
    data.update({
        "description": p.description,
        "specs": p.specs,
        "images": [{"url": i.url, "alt": i.alt} for i in p.images],
        "seller": {"id": p.seller.id, "store_name": p.seller.store_name, "name": p.seller.full_name},
        "rating_breakdown": breakdown,
        "related": [product_card(r) for r in related],
    })
    return data
