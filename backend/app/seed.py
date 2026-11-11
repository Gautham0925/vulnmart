import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.flags_config import flag_for
from app.core.security import hash_password
from app.db import Base, SessionLocal, engine
from app.labs.catalog import LABS
from app.models import (
    Address, AppSetting, Cart, Category, Inventory, Invoice, Order, OrderItem, Permission, Product,
    ProductImage, Review, Role, SecurityLab, TrainingSecret, User,
)

CATEGORIES = [
    ("electronics", "Electronics", "cpu", "#4f46e5"),
    ("mobiles", "Mobiles & Tablets", "smartphone", "#0ea5e9"),
    ("fashion", "Fashion", "shirt", "#db2777"),
    ("home", "Home & Kitchen", "sofa", "#d97706"),
    ("books", "Books", "book-open", "#059669"),
    ("sports", "Sports & Fitness", "dumbbell", "#dc2626"),
    ("beauty", "Beauty & Care", "sparkles", "#9333ea"),
    ("toys", "Toys & Games", "gamepad-2", "#ea580c"),
]

SELLERS = [
    ("techhub", "TechHub Electronics", "techhub@vulnmarket.local", "Priya Raman"),
    ("stylehouse", "StyleHouse Fashion", "stylehouse@vulnmarket.local", "Marcus Bell"),
    ("homenest", "HomeNest Living", "homenest@vulnmarket.local", "Ananya Rao"),
    ("pagebarn", "PageBarn Books", "pagebarn@vulnmarket.local", "Tom Fischer"),
]

CUSTOMERS = [
    ("alice.morgan", "Alice Morgan", "alice.morgan@example.com", False),
    ("bob.carter", "Bob Carter", "bob.carter@example.com", False),
    ("carol.nguyen", "Carol Nguyen", "carol.nguyen@example.com", False),
    ("dave.patel", "Dave Patel", "dave.patel@example.com", False),
    ("erin.kowalski", "Erin Kowalski", "erin.kowalski@example.com", False),
    ("frank.osei", "Frank Osei", "frank.osei@example.com", False),
    ("grace.holt", "Grace Holt", "grace.holt@example.com", True),
    ("vault.audit", "Vault Audit", "vault.audit@vulnmarket.local", False),
    ("ops.recovery", "Ops Recovery", "ops.recovery@vulnmarket.local", False),
]

ADMINS = [
    ("admin", "Platform Admin", "admin@vulnmarket.local"),
    ("ops.admin", "Operations Admin", "ops.admin@vulnmarket.local"),
]

DEFAULT_PASSWORDS = {
    "admin": "Adm1n#Market2026",
    "ops.admin": "0ps#Market2026",
    "techhub": "Seller#Tech2026",
    "stylehouse": "Seller#Style2026",
    "homenest": "Seller#Home2026",
    "pagebarn": "Seller#Page2026",
    "default_customer": "Shop#Pass2026",
}

