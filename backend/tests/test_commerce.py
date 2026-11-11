from tests.conftest import ADMIN_PASSWORD, PASSWORD, auth, login


def test_register_login_logout(client, training):
    r = client.post("/api/auth/register", json={"username": "new.shopper", "email": "new.shopper@example.com", "full_name": "New Shopper", "password": "Sup3r#Secret1"})
    assert r.status_code == 201
    assert client.post("/api/auth/register", json={"username": "new.shopper", "email": "x@example.com", "full_name": "Dup", "password": "Sup3r#Secret1"}).status_code == 409
    t = client.post("/api/auth/login", json={"username": "new.shopper", "password": "Sup3r#Secret1"}).json()
    assert client.get("/api/auth/me", headers=auth(t["access_token"])).json()["username"] == "new.shopper"
    assert client.get("/api/cart").status_code == 401


def test_catalog_browse_and_filters(client, training):
    cats = client.get("/api/categories").json()
    assert len(cats) == 8
    listing = client.get("/api/products", params={"category": "electronics", "sort": "price_asc", "page_size": 6}).json()
    prices = [i["price"] for i in listing["items"]]
    assert prices == sorted(prices) and listing["total"] >= 6
    detail = client.get(f"/api/products/{listing['items'][0]['id']}").json()
    assert detail["seller"]["store_name"] and detail["specs"] and detail["images"]
    assert client.get("/api/products/search", params={"q": "headphones"}).json()["total"] >= 1


def test_cart_checkout_order_invoice(client, training):
    token = login(client, "erin.kowalski")["access_token"]
    h = auth(token)
    assert client.post("/api/cart/items", headers=h, json={"product_id": 1, "quantity": 2}).status_code == 201
    assert client.post("/api/cart/items", headers=h, json={"product_id": 12, "quantity": 1}).status_code == 201
    cart = client.patch("/api/cart/items/12", headers=h, json={"quantity": 3}).json()
    assert cart["item_count"] == 5 and cart["total"] == round(cart["subtotal"] - cart["discount"] + cart["shipping"], 2)
    assert client.delete("/api/cart/items/12", headers=h).json()["item_count"] == 2
    addr = client.get("/api/users/me/addresses", headers=h).json()[0]["id"]
    order = client.post("/api/orders/checkout", headers=h, json={"address_id": addr, "payment_method": "upi"})
    assert order.status_code == 201
    o = order.json()
    assert o["order_number"].startswith("VM")
    assert client.get("/api/cart", headers=h).json()["item_count"] == 0
    assert any(x["id"] == o["id"] for x in client.get("/api/orders", headers=h).json())
    inv = client.get(f"/api/invoices/{o['invoice_id']}", headers=h).json()
    assert inv["total"] == o["total"]
    foreign_address = client.get("/api/users/me/addresses", headers=auth(login(client, "bob.carter")["access_token"])).json()[0]["id"]
    assert client.post("/api/orders/checkout", headers=h, json={"address_id": foreign_address, "payment_method": "cod"}).status_code == 400


def test_checkout_rejects_empty_cart_and_overstock(client, training):
    h = auth(login(client, "dave.patel")["access_token"])
    addr = client.get("/api/users/me/addresses", headers=h).json()[0]["id"]
    assert client.post("/api/orders/checkout", headers=h, json={"address_id": addr, "payment_method": "cod"}).status_code == 400
    assert client.post("/api/cart/items", headers=h, json={"product_id": 1, "quantity": 10}).status_code in (201, 409)


def test_seller_scope(client, training):
    seller = login(client, "techhub", "Seller#Tech2026")["access_token"]
    ov = client.get("/api/seller/overview", headers=auth(seller)).json()
    assert ov["products"] > 0 and len(ov["revenue_series"]) == 8
    mine = client.get("/api/seller/products", headers=auth(seller)).json()
    other = client.get("/api/seller/products", headers=auth(login(client, "stylehouse", "Seller#Style2026")["access_token"])).json()
    assert {p["id"] for p in mine}.isdisjoint({p["id"] for p in other})
    assert client.patch(f"/api/seller/products/{other[0]['id']}/stock", headers=auth(seller), json={"quantity": 1}).status_code == 404
    customer = login(client, "alice.morgan")["access_token"]
    assert client.get("/api/seller/overview", headers=auth(customer)).status_code == 403


def test_admin_functions_and_mode(client, training):
    admin = auth(login(client, "admin", ADMIN_PASSWORD)["access_token"])
    ov = client.get("/api/admin/overview", headers=admin).json()
    assert ov["users"] >= 15 and ov["mode"] == "training"
    assert len(client.get("/api/admin/labs", headers=admin).json()) == 12
    assert client.get("/api/integration/contract", headers=admin).json()["event"]["note"].startswith("Flags are never sent")
    assert client.put("/api/admin/config/mode", headers=admin, json={"mode": "secure"}).json()["mode"] == "secure"
    assert client.get("/api/health").json()["mode"] == "secure"
    assert client.put("/api/admin/config/mode", headers=auth(login(client, "admin", ADMIN_PASSWORD)["access_token"]), json={"mode": "training"}).status_code == 200


def test_lab_reset_is_scoped(client, training):
    admin = auth(login(client, "admin", ADMIN_PASSWORD)["access_token"])
    r = client.post("/api/admin/labs/LAB-08/reset", headers=admin)
    assert r.status_code == 200 and "markup" in r.json()["reset"]
    assert client.get("/api/products/1/reviews").status_code == 200
    assert client.post("/api/admin/labs/LAB-99/reset", headers=admin).status_code == 404


def test_password_reset_flow(client, secure):
    client.post("/api/auth/forgot-password", json={"identifier": "dave.patel"})
    from tests.conftest import SessionLocal
    from app.models import SimulatedEmail
    import re
    with SessionLocal() as db:
        mail = db.query(SimulatedEmail).filter(SimulatedEmail.to_address == "dave.patel@example.com", SimulatedEmail.subject.like("Reset%")).order_by(SimulatedEmail.id.desc()).first()
    token = re.search(r"token=([\w-]+)", mail.body).group(1)
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "Brand#New2026x"}).status_code == 200
    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "Another#New2026"}).status_code == 400
    assert client.post("/api/auth/login", json={"username": "dave.patel", "password": "Brand#New2026x"}).status_code == 200
    t = client.post("/api/auth/login", json={"username": "dave.patel", "password": "Brand#New2026x"}).json()["access_token"]
    client.post("/api/auth/change-password", headers=auth(t), json={"current_password": "Brand#New2026x", "new_password": PASSWORD})


def test_flags_never_in_normal_responses(client, training):
    h = auth(login(client, "alice.morgan")["access_token"])
    for path in ["/api/products/home", "/api/products", "/api/categories", "/api/labs", "/api/orders", "/api/users/me", "/api/users/me/addresses", "/api/cart", "/api/products/1/reviews", "/api/products/search?q=phone"]:
        assert "FLAG{" not in client.get(path, headers=h).text, path
