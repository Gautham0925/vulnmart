import html
import re
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.flags_config import flag_for
from app.core.mode import is_training
from app.db import get_db
from app.deps import Principal, current_principal
from app.models import Product, Review

router = APIRouter(tags=["reviews"])

ACTIVE_MARKUP = re.compile(r"<\s*[a-z!/]", re.I)


class ReviewIn(BaseModel):
    product_id: int
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=160)
    body: str = Field(min_length=3, max_length=2000)


def review_out(r: Review) -> dict:
    body_html = r.body if is_training() else html.escape(r.body)
    return {
        "id": r.id,
        "rating": r.rating,
        "title": r.title,
        "body_html": body_html,
        "author": r.user.full_name if r.user else "Customer",
        "created_at": r.created_at.isoformat(),
        "status": r.status,
    }


@router.get("/api/products/{product_id}/reviews")
def list_reviews(product_id: int, response: Response, db: Session = Depends(get_db)):
    rows = db.query(Review).filter(Review.product_id == product_id, Review.status == "approved").order_by(Review.id.desc()).limit(50).all()
    if is_training() and any(ACTIVE_MARKUP.search(r.body) for r in rows):
        response.set_cookie("vm_lab08", quote(flag_for("LAB-08"), safe=""), max_age=600, httponly=False, samesite="lax", path="/")
    return [review_out(r) for r in rows]


@router.post("/api/reviews", status_code=201)
def create_review(body: ReviewIn, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    product = db.get(Product, body.product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    review = Review(product_id=product.id, user_id=principal.user.id, rating=body.rating, title=body.title.strip(), body=body.body, status="approved")
    db.add(review)
    db.flush()
    avg, count = db.query(func.avg(Review.rating), func.count(Review.id)).filter(Review.product_id == product.id, Review.status == "approved").one()
    product.rating_avg = round(float(avg or 0), 2)
    product.rating_count = count
    db.commit()
    return review_out(review)