PRODUCTS = [
    ("electronics", "techhub", "Aurora ANC Wireless Headphones", "Aurora Audio", 7999, 25, "headphones", "Active noise cancelling over-ear headphones with 40 hour battery and multipoint Bluetooth.", {"Battery": "40 hours", "Connectivity": "Bluetooth 5.3", "Weight": "254 g", "Warranty": "1 year"}, True, True),
    ("electronics", "techhub", "Nimbus 14 Ultrabook", "Nimbus", 68990, 12, "laptop", "Lightweight 14 inch laptop with 16 GB memory, 512 GB SSD and an all-day battery.", {"Display": "14 in 2.2K IPS", "Memory": "16 GB", "Storage": "512 GB NVMe", "Weight": "1.2 kg"}, True, False),
    ("electronics", "techhub", "Pulse Mini Bluetooth Speaker", "Aurora Audio", 2499, 30, "speaker", "Pocket sized waterproof speaker with deep bass and 12 hour playtime.", {"Battery": "12 hours", "Rating": "IP67", "Output": "20 W"}, False, True),
    ("electronics", "techhub", "Vista 4K Action Camera", "Vista", 14999, 18, "camera", "Stabilised 4K action camera with waterproof housing and wireless remote.", {"Video": "4K 60 fps", "Waterproof": "10 m", "Battery": "1750 mAh"}, True, False),
    ("electronics", "techhub", "Orbit Smartwatch S2", "Orbit", 12999, 20, "watch", "AMOLED smartwatch with GPS, heart rate and sleep tracking.", {"Display": "1.4 in AMOLED", "Battery": "10 days", "Water": "5 ATM"}, False, True),
    ("electronics", "techhub", "Slate Wireless Keyboard", "Slate", 3299, 15, "keyboard", "Low profile hot-swappable mechanical keyboard with three device pairing.", {"Switches": "Tactile", "Layout": "75 percent", "Battery": "4000 mAh"}, False, False),
    ("mobiles", "techhub", "Zenith X5 Smartphone 128 GB", "Zenith", 29999, 18, "phone", "6.6 inch 120 Hz display, 50 MP camera system and fast charging.", {"Display": "6.6 in AMOLED", "Storage": "128 GB", "Battery": "5000 mAh", "Camera": "50 MP"}, True, True),
    ("mobiles", "techhub", "Zenith X5 Pro 256 GB", "Zenith", 41999, 15, "phone", "Flagship performance with a periscope zoom lens and 100 W charging.", {"Display": "6.8 in LTPO", "Storage": "256 GB", "Battery": "5400 mAh"}, False, True),
    ("mobiles", "techhub", "Lumen Tab 11 Tablet", "Lumen", 22999, 10, "tablet", "11 inch tablet with quad speakers and stylus support for notes and sketching.", {"Display": "11 in 2K", "Storage": "128 GB", "Battery": "8000 mAh"}, False, False),
    ("mobiles", "techhub", "Volt 65W GaN Charger", "Volt", 1799, 28, "charger", "Compact three port GaN charger for phone, tablet and laptop.", {"Output": "65 W", "Ports": "2 x USB-C, 1 x USB-A"}, False, True),
    ("mobiles", "techhub", "Shield Tempered Glass Pack", "Shield", 399, 5, "case", "Pack of two 9H tempered glass protectors with installation frame.", {"Hardness": "9H", "Pack": "2 pieces"}, False, False),
    ("fashion", "stylehouse", "Everyday Cotton Crew Tee", "StyleHouse", 799, 30, "tshirt", "Soft 180 GSM combed cotton tee with a relaxed fit.", {"Fabric": "100 percent cotton", "Fit": "Regular", "Care": "Machine wash"}, False, True),
    ("fashion", "stylehouse", "Stride Run Sneakers", "Stride", 3499, 35, "sneaker", "Breathable mesh running shoes with responsive foam cushioning.", {"Upper": "Engineered mesh", "Sole": "EVA foam", "Weight": "260 g"}, True, True),
    ("fashion", "stylehouse", "Alpine Water Resistant Jacket", "Alpine", 5999, 20, "jacket", "Lightweight shell jacket with taped seams and packable hood.", {"Shell": "Recycled nylon", "Rating": "5000 mm", "Fit": "Regular"}, False, False),
    ("fashion", "stylehouse", "Commuter 28L Backpack", "Commuter", 2299, 22, "backpack", "Padded laptop compartment, anti-theft pocket and weather resistant fabric.", {"Capacity": "28 L", "Laptop": "up to 16 in", "Material": "Ripstop"}, False, True),
    ("fashion", "stylehouse", "Heritage Slim Chinos", "StyleHouse", 1899, 40, "pants", "Stretch cotton chinos cut for a modern slim fit.", {"Fabric": "Cotton blend", "Fit": "Slim"}, False, False),
    ("fashion", "stylehouse", "Meridian Leather Wallet", "Meridian", 1299, 15, "wallet", "Full grain leather bifold wallet with RFID protection.", {"Material": "Leather", "Slots": "8 cards"}, False, False),
    ("home", "homenest", "Ember Stainless Kettle 1.7L", "Ember", 1599, 25, "kettle", "Fast boil electric kettle with auto shut-off and boil-dry protection.", {"Capacity": "1.7 L", "Power": "1850 W"}, False, True),
    ("home", "homenest", "Halo Desk Lamp", "Halo", 1999, 18, "lamp", "Dimmable LED desk lamp with five colour temperatures and a USB port.", {"Power": "9 W", "Modes": "5", "Ports": "USB-A"}, False, False),
    ("home", "homenest", "ErgoFlex Mesh Office Chair", "ErgoFlex", 11499, 28, "chair", "Adjustable lumbar support, breathable mesh back and 4D armrests.", {"Material": "Mesh", "Load": "120 kg", "Warranty": "3 years"}, True, False),
    ("home", "homenest", "Brew Master Pour-Over Set", "Brew Master", 2199, 12, "mug", "Glass server, reusable stainless filter and gooseneck kettle spout.", {"Capacity": "600 ml", "Filter": "Stainless steel"}, False, True),
    ("home", "homenest", "Blendr Pro 1000W Mixer", "Blendr", 4299, 22, "blender", "Powerful blender with six blades, pulse mode and a 1.5 L jar.", {"Power": "1000 W", "Jar": "1.5 L"}, False, False),
    ("home", "homenest", "Linen Throw Blanket", "HomeNest", 1499, 10, "blanket", "Breathable washed linen blend blanket for sofa or bed.", {"Size": "130 x 170 cm", "Fabric": "Linen blend"}, False, False),
    ("books", "pagebarn", "The Pragmatic Web Defender", "PageBarn Press", 899, 15, "book", "Practical guide to securing modern web applications with worked examples.", {"Pages": "412", "Edition": "2nd", "Format": "Paperback"}, True, True),
    ("books", "pagebarn", "Systems Thinking for Engineers", "PageBarn Press", 749, 20, "book", "A clear introduction to feedback, delay and resilience in complex systems.", {"Pages": "288", "Format": "Paperback"}, False, False),
    ("books", "pagebarn", "Atomic Notes Journal", "PageBarn", 499, 8, "notebook", "Dotted journal with thick paper, numbered pages and an index.", {"Pages": "192", "Paper": "120 GSM"}, False, True),
    ("books", "pagebarn", "Cloud Native Handbook", "PageBarn Press", 1099, 18, "book", "Containers, orchestration and delivery pipelines explained for teams.", {"Pages": "356", "Format": "Paperback"}, False, False),
    ("sports", "stylehouse", "Flow Non-Slip Yoga Mat", "Flow", 1299, 30, "mat", "6 mm cushioned mat with alignment marks and carry strap.", {"Thickness": "6 mm", "Material": "TPE"}, False, True),
    ("sports", "stylehouse", "Titan Adjustable Dumbbell Pair", "Titan", 6499, 15, "dumbbell", "Quick change dumbbells from 2 to 20 kg for home workouts.", {"Range": "2 to 20 kg", "Material": "Steel"}, False, False),
    ("sports", "stylehouse", "HydraSteel Insulated Bottle 1L", "HydraSteel", 899, 25, "bottle", "Double wall vacuum bottle keeps drinks cold 24 hours or hot 12.", {"Capacity": "1 L", "Material": "Stainless steel"}, False, True),
    ("sports", "stylehouse", "Sprint Skipping Rope", "Sprint", 349, 20, "rope", "Ball bearing speed rope with adjustable length.", {"Length": "Adjustable"}, False, False),
    ("beauty", "homenest", "Glow Vitamin C Serum 30ml", "Glow", 699, 20, "serum", "Brightening serum with 15 percent vitamin C and hyaluronic acid.", {"Volume": "30 ml", "Skin": "All types"}, False, True),
    ("beauty", "homenest", "Cedar Beard Grooming Kit", "Cedar", 1199, 18, "kit", "Beard oil, balm and wooden comb in a gift-ready box.", {"Contents": "4 items"}, False, False),
    ("beauty", "homenest", "Aqua Daily Sunscreen SPF 50", "Aqua", 549, 10, "tube", "Lightweight non-greasy broad spectrum sunscreen.", {"SPF": "50 PA++++", "Volume": "50 g"}, False, True),
    ("toys", "pagebarn", "Blockworks 500 Piece Set", "Blockworks", 1799, 30, "blocks", "Creative building blocks compatible with major brands.", {"Pieces": "500", "Age": "6+"}, False, True),
    ("toys", "pagebarn", "Strategy Quest Board Game", "Quest", 2299, 15, "board", "Cooperative adventure board game for two to five players.", {"Players": "2 to 5", "Duration": "60 minutes"}, False, False),
    ("toys", "pagebarn", "Orbit RC Stunt Car", "Orbit", 2799, 25, "car", "Rechargeable remote control car with 360 degree flips.", {"Range": "50 m", "Battery": "Rechargeable"}, False, True),
]

