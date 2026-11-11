import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.flags_config import flag_for
from app.core.mode import is_training
from app.db import get_db
from app.deps import Principal, current_principal, objective_reached
from app.models import Address, Cart, CartItem, Inventory, Invoice, Order, OrderItem, Product
from app.routers.products import product_card, sale_price

router = APIRouter(tags=["commerce"])

FREE_SHIPPING_THRESHOLD = 1500.0
SHIPPING_FEE = 79.0


class CartAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1, le=10)


class CartUpdate(BaseModel):
    quantity: int = Field(ge=1, le=10)


class CheckoutIn(BaseModel):
    address_id: int
    payment_method: str = Field(pattern="^(upi|card|cod|netbanking)$")
    gift_message: str = Field(default="", max_length=255)


def get_cart(db: Session, user_id: int) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
    return cart


def cart_view(cart: Cart) -> dict:
    lines = []
    subtotal = 0.0
    discount = 0.0
    for item in cart.items:
        p = item.product
        unit = sale_price(p)
        subtotal += float(p.price) * item.quantity
        discount += (float(p.price) - unit) * item.quantity
        lines.append({"product": product_card(p), "quantity": item.quantity, "line_total": round(unit * item.quantity, 2)})
    net = subtotal - discount
    shipping = 0.0 if (net >= FREE_SHIPPING_THRESHOLD or not lines) else SHIPPING_FEE
    return {
        "items": lines,
        "item_count": sum(l["quantity"] for l in lines),
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "shipping": shipping,
        "total": round(net + shipping, 2),
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
    }


@router.get("/api/cart")
def read_cart(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    return cart_view(get_cart(db, principal.user.id))


@router.post("/api/cart/items", status_code=201)
def add_item(body: CartAdd, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    product = db.get(Product, body.product_id)
    if not product or not product.is_active:
        raise HTTPException(404, "Product not found")
    cart = get_cart(db, principal.user.id)
    existing = next((i for i in cart.items if i.product_id == product.id), None)
    qty = body.quantity + (existing.quantity if existing else 0)
    stock = product.inventory.quantity if product.inventory else 0
    if qty > stock:
        raise HTTPException(409, f"Only {stock} units available")
    if existing:
        existing.quantity = min(qty, 10)
    else:
        db.add(CartItem(cart_id=cart.id, product_id=product.id, quantity=body.quantity))
    cart.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(cart)
    return cart_view(cart)


@router.patch("/api/cart/items/{product_id}")
def update_item(product_id: int, body: CartUpdate, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    cart = get_cart(db, principal.user.id)
    item = next((i for i in cart.items if i.product_id == product_id), None)
    if not item:
        raise HTTPException(404, "Item not in cart")
    stock = item.product.inventory.quantity if item.product.inventory else 0
    if body.quantity > stock:
        raise HTTPException(409, f"Only {stock} units available")
    item.quantity = body.quantity
    db.commit()
    db.refresh(cart)
    return cart_view(cart)


@router.delete("/api/cart/items/{product_id}")
def remove_item(product_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    cart = get_cart(db, principal.user.id)
    db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id).delete()
    db.commit()
    db.refresh(cart)
    return cart_view(cart)


def order_summary(o: Order) -> dict:
    return {
        "id": o.id,
        "order_number": o.order_number,
        "status": o.status,
        "total": float(o.total),
        "item_count": sum(i.quantity for i in o.items),
        "payment_method": o.payment_method,
        "created_at": o.created_at.isoformat(),
        "preview": [i.title for i in o.items][:2],
    }


def order_detail(o: Order) -> dict:
    data = order_summary(o)
    data.update({
        "user_id": o.user_id,
        "subtotal": float(o.subtotal),
        "discount": float(o.discount),
        "shipping": float(o.shipping),
        "shipping_address": o.shipping_address,
        "gift_message": o.gift_message,
        "invoice_id": o.invoice.id if o.invoice else None,
        "items": [{"product_id": i.product_id, "title": i.title, "unit_price": float(i.unit_price), "quantity": i.quantity} for i in o.items],
    })
    return data


@router.post("/api/orders/checkout", status_code=201)
def checkout(body: CheckoutIn, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    user = principal.user
    address = db.query(Address).filter(Address.id == body.address_id, Address.user_id == user.id).first()
    if not address:
        raise HTTPException(400, "Select a valid delivery address")
    cart = get_cart(db, user.id)
    if not cart.items:
        raise HTTPException(400, "Your cart is empty")
    view = cart_view(cart)
    for item in cart.items:
        stock = item.product.inventory.quantity if item.product.inventory else 0
        if item.quantity > stock:
            raise HTTPException(409, f"{item.product.title} no longer has enough stock")
    last = db.query(Order).order_by(Order.id.desc()).first()
    number = f"VM{5001 + (last.id if last else 0) + secrets.randbelow(7)}"
    order = Order(
        order_number=number, user_id=user.id, status="placed", subtotal=view["subtotal"], discount=view["discount"],
        shipping=view["shipping"], total=view["total"], payment_method=body.payment_method,
        shipping_address={"recipient": address.recipient, "line1": address.line1, "city": address.city, "state": address.state, "postal_code": address.postal_code},
        gift_message=body.gift_message.strip(),
    )
    db.add(order)
    db.flush()
    for item in cart.items:
        db.add(OrderItem(order_id=order.id, product_id=item.product_id, seller_id=item.product.seller_id, title=item.product.title, unit_price=sale_price(item.product), quantity=item.quantity))
        item.product.inventory.quantity -= item.quantity
    db.add(Invoice(invoice_number=f"INV-{number[2:]}", order_id=order.id, billing_name=user.full_name, billing_email=user.email, tax_amount=round(view["total"] * 0.18 / 1.18, 2)))
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    db.refresh(order)
    return order_detail(order)


@router.get("/api/orders")
def my_orders(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.query(Order).filter(Order.user_id == principal.user.id).order_by(Order.id.desc()).all()
    return [order_summary(o) for o in rows]


@router.get("/api/orders/{order_id}")
def get_order(order_id: int, request: Request, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    foreign = order.user_id != principal.user.id
    if foreign and not is_training() and principal.user.role != "admin":
        raise HTTPException(404, "Order not found")
    if is_training() and foreign and order.gift_message == flag_for("LAB-03"):
        objective_reached(db, request, principal.user, "LAB-03", f"read order {order_id}")
    return order_detail(order)


def invoice_view(inv: Invoice, order: Order) -> dict:
    return {
        "id": inv.id,
        "invoice_number": inv.invoice_number,
        "issued_at": inv.issued_at.isoformat(),
        "billing_name": inv.billing_name,
        "billing_email": inv.billing_email,
        "tax_amount": float(inv.tax_amount),
        "order_number": order.order_number,
        "shipping_address": order.shipping_address,
        "subtotal": float(order.subtotal),
        "discount": float(order.discount),
        "shipping": float(order.shipping),
        "total": float(order.total),
        "items": [{"title": i.title, "unit_price": float(i.unit_price), "quantity": i.quantity} for i in order.items],
    }


@router.get("/api/invoices/{invoice_id}")
def get_invoice(invoice_id: int, principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(404, "Invoice not found")
    order = db.get(Order, inv.order_id)
    if not is_training() and order.user_id != principal.user.id and principal.user.role != "admin":
        raise HTTPException(404, "Invoice not found")
    return invoice_view(inv, order)