REVIEW_SNIPPETS = [
    ("Excellent value", "Arrived early and works exactly as described. Would buy again.", 5),
    ("Solid purchase", "Build quality is better than I expected for the price.", 4),
    ("Good but not perfect", "Does the job. Packaging could be better though.", 3),
    ("Very happy", "Using it every day. No complaints after two weeks.", 5),
    ("Decent", "Nice design and good finish. Delivery took a little longer than promised.", 4),
    ("Love it", "My family loved it. The quality feels premium.", 5),
    ("Okay for the price", "It works fine, but I expected a slightly better finish.", 3),
]


def reset_schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def seed(db: Session):
    rng = random.Random(1337)
    ts = datetime(2026, 9, 1, tzinfo=timezone.utc)

    for rname, desc, perms in [
        ("customer", "Shopper", ["cart.use", "order.read.own", "review.write"]),
        ("seller", "Marketplace seller", ["product.manage.own", "inventory.manage.own", "sales.read.own"]),
        ("admin", "Platform administrator", ["user.manage", "product.manage", "order.manage", "config.manage"]),
    ]:
        role = Role(name=rname, description=desc)
        db.add(role)
        db.flush()
        for code in perms:
            db.add(Permission(code=code, role_id=role.id))

    for slug, name, icon, accent in CATEGORIES:
        db.add(Category(slug=slug, name=name, icon=icon, accent=accent))
    db.flush()
    cats = {c.slug: c for c in db.query(Category).all()}

    users = {}
    for username, fullname, email in ADMINS:
        u = User(username=username, email=email, full_name=fullname, role="admin", password_hash=hash_password(DEFAULT_PASSWORDS[username]), created_at=ts)
        db.add(u)
        users[username] = u
    for username, store, email, fullname in SELLERS:
        u = User(username=username, email=email, full_name=fullname, role="seller", store_name=store, password_hash=hash_password(DEFAULT_PASSWORDS[username]), created_at=ts)
        db.add(u)
        users[username] = u
    for i, (username, fullname, email, mfa) in enumerate(CUSTOMERS):
        u = User(username=username, email=email, full_name=fullname, role="customer", mfa_enabled=mfa, phone=f"+91 98450 {10000 + i * 137}", password_hash=hash_password(DEFAULT_PASSWORDS["default_customer"]), created_at=ts + timedelta(days=i))
        db.add(u)
        users[username] = u
    db.flush()

    cities = [("Bengaluru", "Karnataka", "560037"), ("Mumbai", "Maharashtra", "400051"), ("Chennai", "Tamil Nadu", "600042"), ("Pune", "Maharashtra", "411045"), ("Hyderabad", "Telangana", "500081"), ("Kochi", "Kerala", "682016")]
    for i, (username, fullname, _e, _m) in enumerate(CUSTOMERS):
        user = users[username]
        city, state, pin = cities[i % len(cities)]
        db.add(Address(user_id=user.id, label="Home", recipient=fullname, line1=f"{12 + i}, Lakeview Residency, 4th Cross", city=city, state=state, postal_code=pin, delivery_notes="Leave with security if not home", is_default=True))
        extra_note = flag_for("LAB-06") if username == "erin.kowalski" else "Call before delivery"
        db.add(Address(user_id=user.id, label="Office", recipient=fullname, line1=f"Tower {2 + i}, Tech Park Road", city=city, state=state, postal_code=pin, delivery_notes=extra_note))
        db.add(Cart(user_id=user.id))

    products = []
    for n, (cslug, seller, title, brand, price, disc, kind, desc, specs, featured, trending) in enumerate(PRODUCTS, start=1):
        p = Product(sku=f"VM-{1000 + n}", title=title, brand=brand, description=desc, specs=specs, price=price, discount_percent=disc, category_id=cats[cslug].id, seller_id=users[seller].id, is_featured=featured, is_trending=trending, created_at=ts + timedelta(hours=n))
        db.add(p)
        db.flush()
        variant = n % 5
        db.add(ProductImage(product_id=p.id, url=f"/img/p/{kind}-{variant}.svg", alt=title, position=0))
        db.add(ProductImage(product_id=p.id, url=f"/img/p/{kind}-{(variant + 1) % 5}.svg", alt=f"{title} alternate view", position=1))
        db.add(Inventory(product_id=p.id, quantity=rng.randint(4, 140), reorder_level=12))
        products.append(p)
    db.flush()

    reviewers = [users[c[0]] for c in CUSTOMERS[:6]]
    for p in products:
        count = rng.randint(2, 5)
        total = 0
        for r in rng.sample(reviewers, count):
            title, body, rating = rng.choice(REVIEW_SNIPPETS)
            total += rating
            db.add(Review(product_id=p.id, user_id=r.id, rating=rating, title=title, body=body, status="approved", created_at=ts + timedelta(days=rng.randint(1, 60))))
        p.rating_avg = round(total / count, 2)
        p.rating_count = count
    db.flush()

    order_no = 5001
    customer_users = [users[c[0]] for c in CUSTOMERS[:7]]
    for idx, cu in enumerate(customer_users):
        for k in range(2):
            picks = rng.sample(products, rng.randint(1, 3))
            subtotal = 0.0
            disc = 0.0
            items = []
            for p in picks:
                qty = rng.randint(1, 2)
                unit = round(float(p.price) * (100 - p.discount_percent) / 100, 2)
                subtotal += float(p.price) * qty
                disc += (float(p.price) - unit) * qty
                items.append((p, qty, unit))
            shipping = 0.0 if subtotal > 1500 else 79.0
            total = round(subtotal - disc + shipping, 2)
            gift = ""
            if cu.username == "carol.nguyen" and k == 0:
                gift = flag_for("LAB-03")
            addr = db.query(Address).filter(Address.user_id == cu.id, Address.is_default.is_(True)).first()
            order = Order(order_number=f"VM{order_no}", user_id=cu.id, status=rng.choice(["placed", "shipped", "delivered", "delivered"]), subtotal=round(subtotal, 2), discount=round(disc, 2), shipping=shipping, total=total, payment_method=rng.choice(["upi", "card", "cod"]), shipping_address={"recipient": addr.recipient, "line1": addr.line1, "city": addr.city, "state": addr.state, "postal_code": addr.postal_code}, gift_message=gift, created_at=ts + timedelta(days=10 + idx * 3 + k))
            db.add(order)
            db.flush()
            for p, qty, unit in items:
                db.add(OrderItem(order_id=order.id, product_id=p.id, seller_id=p.seller_id, title=p.title, unit_price=unit, quantity=qty))
            db.add(Invoice(invoice_number=f"INV-{order_no}", order_id=order.id, billing_name=cu.full_name, billing_email=cu.email, tax_amount=round(total * 0.18 / 1.18, 2), issued_at=order.created_at))
            order_no += 1

    for lab in LABS:
        db.add(SecurityLab(**lab))

    db.add(TrainingSecret(name="lab10_internal_token", value=flag_for("LAB-10")))
    db.add(TrainingSecret(name="catalog_build", value="vm-catalog-2026.11"))
    db.add(AppSetting(key="mode", value="training"))
    db.commit()


def run(reset: bool = False):
    if reset:
        reset_schema()
    else:
        Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(User).count() == 0:
            seed(db)


if __name__ == "__main__":
    import sys
    run(reset="--reset" in sys.argv)
    print("seed complete")
